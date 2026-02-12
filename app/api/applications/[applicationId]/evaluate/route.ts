import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { decrypt } from "@/lib/encryption"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Difficulty-based marks mapping (same as frontend)
const DIFFICULTY_MARKS: Record<string, number> = {
  High: 15,
  Medium: 10,
  Low: 5,
}

// Technical cutoff threshold (if Technical Skills avg < this, recommend No Hire)
const TECHNICAL_CUTOFF = 50

export async function POST(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = "then" in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: "Missing applicationId" }, { status: 400 })
    }

    const body = await req.json()
    const { transcript, companyId: bodyCompanyId } = body

    console.log("\n" + "=".repeat(80))
    console.log("🔍 EVALUATION API CALLED")
    console.log("📝 Application ID:", applicationId)
    console.log("📝 Transcript length:", transcript?.length || 0)

    if (!transcript) {
      console.log("⚠️  No transcript provided, skipping evaluation")
      return NextResponse.json({ ok: true, message: "No transcript to evaluate" })
    }

    // Get application and job details
    const applicationQuery = `
      SELECT a.id, a.job_id, j.title as job_title, c.name as company_name,
             c.id as company_id, cand.first_name, cand.last_name
      FROM applications a
      JOIN job_postings j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN candidates cand ON a.candidate_id = cand.id
      WHERE a.id = $1::uuid
    `
    const applicationRows = (await DatabaseService.query(applicationQuery, [applicationId])) as any[]

    if (applicationRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 })
    }

    const application = applicationRows[0]
    const jobId = application.job_id
    const companyId = application.company_id

    // Get interview questions and criteria
    const questionsQuery = `
      SELECT jiq.selected_criteria, jiq.questions
      FROM job_interview_questions jiq
      WHERE jiq.job_id = $1::uuid
      LIMIT 1
    `
    const questionsRows = (await DatabaseService.query(questionsQuery, [jobId])) as any[]

    let criteria: string[] = []
    let dbQuestions: { 
      text: string
      criterion: string
      questionNumber: number
      difficulty: string
      marks: number 
    }[] = []

    if (questionsRows.length > 0) {
      const row = questionsRows[0]
      try {
        const rawCriteria = typeof row.selected_criteria === "string"
          ? JSON.parse(row.selected_criteria)
          : row.selected_criteria
        criteria = Array.isArray(rawCriteria) ? rawCriteria : []
      } catch {
        criteria = []
      }

      try {
        const rawQuestions = typeof row.questions === "string"
          ? JSON.parse(row.questions)
          : row.questions
        const qArr = Array.isArray(rawQuestions) ? rawQuestions : []
        dbQuestions = qArr.map((q: any, idx: number) => {
          // Get difficulty & marks (with backward compatibility for old data)
          const difficulty = (typeof q === "object" ? q.difficulty : null) || "Medium"
          const marks = (typeof q === "object" && q.marks !== undefined) 
            ? q.marks 
            : DIFFICULTY_MARKS[difficulty] || 10
          
          return {
            text: typeof q === "string" ? q : q.question || q.text || "",
            criterion: (typeof q === "object" ? q.criterion : null) || criteria[0] || "General",
            questionNumber: idx + 1,
            difficulty,
            marks,
          }
        })
      } catch {
        dbQuestions = []
      }
    }

    // Calculate total marks for weighted scoring
    const totalMarks = dbQuestions.reduce((sum, q) => sum + q.marks, 0) || 100

    const totalQuestions = dbQuestions.length || 10
    console.log("📊 Evaluation criteria:", criteria)
    console.log("📊 Total questions:", totalQuestions)
    console.log("📊 Total marks:", totalMarks)
    console.log("📊 Questions with marks:", dbQuestions.map(q => `Q${q.questionNumber}: ${q.difficulty}(${q.marks})`))

    // Fetch company's OpenAI service account key
    let openaiApiKey: string | undefined
    let openaiProjectId: string | undefined

    if (companyId) {
      try {
        const companyData = (await DatabaseService.query(
          `SELECT openai_service_account_key, openai_project_id FROM companies WHERE id = $1::uuid LIMIT 1`,
          [companyId]
        )) as any[]

        if (companyData?.[0]?.openai_service_account_key) {
          try {
            const decryptedKey = decrypt(companyData[0].openai_service_account_key).trim()
            if (decryptedKey.startsWith("{")) {
              const keyObj = JSON.parse(decryptedKey)
              openaiApiKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || undefined
            } else {
              openaiApiKey = decryptedKey
            }

            if (companyData[0].openai_project_id) {
              try {
                openaiProjectId = decrypt(companyData[0].openai_project_id)
              } catch {
                openaiProjectId = companyData[0].openai_project_id
              }
            }
            console.log("✅ [EVAL] Using company service account key")
          } catch (e) {
            console.warn("⚠️ [EVAL] Failed to decrypt company key:", e)
          }
        }
      } catch (e) {
        console.warn("⚠️ [EVAL] Failed to fetch company key:", e)
      }
    }

    if (!openaiApiKey) {
      openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
      if (openaiApiKey) {
        console.log("🔑 [EVAL] Using environment OPENAI_API_KEY")
      }
    }

    if (!openaiApiKey) {
      console.warn("⚠️ [EVAL] No OpenAI API key available, storing transcript only")
      return NextResponse.json({
        ok: true,
        message: "Transcript saved. Evaluation skipped (no API key).",
      })
    }

    // Build evaluation prompt - GPT only scores each question, backend calculates weighted total
    const dbQuestionsForPrompt = dbQuestions.length > 0
      ? dbQuestions.map((q) => `Q${q.questionNumber}. [${q.criterion}] ${q.text}`).join("\n")
      : "Q1. Tell me about yourself and your relevant experience.\nQ2. Why are you interested in this position?"

    const evaluationPrompt = `You are an expert interview evaluator.

**Job Details:**
- Position: ${application.job_title}
- Company: ${application.company_name}
- Candidate: ${application.first_name || ""} ${application.last_name || ""}

**THE ${totalQuestions} INTERVIEW QUESTIONS TO EVALUATE:**
${dbQuestionsForPrompt}

**Interview Transcript:**
${transcript}

**SCORING GUIDELINES (0-100 scale per question):**
- 80-100: Excellent - Detailed with concrete examples
- 60-79: Good - Solid but lacks depth  
- 40-59: Below Average - Vague or incomplete
- Below 40: Poor - Did not answer or irrelevant

**IMPORTANT:** You must evaluate EACH question individually with a score from 0-100.
DO NOT calculate any overall score - the backend will calculate the weighted final score.

**Response Format (JSON):**
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "...",
      "criterion": "...",
      "score": 65,
      "candidate_response": "Full answer from transcript",
      "strengths": ["..."],
      "gaps": ["..."],
      "evaluation_reasoning": "..."
    }
  ],
  "summary": "Brief overall assessment of candidate performance",
  "key_strengths": ["..."],
  "areas_for_improvement": ["..."]
}`

    // Call OpenAI API
    const headers: Record<string, string> = {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    }
    if (openaiProjectId) headers["OpenAI-Project"] = openaiProjectId

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert interview evaluator. Return ONLY valid JSON." },
          { role: "user", content: evaluationPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    })

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      console.error("❌ [EVAL] OpenAI API error:", errText)
      return NextResponse.json({
        ok: false,
        error: "Evaluation API call failed",
        details: errText,
      }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()
    const evaluationText = openaiData.choices?.[0]?.message?.content || "{}"

    let evaluation: any
    try {
      evaluation = JSON.parse(evaluationText)
    } catch {
      console.error("❌ [EVAL] Failed to parse evaluation JSON")
      evaluation = { questions: [], summary: "Evaluation parsing failed" }
    }

    // ========== MARKS-BASED WEIGHTED SCORING (Backend Calculation) ==========
    const gptQuestions = evaluation.questions || []
    
    // Map GPT scores to our questions with marks
    let weightedScore = 0
    const questionResults: any[] = []
    
    dbQuestions.forEach((dbQ) => {
      // Find matching GPT evaluation for this question
      const gptQ = gptQuestions.find((g: any) => g.question_number === dbQ.questionNumber) || {}
      const score = gptQ.score ?? 0
      
      // Calculate weighted contribution: (score/100) * marks
      const weightedContribution = (score / 100) * dbQ.marks
      weightedScore += weightedContribution
      
      questionResults.push({
        question_number: dbQ.questionNumber,
        question_text: dbQ.text,
        criterion: dbQ.criterion,
        difficulty: dbQ.difficulty,
        marks: dbQ.marks,
        score,
        weighted_contribution: Math.round(weightedContribution * 100) / 100,
        candidate_response: gptQ.candidate_response || "",
        strengths: gptQ.strengths || [],
        gaps: gptQ.gaps || [],
        evaluation_reasoning: gptQ.evaluation_reasoning || "",
      })
    })
    
    // Final score = (weightedScore / totalMarks) * 100
    const overallScore = totalMarks > 0 ? Math.round((weightedScore / totalMarks) * 100) : 0
    
    // ========== PER-CRITERION AVERAGES (For Dashboard Analytics) ==========
    const criterionMap: Record<string, { total: number; count: number; scores: number[] }> = {}
    
    questionResults.forEach((q) => {
      if (!criterionMap[q.criterion]) {
        criterionMap[q.criterion] = { total: 0, count: 0, scores: [] }
      }
      criterionMap[q.criterion].total += q.score
      criterionMap[q.criterion].count += 1
      criterionMap[q.criterion].scores.push(q.score)
    })
    
    const criterionAverages: Record<string, number> = {}
    Object.keys(criterionMap).forEach((c) => {
      criterionAverages[c] = Math.round(criterionMap[c].total / criterionMap[c].count)
    })
    
    // ========== TECHNICAL CUTOFF RULE ==========
    const technicalAvg = criterionAverages["Technical Skills"] ?? null
    const failedTechnicalCutoff = technicalAvg !== null && technicalAvg < TECHNICAL_CUTOFF
    
    // ========== RECOMMENDATION LOGIC ==========
    let recommendation: string
    if (failedTechnicalCutoff) {
      recommendation = "No Hire"
    } else if (overallScore >= 70) {
      recommendation = "Hire"
    } else if (overallScore >= 50) {
      recommendation = "Maybe"
    } else {
      recommendation = "No Hire"
    }
    
    console.log("✅ [EVAL] Weighted Score:", weightedScore.toFixed(2), "/", totalMarks)
    console.log("✅ [EVAL] Final Score:", overallScore, "%")
    console.log("✅ [EVAL] Criterion Averages:", criterionAverages)
    console.log("✅ [EVAL] Technical Cutoff Failed:", failedTechnicalCutoff)
    console.log("✅ [EVAL] Recommendation:", recommendation)

    // Build complete evaluation result with all calculated data
    const completeEvaluation = {
      questions: questionResults,
      scoring: {
        total_marks: totalMarks,
        weighted_score: Math.round(weightedScore * 100) / 100,
        final_score: overallScore,
        method: "marks_weighted",
      },
      criterion_averages: criterionAverages,
      technical_cutoff: {
        threshold: TECHNICAL_CUTOFF,
        technical_avg: technicalAvg,
        failed: failedTechnicalCutoff,
      },
      recommendation,
      summary: evaluation.summary || "",
      key_strengths: evaluation.key_strengths || evaluation.strengths || [],
      areas_for_improvement: evaluation.areas_for_improvement || [],
    }

    // Store evaluation results in the applications table
    const storeQuery = `
      UPDATE applications
      SET 
        interview_score = $2,
        interview_recommendation = $3,
        interview_feedback = COALESCE(interview_feedback, '') || E'\n\n--- AI EVALUATION (Marks-Weighted) ---\n' || $4
      WHERE id = $1::uuid
    `
    await DatabaseService.query(storeQuery, [
      applicationId,
      overallScore,
      recommendation,
      JSON.stringify(completeEvaluation, null, 2),
    ])

    console.log("✅ [EVAL] Evaluation stored in database")
    console.log("=".repeat(80) + "\n")

    return NextResponse.json({
      ok: true,
      evaluation: completeEvaluation,
      overallScore,
      recommendation,
      criterionAverages,
      scoring: completeEvaluation.scoring,
    })
  } catch (err: any) {
    console.error("Error in evaluation:", err)
    return NextResponse.json({ ok: false, error: err?.message || "Evaluation failed" }, { status: 500 })
  }
}

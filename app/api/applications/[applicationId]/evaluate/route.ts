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

// ========== TRANSCRIPT PARSING HELPERS ==========

interface TranscriptTurn {
  role: "interviewer" | "candidate"
  text: string
}

function parseTranscriptTurns(transcript: string): TranscriptTurn[] {
  const lines = transcript.split("\n\n").filter((l) => l.trim().length > 0)
  const turns: TranscriptTurn[] = []
  for (const line of lines) {
    if (line.startsWith("Interviewer:")) {
      turns.push({ role: "interviewer", text: line.replace("Interviewer:", "").trim() })
    } else if (line.startsWith("Candidate:")) {
      turns.push({ role: "candidate", text: line.replace("Candidate:", "").trim() })
    }
  }
  return turns
}

function matchQuestionToTranscript(
  dbQuestionText: string,
  turns: TranscriptTurn[]
): string | null {
  const dbWords = dbQuestionText.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  if (dbWords.length === 0) return null

  // Find the interviewer turn that best matches this DB question
  let bestMatchIdx = -1
  let bestMatchRatio = 0

  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role !== "interviewer") continue
    const turnLower = turns[i].text.toLowerCase()
    const matchCount = dbWords.filter((w) => turnLower.includes(w)).length
    const ratio = matchCount / dbWords.length
    if (ratio > bestMatchRatio) {
      bestMatchRatio = ratio
      bestMatchIdx = i
    }
  }

  // Require at least 40% word match
  if (bestMatchRatio < 0.4 || bestMatchIdx === -1) return null

  // Collect all consecutive candidate responses after the matched interviewer turn
  const responseParts: string[] = []
  for (let j = bestMatchIdx + 1; j < turns.length; j++) {
    if (turns[j].role === "candidate") {
      const text = turns[j].text
      if (text && text !== "[inaudible]") {
        responseParts.push(text)
      }
    } else {
      // Next interviewer turn means end of this answer
      break
    }
  }

  return responseParts.length > 0 ? responseParts.join(" ") : null
}

async function evaluateSingleQuestion(
  question: { text: string; criterion: string; difficulty: string; marks: number; questionNumber: number },
  candidateResponse: string,
  jobTitle: string,
  companyName: string,
  apiKey: string,
  projectId?: string
): Promise<{ score: number; strengths: string[]; gaps: string[]; evaluation_reasoning: string }> {
  const prompt = `You are an expert interview evaluator. Evaluate this single interview question and the candidate's ACTUAL response.

**Position:** ${jobTitle}
**Company:** ${companyName}

**Question:** ${question.text}
**Criterion:** ${question.criterion}
**Difficulty:** ${question.difficulty}
**Max Marks:** ${question.marks}

**Candidate's Actual Response:**
${candidateResponse}

**SCORING GUIDELINES (0-100 scale):**
- 80-100: Excellent - Detailed with concrete examples
- 60-79: Good - Solid but lacks depth
- 40-59: Below Average - Vague or incomplete
- Below 40: Poor - Did not answer or irrelevant
- 0: No meaningful answer provided

**CRITICAL RULES:**
1. Score ONLY based on the candidate response provided above.
2. Do NOT invent or assume any information not present in the response.
3. If the response is empty, "No answer provided", or meaningless, score must be 0.

**Return JSON:**
{
  "score": <number 0-100>,
  "strengths": ["..."],
  "gaps": ["..."],
  "evaluation_reasoning": "..."
}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }
  if (projectId) headers["OpenAI-Project"] = projectId

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert interview evaluator. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      console.error(`❌ [EVAL] OpenAI error for Q${question.questionNumber}:`, await response.text())
      return { score: 0, strengths: [], gaps: ["Evaluation failed"], evaluation_reasoning: "API call failed" }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "{}"
    const parsed = JSON.parse(content)
    return {
      score: parsed.score ?? 0,
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
      evaluation_reasoning: parsed.evaluation_reasoning || "",
    }
  } catch (err) {
    console.error(`❌ [EVAL] Failed to evaluate Q${question.questionNumber}:`, err)
    return { score: 0, strengths: [], gaps: ["Evaluation failed"], evaluation_reasoning: "Error during evaluation" }
  }
}

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
    const { transcript: bodyTranscript, companyId: bodyCompanyId } = body

    console.log("\n" + "=".repeat(80))
    console.log("🔍 EVALUATION API CALLED")
    console.log("📝 Application ID:", applicationId)

    // ========== CHECK INTERVIEW STATUS & FETCH TRANSCRIPT FROM DB ==========
    const appCheck = (await DatabaseService.query(
      `SELECT i.interview_status, i.interview_feedback FROM applications a LEFT JOIN interviews i ON i.application_id = a.id WHERE a.id = $1::uuid LIMIT 1`,
      [applicationId]
    )) as any[]

    if (appCheck?.[0]?.interview_status === "Incomplete") {
      console.log("⚠️ [EVAL] Interview is marked as Incomplete - proceeding with evaluation using available answers")
    }

    // Use transcript from DB (interview_feedback column) first, fallback to request body
    const transcript = appCheck?.[0]?.interview_feedback || bodyTranscript

    console.log("📝 Transcript source:", appCheck?.[0]?.interview_feedback ? "database (interviews.interview_feedback)" : "request body")
    console.log("📝 Transcript length:", transcript?.length || 0)

    if (!transcript) {
      console.log("⚠️  No transcript available, skipping evaluation")
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

    // ========== PARSE TRANSCRIPT & EXTRACT REAL CANDIDATE ANSWERS ==========
    const turns = parseTranscriptTurns(transcript)
    const allCandidateResponses = turns.filter((t) => t.role === "candidate" && t.text.length > 0 && t.text !== "[inaudible]")
    const allInterviewerQuestions = turns.filter((t) => t.role === "interviewer" && t.text.includes("?"))

    console.log("📊 [EVAL] Transcript turns:", turns.length)
    console.log("📊 [EVAL] Interviewer questions:", allInterviewerQuestions.length)
    console.log("📊 [EVAL] Candidate responses:", allCandidateResponses.length)

    // If very few responses, log warning but still evaluate what we have
    if (allCandidateResponses.length < 2) {
      console.log("⚠️ [EVAL] Very few candidate responses (", allCandidateResponses.length, ") - evaluation may be limited")
      
      if (allCandidateResponses.length === 0) {
        console.log("🚫 [EVAL] No candidate responses at all - cannot evaluate")
        return NextResponse.json({
          ok: false,
          error: "No candidate responses found in transcript",
          reason: "Cannot generate evaluation without any candidate answers",
          stats: {
            questionsAsked: allInterviewerQuestions.length,
            candidateResponses: 0,
            totalConfiguredQuestions: totalQuestions,
          },
        })
      }
    }

    // ========== MATCH EACH DB QUESTION TO REAL CANDIDATE ANSWER ==========
    const questionsWithAnswers = dbQuestions.map((dbQ) => {
      const realAnswer = matchQuestionToTranscript(dbQ.text, turns)
      return {
        ...dbQ,
        candidateResponse: realAnswer || "No answer provided",
        wasAnswered: realAnswer !== null,
      }
    })

    const answeredCount = questionsWithAnswers.filter((q) => q.wasAnswered).length
    console.log("📊 [EVAL] Questions matched with real answers:", answeredCount, "/", dbQuestions.length)
    questionsWithAnswers.forEach((q) => {
      console.log(`  Q${q.questionNumber}: ${q.wasAnswered ? "ANSWERED" : "NOT ANSWERED"} - Response preview: ${q.candidateResponse.substring(0, 80)}...`)
    })

    // ========== EVALUATE EACH QUESTION INDIVIDUALLY WITH GPT ==========
    console.log("🤖 [EVAL] Starting individual question evaluations...")

    const evaluationPromises = questionsWithAnswers.map((q) =>
      evaluateSingleQuestion(
        q,
        q.candidateResponse,
        application.job_title,
        application.company_name,
        openaiApiKey!,
        openaiProjectId
      )
    )

    const evaluationResults = await Promise.all(evaluationPromises)

    // ========== MARKS-BASED WEIGHTED SCORING (Backend Calculation) ==========
    let weightedScore = 0
    const questionResults: any[] = []

    questionsWithAnswers.forEach((dbQ, idx) => {
      const evalResult = evaluationResults[idx]
      let score = evalResult.score ?? 0

      // If question was not answered, force score to 0
      if (!dbQ.wasAnswered) {
        score = 0
      }

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
        candidate_response: dbQ.candidateResponse,
        strengths: evalResult.strengths || [],
        gaps: evalResult.gaps || [],
        evaluation_reasoning: evalResult.evaluation_reasoning || "",
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
        questions_evaluated: answeredCount,
        questions_total: totalQuestions,
      },
      criterion_averages: criterionAverages,
      technical_cutoff: {
        threshold: TECHNICAL_CUTOFF,
        technical_avg: technicalAvg,
        failed: failedTechnicalCutoff,
      },
      recommendation,
      summary: "",
      key_strengths: [] as string[],
      areas_for_improvement: [] as string[],
    }

    // Generate summary from individual evaluations
    const allStrengths = questionResults.flatMap((q) => q.strengths).filter(Boolean)
    const allGaps = questionResults.flatMap((q) => q.gaps).filter(Boolean)
    completeEvaluation.key_strengths = Array.from(new Set(allStrengths)).slice(0, 5)
    completeEvaluation.areas_for_improvement = Array.from(new Set(allGaps)).slice(0, 5)
    completeEvaluation.summary = `Candidate scored ${overallScore}% overall. ${answeredCount}/${totalQuestions} questions answered. Recommendation: ${recommendation}.`

    // Store evaluation results in interviews table
    await DatabaseService.ensureInterviewRecord(applicationId)
    const storeQuery = `
      UPDATE interviews
      SET 
        interview_score = $2,
        interview_recommendation = $3,
        interview_evaluations = $4::jsonb,
        interview_summary = $5
      WHERE application_id = $1::uuid
    `
    await DatabaseService.query(storeQuery, [
      applicationId,
      overallScore,
      recommendation,
      JSON.stringify(completeEvaluation),
      completeEvaluation.summary,
    ])

    console.log("✅ [EVAL] Evaluation stored in interviews table")
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

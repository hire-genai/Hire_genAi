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

// Position-based answer extraction
// Logic: First interviewer turn is setup (skip), then Q1 answer = candidate responses until next interviewer turn
// Q2 answer = candidate responses between Q2 and Q3, and so on
function extractAnswersByPosition(
  turns: TranscriptTurn[],
  totalDbQuestions: number
): Map<number, string> {
  const answers = new Map<number, string>()
  
  // Find all interviewer question positions (turns with ?)
  const interviewerQuestionIndices: number[] = []
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role === "interviewer" && turns[i].text.includes("?")) {
      interviewerQuestionIndices.push(i)
    }
  }
  
  console.log(`📊 [POSITION] Found ${interviewerQuestionIndices.length} interviewer questions in transcript`)
  
  // Skip first question (it's the setup/greeting question)
  // Map remaining questions to DB questions by position
  for (let qNum = 1; qNum <= totalDbQuestions; qNum++) {
    // qNum=1 maps to interviewerQuestionIndices[1] (skip index 0 which is setup)
    const questionIdx = interviewerQuestionIndices[qNum]
    
    if (questionIdx === undefined) {
      console.log(`⚠️ [POSITION] Q${qNum}: No interviewer question found at position ${qNum}`)
      continue
    }
    
    // Find the end boundary (next interviewer question or end of transcript)
    const nextQuestionIdx = interviewerQuestionIndices[qNum + 1]
    const endIdx = nextQuestionIdx !== undefined ? nextQuestionIdx : turns.length
    
    // Collect all candidate responses between this question and the next
    const responseParts: string[] = []
    for (let j = questionIdx + 1; j < endIdx; j++) {
      if (turns[j].role === "candidate") {
        const text = turns[j].text
        if (text && text !== "[inaudible]" && text.trim().length > 0) {
          responseParts.push(text)
        }
      }
    }
    
    if (responseParts.length > 0) {
      answers.set(qNum, responseParts.join(" "))
      console.log(`✅ [POSITION] Q${qNum}: Found answer (${responseParts.join(" ").length} chars)`)
    } else {
      console.log(`⚠️ [POSITION] Q${qNum}: No candidate response found`)
    }
  }
  
  return answers
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
    const { transcript: bodyTranscript, companyId: bodyCompanyId, singleAnswer } = body

    // ========== SINGLE ANSWER REAL-TIME EVALUATION ==========
    if (singleAnswer === true) {
      const { questionIndex, questionText, criterion, difficulty, marks, answerText, jobTitle, companyName } = body
      
      console.log("\n" + "=".repeat(80))
      console.log("🎯 SINGLE ANSWER EVALUATION")
      console.log("📝 Application ID:", applicationId)
      console.log("📝 Question:", questionText?.substring(0, 50))
      console.log("📝 Answer:", answerText?.substring(0, 50))

      if (!questionText || !answerText) {
        return NextResponse.json({ ok: false, error: "Missing questionText or answerText" }, { status: 400 })
      }

      // Get company ID from application if not provided
      let companyId = bodyCompanyId
      if (!companyId) {
        const appRows = (await DatabaseService.query(
          `SELECT c.id as company_id FROM applications a JOIN job_postings j ON a.job_id = j.id JOIN companies c ON j.company_id = c.id WHERE a.id = $1::uuid LIMIT 1`,
          [applicationId]
        )) as any[]
        companyId = appRows?.[0]?.company_id
      }

      // Fetch company's OpenAI service account key (same pattern as full evaluation)
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
              console.log("✅ [SINGLE] Using company service account key")
            } catch (e) {
              console.warn("⚠️ [SINGLE] Failed to decrypt company key:", e)
            }
          }
        } catch (e) {
          console.warn("⚠️ [SINGLE] Failed to fetch company key:", e)
        }
      }

      if (!openaiApiKey) {
        openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
        if (openaiApiKey) {
          console.log("🔑 [SINGLE] Using environment OPENAI_API_KEY")
        }
      }

      if (!openaiApiKey) {
        console.warn("⚠️ [SINGLE] No OpenAI API key available")
        return NextResponse.json({ ok: false, error: "No API key available" }, { status: 500 })
      }

      // Evaluate single question using existing function
      const questionObj = {
        text: questionText,
        criterion: criterion || "General",
        difficulty: difficulty || "Medium",
        marks: marks || 10,
        questionNumber: (questionIndex || 0) + 1,
      }

      const evalResult = await evaluateSingleQuestion(
        questionObj,
        answerText,
        jobTitle || "Position",
        companyName || "Company",
        openaiApiKey,
        openaiProjectId
      )

      const singleEvaluation = {
        question_number: questionObj.questionNumber,
        question_text: questionText,
        criterion: questionObj.criterion,
        difficulty: questionObj.difficulty,
        marks: questionObj.marks,
        score: evalResult.score,
        candidate_response: answerText,
        strengths: evalResult.strengths,
        gaps: evalResult.gaps,
        evaluation_reasoning: evalResult.evaluation_reasoning,
        evaluated_at: new Date().toISOString(),
      }

      // Append to interviews.interview_evaluations using CASE WHEN for null handling
      await DatabaseService.ensureInterviewRecord(applicationId)
      const appendQuery = `
        UPDATE interviews
        SET interview_evaluations = CASE 
          WHEN interview_evaluations IS NULL THEN jsonb_build_object('realtime_questions', jsonb_build_array($2::jsonb))
          WHEN interview_evaluations->'realtime_questions' IS NULL THEN interview_evaluations || jsonb_build_object('realtime_questions', jsonb_build_array($2::jsonb))
          ELSE jsonb_set(interview_evaluations, '{realtime_questions}', COALESCE(interview_evaluations->'realtime_questions', '[]'::jsonb) || $2::jsonb)
        END
        WHERE application_id = $1::uuid
      `
      await DatabaseService.query(appendQuery, [applicationId, JSON.stringify(singleEvaluation)])

      console.log("✅ [SINGLE] Evaluation stored:", evalResult.score, "/100")
      console.log("=".repeat(80) + "\n")

      return NextResponse.json({
        ok: true,
        evaluation: singleEvaluation,
      })
    }

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
      SELECT a.id, a.job_id, a.candidate_id, j.title as job_title, c.name as company_name,
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

    // ========== CHECK FOR REAL-TIME EVALUATIONS ==========
    const { realTimeEvaluations } = body
    if (Array.isArray(realTimeEvaluations) && realTimeEvaluations.length > 0) {
      console.log("🚀 [EVAL] Using real-time evaluations:", realTimeEvaluations.length, "evaluations found")

      // Build question results from real-time evaluations
      let weightedScore = 0
      const questionResults: any[] = []

      dbQuestions.forEach((dbQ) => {
        // Find matching real-time evaluation by question_number
        const rtEval = realTimeEvaluations.find((e: any) => e.question_number === dbQ.questionNumber)

        if (rtEval) {
          // Use real-time evaluation data
          const score = rtEval.score ?? 0
          const weightedContribution = (score / 100) * dbQ.marks
          weightedScore += weightedContribution

          questionResults.push({
            question_number: dbQ.questionNumber,
            question_text: rtEval.question_text || dbQ.text,
            criterion: rtEval.criterion || dbQ.criterion,
            difficulty: rtEval.difficulty || dbQ.difficulty,
            marks: dbQ.marks,
            score,
            weighted_contribution: Math.round(weightedContribution * 100) / 100,
            candidate_response: rtEval.candidate_response || "No answer provided",
            strengths: rtEval.strengths || [],
            gaps: rtEval.gaps || [],
            evaluation_reasoning: rtEval.evaluation_reasoning || "",
            wasAnswered: true,
          })
          console.log(`  Q${dbQ.questionNumber}: MATCHED (score: ${score})`)
        } else {
          // No match found - create entry with score 0
          questionResults.push({
            question_number: dbQ.questionNumber,
            question_text: dbQ.text,
            criterion: dbQ.criterion,
            difficulty: dbQ.difficulty,
            marks: dbQ.marks,
            score: 0,
            weighted_contribution: 0,
            candidate_response: "No answer provided",
            strengths: [],
            gaps: [],
            evaluation_reasoning: "Not answered",
            wasAnswered: false,
          })
          console.log(`  Q${dbQ.questionNumber}: NOT MATCHED (score: 0)`)
        }
      })

      const answeredCount = questionResults.filter((q) => q.wasAnswered).length

      // Final score = (weightedScore / totalMarks) * 100
      const overallScore = totalMarks > 0 ? Math.round((weightedScore / totalMarks) * 100) : 0

      // Per-criterion averages
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

      // Technical cutoff rule
      const technicalAvg = criterionAverages["Technical Skills"] ?? null
      const failedTechnicalCutoff = technicalAvg !== null && technicalAvg < TECHNICAL_CUTOFF

      // Recommendation logic
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

      console.log("✅ [EVAL-RT] Weighted Score:", weightedScore.toFixed(2), "/", totalMarks)
      console.log("✅ [EVAL-RT] Final Score:", overallScore, "%")
      console.log("✅ [EVAL-RT] Criterion Averages:", criterionAverages)
      console.log("✅ [EVAL-RT] Technical Cutoff Failed:", failedTechnicalCutoff)
      console.log("✅ [EVAL-RT] Recommendation:", recommendation)

      // Build complete evaluation
      const allStrengths = questionResults.flatMap((q) => q.strengths).filter(Boolean)
      const allGaps = questionResults.flatMap((q) => q.gaps).filter(Boolean)

      const completeEvaluation = {
        questions: questionResults,
        scoring: {
          total_marks: totalMarks,
          weighted_score: Math.round(weightedScore * 100) / 100,
          final_score: overallScore,
          method: "realtime_weighted",
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
        summary: `Candidate scored ${overallScore}% overall. ${answeredCount}/${totalQuestions} questions answered. Recommendation: ${recommendation}.`,
        key_strengths: Array.from(new Set(allStrengths)).slice(0, 5),
        areas_for_improvement: Array.from(new Set(allGaps)).slice(0, 5),
      }

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

      // Keep application in ai_interview stage - will move to hiring_manager only when user performs "Move to Application"
      await DatabaseService.query(
        "UPDATE applications SET current_stage = 'ai_interview' WHERE id = $1::uuid",
        [applicationId]
      )

      console.log("✅ [EVAL-RT] Evaluation stored using real-time data")
      console.log("✅ [EVAL-RT] Application kept in ai_interview stage")

      // Record video interview usage for billing
      try {
        const interviewInfo = (await DatabaseService.query(
          `SELECT interview_completed_at, interview_sent_at FROM interviews WHERE application_id = $1::uuid LIMIT 1`,
          [applicationId]
        )) as any[]
        let durationMinutes = 0
        if (interviewInfo?.[0]?.interview_sent_at && interviewInfo?.[0]?.interview_completed_at) {
          durationMinutes = Math.max(1, Math.round(
            (new Date(interviewInfo[0].interview_completed_at).getTime() - new Date(interviewInfo[0].interview_sent_at).getTime()) / 60000
          ))
        }
        if (durationMinutes > 0) {
          await DatabaseService.recordVideoInterviewUsage({
            companyId,
            jobId,
            interviewId: applicationId,
            candidateId: application.candidate_id || undefined,
            durationMinutes,
            completedQuestions: answeredCount,
            totalQuestions,
            videoQuality: 'HD'
          })
          console.log("✅ [EVAL-RT] Video interview usage recorded:", durationMinutes, "minutes")
        } else {
          console.log("⚠️ [EVAL-RT] Could not determine interview duration, skipping usage recording")
        }
      } catch (usageErr: any) {
        console.warn("⚠️ [EVAL-RT] Failed to record video usage:", usageErr?.message)
      }

      console.log("=".repeat(80) + "\n")

      return NextResponse.json({
        ok: true,
        evaluation: completeEvaluation,
        overallScore,
        recommendation,
        criterionAverages,
        scoring: completeEvaluation.scoring,
        source: "realtime",
      })
    }

    // ========== FALLBACK: TRANSCRIPT-BASED EVALUATION ==========
    console.log("📝 [EVAL] No real-time evaluations found, using transcript-based evaluation")

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

    // ========== POSITION-BASED ANSWER EXTRACTION ==========
    // Extract answers by position: skip setup question, Q1 answer = responses between Q1 and Q2, etc.
    const answersMap = extractAnswersByPosition(turns, dbQuestions.length)
    
    const questionsWithAnswers = dbQuestions.map((dbQ) => {
      const realAnswer = answersMap.get(dbQ.questionNumber) || null
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

    // Keep application in ai_interview stage - will move to hiring_manager only when user performs "Move to Application"
    await DatabaseService.query(
      "UPDATE applications SET current_stage = 'ai_interview' WHERE id = $1::uuid",
      [applicationId]
    )

    console.log("✅ [EVAL] Evaluation stored in interviews table")
    console.log("✅ [EVAL] Application kept in ai_interview stage")

    // Record video interview usage for billing
    try {
      const interviewInfo = (await DatabaseService.query(
        `SELECT interview_completed_at, interview_sent_at FROM interviews WHERE application_id = $1::uuid LIMIT 1`,
        [applicationId]
      )) as any[]
      let durationMinutes = 0
      if (interviewInfo?.[0]?.interview_sent_at && interviewInfo?.[0]?.interview_completed_at) {
        durationMinutes = Math.max(1, Math.round(
          (new Date(interviewInfo[0].interview_completed_at).getTime() - new Date(interviewInfo[0].interview_sent_at).getTime()) / 60000
        ))
      }
      if (durationMinutes > 0) {
        await DatabaseService.recordVideoInterviewUsage({
          companyId,
          jobId,
          interviewId: applicationId,
          candidateId: application.candidate_id || undefined,
          durationMinutes,
          completedQuestions: answeredCount,
          totalQuestions,
          videoQuality: 'HD'
        })
        console.log("✅ [EVAL] Video interview usage recorded:", durationMinutes, "minutes")
      } else {
        console.log("⚠️ [EVAL] Could not determine interview duration, skipping usage recording")
      }
    } catch (usageErr: any) {
      console.warn("⚠️ [EVAL] Failed to record video usage:", usageErr?.message)
    }

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

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      applicationId,
      companyId,
      jobId,
      durationMinutes,
      evaluations,  // Array of per-question evaluations
      questions     // Original questions array
    } = body

    if (!applicationId || !companyId) {
      return NextResponse.json({ error: 'applicationId and companyId are required' }, { status: 400 })
    }
    if (!evaluations || evaluations.length === 0) {
      return NextResponse.json({ error: 'evaluations are required' }, { status: 400 })
    }

    console.log('[Interview Complete] Application:', applicationId)
    console.log('[Interview Complete] Duration:', durationMinutes, 'minutes')
    console.log('[Interview Complete] Questions evaluated:', evaluations.length)

    // Group evaluations by criterion
    const criteriaMap: Record<string, {
      totalMarksObtained: number,
      totalMaxMarks: number,
      questions: any[]
    }> = {}

    let totalMarksObtained = 0
    let totalMaxMarks = 0

    for (const evaluation of evaluations) {
      const criterion = evaluation.criterion || 'General'
      const maxMarks = evaluation.maxMarks || 10
      const marksObtained = evaluation.evaluation?.marksObtained || 0

      totalMarksObtained += marksObtained
      totalMaxMarks += maxMarks

      if (!criteriaMap[criterion]) {
        criteriaMap[criterion] = {
          totalMarksObtained: 0,
          totalMaxMarks: 0,
          questions: []
        }
      }

      criteriaMap[criterion].totalMarksObtained += marksObtained
      criteriaMap[criterion].totalMaxMarks += maxMarks
      const questionScore = maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 100) : 0
      const weightedContribution = totalMaxMarks > 0 
        ? Math.round((marksObtained / totalMaxMarks) * 100 * 100) / 100
        : 0

      criteriaMap[criterion].questions.push({
        question_number: evaluation.questionNumber || criteriaMap[criterion].questions.length + 1,
        question_text: evaluation.question,
        criterion: criterion,
        difficulty: evaluation.difficulty || 'Medium',
        marks: maxMarks,
        score: questionScore,
        weighted_contribution: weightedContribution,
        candidate_response: evaluation.answer,
        strengths: evaluation.evaluation?.strengths || [],
        gaps: evaluation.evaluation?.gaps || [],
        evaluation_reasoning: evaluation.evaluation?.feedback || evaluation.evaluation?.reasoning || ''
      })
    }

    // Calculate overall score
    const overallScore = totalMaxMarks > 0 
      ? Math.round((totalMarksObtained / totalMaxMarks) * 100 * 100) / 100
      : 0

    // Determine recommendation based on score
    let recommendation: string
    if (overallScore >= 80) {
      recommendation = 'Strongly Recommend'
    } else if (overallScore >= 60) {
      recommendation = 'Recommend'
    } else if (overallScore >= 40) {
      recommendation = 'On Hold'
    } else {
      recommendation = 'Reject'
    }

    // Calculate criterion averages for scoring section
    const criterionAverages: Record<string, number> = {}
    for (const [criterion, data] of Object.entries(criteriaMap)) {
      const criterionScore = data.totalMaxMarks > 0 
        ? Math.round((data.totalMarksObtained / data.totalMaxMarks) * 100 * 100) / 100
        : 0
      criterionAverages[criterion] = criterionScore
    }

    // Build questions array for evaluation section
    const allQuestions: any[] = []
    for (const [criterion, data] of Object.entries(criteriaMap)) {
      // Add questions to evaluation section
      data.questions.forEach((q: any) => {
        allQuestions.push(q)
      })
    }

    // Sort questions by question_number
    allQuestions.sort((a, b) => a.question_number - b.question_number)

    // Extract key strengths and areas for improvement
    const keyStrengths: string[] = []
    const areasForImprovement: string[] = []
    
    allQuestions.forEach((q: any) => {
      keyStrengths.push(...q.strengths)
      areasForImprovement.push(...q.gaps)
    })

    // Remove duplicates and limit to top 5
    const uniqueStrengths = Array.from(new Set(keyStrengths)).slice(0, 5)
    const uniqueGaps = Array.from(new Set(areasForImprovement)).slice(0, 5)

    // Check technical cutoff (50% threshold for Technical Skills)
    const technicalAvg = criterionAverages['Technical Skills'] || 0
    const technicalCutoff = {
      threshold: 50,
      technical_avg: technicalAvg,
      failed: technicalAvg < 50
    }

    // Generate AI summary using company key
    let summary = ''
    try {
      let companyOpenAIKey: string | undefined

      const companyData = await DatabaseService.query(
        `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      ) as any[]

      if (companyData?.[0]?.openai_service_account_key) {
        try {
          const decryptedKey = decrypt(companyData[0].openai_service_account_key).trim()
          if (decryptedKey.startsWith('{')) {
            const keyObj = JSON.parse(decryptedKey)
            companyOpenAIKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || undefined
          } else {
            companyOpenAIKey = decryptedKey
          }
        } catch (e) {
          console.warn('[Interview Complete] Failed to decrypt company key')
        }
      }

      if (!companyOpenAIKey) {
        companyOpenAIKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY || undefined
      }

      if (companyOpenAIKey) {
        const openaiProvider = createOpenAI({ apiKey: companyOpenAIKey })

        const criteriaList = Object.entries(criterionAverages)
          .map(([criterion, score]: [string, number]) => `${criterion}: ${score}%`)
          .join(', ')

        const { text } = await generateText({
          model: openaiProvider('gpt-4o'),
          system: 'You are an expert interviewer summarizing candidate performance. Be concise and professional.',
          prompt: `Summarize this candidate's interview performance in 2-3 sentences:

Overall Score: ${overallScore}%
Recommendation: ${recommendation}
Criteria Scores: ${criteriaList}

Key Strengths:
${uniqueStrengths.join('\n- ')}

Key Areas to Improve:
${uniqueGaps.join('\n- ')}

Provide a professional summary suitable for a hiring manager.`,
          temperature: 0.3,
        })

        summary = text.trim()
        console.log('[Interview Complete] AI summary generated')
      }
    } catch (summaryError) {
      console.warn('[Interview Complete] Failed to generate AI summary:', summaryError)
      summary = `Candidate scored ${overallScore}% overall. Recommendation: ${recommendation}.`
    }

    // Build comprehensive interview_evaluations structure
    const interviewEvaluations = {
      evaluation: {
        questions: allQuestions,
        scoring: {
          total_marks: Math.round(totalMaxMarks * 100) / 100,
          weighted_score: Math.round(overallScore * 100) / 100,
          final_score: Math.round(overallScore),
          method: 'marks_weighted'
        },
        criterion_averages: criterionAverages,
        technical_cutoff: technicalCutoff,
        recommendation: recommendation.toLowerCase().replace(/\s+/g, '_'),
        summary: summary,
        key_strengths: uniqueStrengths,
        areas_for_improvement: uniqueGaps
      }
    }

    // Update applications table with all interview data
    await DatabaseService.query(`
      UPDATE applications SET
        interview_status = 'Completed',
        interview_completed_at = NOW(),
        interview_score = $2,
        interview_evaluations = $3::jsonb,
        interview_recommendation = $4,
        interview_summary = $5,
        interview_feedback = $6,
        current_stage = 'ai_interview'
      WHERE id = $1::uuid
    `, [
      applicationId,
      overallScore,
      JSON.stringify(interviewEvaluations),
      recommendation,
      summary,
      `Overall: ${overallScore}% - ${recommendation}`
    ])

    console.log('[Interview Complete] Updated application with results')

    // Record video interview usage for billing
    if (durationMinutes && durationMinutes > 0) {
      try {
        // Get jobId from application if not provided
        let interviewJobId = jobId
        if (!interviewJobId) {
          const appInfo = await DatabaseService.query(
            `SELECT job_id, candidate_id FROM applications WHERE id = $1::uuid`,
            [applicationId]
          ) as any[]
          interviewJobId = appInfo?.[0]?.job_id
        }

        await DatabaseService.recordVideoInterviewUsage({
          companyId,
          jobId: interviewJobId,
          interviewId: applicationId,
          candidateId: undefined,
          durationMinutes,
          completedQuestions: evaluations.length,
          totalQuestions: questions?.length || evaluations.length,
          videoQuality: 'HD'
        })
        console.log('[Interview Complete] Usage recorded for billing')
      } catch (billingError) {
        console.warn('[Interview Complete] Failed to record usage:', billingError)
      }
    }

    // Record stage history
    try {
      await DatabaseService.query(`
        INSERT INTO application_stage_history (application_id, from_stage, to_stage, remarks)
        VALUES ($1::uuid, 'screening', 'ai_interview', $2)
      `, [applicationId, `Interview completed: ${overallScore}% - ${recommendation}`])
    } catch (historyError) {
      console.warn('[Interview Complete] Failed to record stage history:', historyError)
    }

    console.log('[Interview Complete] Interview completed successfully')
    console.log('[Interview Complete] Overall Score:', overallScore, '%')
    console.log('[Interview Complete] Recommendation:', recommendation)

    return NextResponse.json({
      success: true,
      applicationId,
      overallScore,
      totalMarksObtained: Math.round(totalMarksObtained * 100) / 100,
      totalMaxMarks,
      recommendation,
      summary,
      criteriaBreakdown: interviewEvaluations
    })
  } catch (error: any) {
    console.error('[Interview Complete] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to complete interview' },
      { status: 500 }
    )
  }
}

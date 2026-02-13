import { NextRequest, NextResponse } from 'next/server'
import { CVEvaluator } from '@/lib/cv-evaluator'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, resumeText, jobDescription, passThreshold = 40, companyId } = body

    console.log('[CV Evaluator] Starting evaluation for application:', applicationId)
    console.log('[CV Evaluator] ResumeText length:', resumeText?.length || 0)
    console.log('[CV Evaluator] JobDescription length:', jobDescription?.length || 0)

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: 'resumeText and jobDescription are required' },
        { status: 400 }
      )
    }

    // Fetch company's OpenAI service account key from DB
    let openaiApiKey: string | undefined

    if (companyId) {
      try {
        const companyData = await DatabaseService.query(
          `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
          [companyId]
        ) as any[]

        if (companyData?.[0]?.openai_service_account_key) {
          try {
            const decryptedKey = decrypt(companyData[0].openai_service_account_key).trim()
            if (decryptedKey.startsWith("{")) {
              const keyObj = JSON.parse(decryptedKey)
              openaiApiKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || undefined
            } else {
              openaiApiKey = decryptedKey
            }
            console.log('[CV Evaluator] Using company service account key for companyId:', companyId)
          } catch (e) {
            console.warn('[CV Evaluator] Failed to decrypt company key:', e)
          }
        }
      } catch (e) {
        console.warn('[CV Evaluator] Failed to fetch company key:', e)
      }
    }

    // Fallback to environment variable
    if (!openaiApiKey) {
      openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
      if (openaiApiKey) {
        console.log('[CV Evaluator] Using environment OPENAI_API_KEY for evaluation')
      } else {
        console.log('[CV Evaluator] No OpenAI API key configured')
      }
    }

    // Truncate resume text if too long (max 15000 chars to stay under token limits)
    const truncatedResume = resumeText.length > 15000 
      ? resumeText.substring(0, 15000) + "\n\n[Resume truncated due to length...]"
      : resumeText

    // Truncate JD if too long
    const truncatedJD = jobDescription.length > 5000
      ? jobDescription.substring(0, 5000) + "\n\n[JD truncated...]"
      : jobDescription

    console.log('[CV Evaluator] Resume length:', truncatedResume.length, 'JD length:', truncatedJD.length)

    // Evaluate using strict rubric with company-specific key
    const evaluation = await CVEvaluator.evaluateCandidate(
      truncatedResume,
      truncatedJD,
      passThreshold,
      companyId,
      openaiApiKey ? { apiKey: openaiApiKey } : undefined
    )

    console.log('[CV Evaluator] Evaluation complete:', {
      score: evaluation.overall.score_percent,
      qualified: evaluation.overall.qualified
    })

    // Record CV evaluation usage for billing
    if (companyId && applicationId) {
      try {
        const appInfo = await DatabaseService.query(
          `SELECT job_id FROM applications WHERE id = $1::uuid`,
          [applicationId]
        ) as any[]
        const jobId = appInfo?.[0]?.job_id
        if (jobId) {
          await DatabaseService.recordCVParsingUsage({
            companyId,
            jobId,
            candidateId: undefined,
            parseSuccessful: true,
            successRate: evaluation.overall.score_percent || 0,
          })
          console.log('[CV Evaluator] Usage recorded for billing')
        }
      } catch (usageErr) {
        console.warn('[CV Evaluator] Failed to record usage:', usageErr)
      }
    }

    // Save evaluation to database if applicationId provided
    if (applicationId) {
      try {
        // Check if columns exist
        const checkCols = await DatabaseService.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' 
             AND table_name = 'applications'
             AND column_name IN ('ai_cv_score', 'is_qualified', 'qualification_explanations')`,
          []
        )
        const cols = new Set((checkCols || []).map((r: any) => r.column_name))

        if (cols.size > 0) {
          const updates: string[] = []
          const params: any[] = []
          let p = 1

          if (cols.has('ai_cv_score')) {
            updates.push(`ai_cv_score = $${p++}`)
            params.push(Math.round(evaluation.overall.score_percent))
          }
          if (cols.has('is_qualified')) {
            updates.push(`is_qualified = $${p++}`)
            params.push(evaluation.overall.qualified)
          }
          if (cols.has('qualification_explanations')) {
            updates.push(`qualification_explanations = $${p++}::jsonb`)
            params.push(JSON.stringify({
              overall: evaluation.overall,
              extracted: evaluation.extracted,
              scores: evaluation.scores,
              reason_summary: evaluation.overall.reason_summary,
              eligibility: evaluation.eligibility,
              risk_adjustments: evaluation.risk_adjustments,
              production_exposure: evaluation.production_exposure,
              tenure_analysis: evaluation.tenure_analysis,
              explainable_score: evaluation.explainable_score
            }))
          }

          if (updates.length > 0) {
            params.push(applicationId)
            await DatabaseService.query(
              `UPDATE applications SET ${updates.join(', ')} WHERE id = $${p}::uuid`,
              params
            )
            console.log('[CV Evaluator] Saved evaluation to database')
          }
        }

        // Try to set a qualified-like status and advance stage when candidate is qualified
        try {
          if (evaluation?.overall?.qualified) {
            const enumRows = await DatabaseService.query(
              `SELECT e.enumlabel as enum_value
               FROM pg_type t 
               JOIN pg_enum e ON t.oid = e.enumtypid  
               WHERE t.typname = 'status_application'`,
              []
            ) as any[]
            const statuses = new Set((enumRows || []).map((r: any) => String(r.enum_value)))

            const preferred = ['cv_qualified', 'qualified', 'screening_passed']
            const chosen = preferred.find(s => statuses.has(s))

            if (chosen) {
              await DatabaseService.query(
                `UPDATE applications SET status = $1::status_application WHERE id = $2::uuid`,
                [chosen, applicationId]
              )
              console.log(`[CV Evaluator] Application status set to ${chosen}`)
            }

            // Advance stage to AI Interview if still in screening
            const prevStageRows = await DatabaseService.query(
              `SELECT current_stage FROM applications WHERE id = $1::uuid`,
              [applicationId]
            )
            const prevStage = prevStageRows?.[0]?.current_stage

            const stageUpdate = await DatabaseService.query(
              `UPDATE applications
               SET current_stage = 'ai_interview'
               WHERE id = $1::uuid AND current_stage = 'screening'
               RETURNING current_stage`,
              [applicationId]
            )

            if (stageUpdate && stageUpdate.length > 0) {
              await DatabaseService.query(
                `INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by)
                 VALUES ($1::uuid, $2::application_stage, 'ai_interview', NULL)`,
                [applicationId, prevStage || null]
              )
              console.log('[CV Evaluator] Stage advanced to ai_interview')
            }
          }
        } catch (setStatusErr) {
          console.warn('[CV Evaluator] Could not set qualified status/stage:', setStatusErr)
        }
      } catch (dbError) {
        console.warn('[CV Evaluator] Failed to save to database:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      evaluation
    })
  } catch (error: any) {
    console.error('[CV Evaluator] Error:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to evaluate CV',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

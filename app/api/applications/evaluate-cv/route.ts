import { NextRequest, NextResponse } from 'next/server'
import { CVEvaluator } from '@/lib/cv-evaluator'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resumeText, jobDescription, applicationId, companyId } = body

    console.log('[CV Evaluator] Starting evaluation for application:', applicationId)
    console.log('[CV Evaluator] ResumeText length:', resumeText?.length || 0)
    console.log('[CV Evaluator] JobDescription length:', jobDescription?.length || 0)

    if (!resumeText || !applicationId) {
      return NextResponse.json(
        { error: 'Resume text and applicationId are required' },
        { status: 400 }
      )
    }

    // Resolve companyId from application if not provided
    let resolvedCompanyId = companyId
    if (!resolvedCompanyId && applicationId) {
      try {
        const appInfo = await DatabaseService.query(
          `SELECT jp.company_id 
           FROM applications a
           JOIN job_postings jp ON a.job_id = jp.id
           WHERE a.id = $1::uuid`,
          [applicationId]
        )
        if (appInfo?.[0]?.company_id) {
          resolvedCompanyId = appInfo[0].company_id
          console.log('[CV Evaluator] Resolved companyId from application:', resolvedCompanyId)
        }
      } catch (e) {
        console.warn('[CV Evaluator] Failed to resolve companyId:', e)
      }
    }

    // Fetch company's OpenAI service key
    let openaiApiKey: string | undefined
    if (resolvedCompanyId) {
      try {
        const companyData = await DatabaseService.query(
          `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
          [resolvedCompanyId]
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
            console.log('[CV Evaluator] ✅ Using company service account key from DATABASE for companyId:', resolvedCompanyId)
          } catch (e) {
            console.warn('[CV Evaluator] Failed to decrypt company key:', e)
          }
        }
      } catch (e) {
        console.warn('[CV Evaluator] Failed to fetch company key:', e)
      }
    }

    // Check if already evaluated to prevent double evaluation and save costs
    const existing = await DatabaseService.query(
      `SELECT ai_cv_score FROM applications WHERE id = $1::uuid`,
      [applicationId]
    )
    if (existing?.[0]?.ai_cv_score !== null && existing?.[0]?.ai_cv_score !== undefined) {
      console.log('⚠️ [CV Evaluator] Already evaluated, skipping to save cost')
      return NextResponse.json({ 
        success: true, 
        alreadyEvaluated: true,
        existingScore: existing[0].ai_cv_score
      })
    }

    // Truncate resume if too long
    const truncatedResume = resumeText.length > 15000
      ? resumeText.substring(0, 15000) + "\n\n[Resume truncated due to length...]"
      : resumeText

    console.log('[CV Evaluator] Resume length:', truncatedResume.length)

    // Evaluate using all improvements (deterministic skill matching, OR groups, etc.)
    const evaluation = await CVEvaluator.evaluateApplication(
      truncatedResume,
      applicationId,
      DatabaseService.query.bind(DatabaseService),
      resolvedCompanyId,
      openaiApiKey ? { apiKey: openaiApiKey } : undefined
    )

    console.log('[CV Evaluator] Evaluation complete:', {
      score: evaluation.overall.score_percent,
      qualified: evaluation.overall.qualified
    })

    // Save evaluation to database
    try {
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

      // Advance stage if qualified
      if (evaluation.overall.qualified) {
        try {
          await DatabaseService.query(
            `UPDATE applications SET stage = 'ai_interview' WHERE id = $1::uuid`,
            [applicationId]
          )
          console.log('[CV Evaluator] Stage advanced to ai_interview')
        } catch (stageErr) {
          console.warn('[CV Evaluator] Failed to advance stage:', stageErr)
        }
      }
    } catch (saveErr) {
      console.warn('[CV Evaluator] Failed to save evaluation:', saveErr)
    }

    return NextResponse.json({
      success: true,
      evaluation: {
        overall: evaluation.overall,
        scores: evaluation.scores,
        extracted: evaluation.extracted,
        eligibility: evaluation.eligibility,
        risk_adjustments: evaluation.risk_adjustments,
        explainable_score: evaluation.explainable_score
      }
    })

  } catch (error: any) {
    console.error('[CV Evaluator] ERROR:', error)
    return NextResponse.json(
      { error: error?.message || 'CV evaluation failed' },
      { status: 500 }
    )
  }
}

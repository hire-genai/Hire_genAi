import { NextRequest, NextResponse } from 'next/server'
import { parseResume, cleanText } from '@/lib/resume-parser'
import { CVEvaluator } from '@/lib/cv-evaluator'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Check if text looks like binary/PDF raw content (not readable text)
 */
function isBinaryContent(text: string): boolean {
  if (!text || text.length < 10) return false
  
  // Check for PDF header
  if (text.startsWith('%PDF-')) return true
  
  // Check for high ratio of non-printable characters
  const nonPrintable = (text.match(/[^\x20-\x7E\n\r\t]/g) || []).length
  const ratio = nonPrintable / text.length
  
  // If more than 30% non-printable, likely binary
  if (ratio > 0.3) return true
  
  // Check for common binary patterns
  if (text.includes('\x00') || (text.includes('stream') && text.includes('endstream'))) return true
  
  return false
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Resume Parse] Starting resume parse request')
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const candidateId = formData.get('candidateId') as string | null
    const applicationId = formData.get('applicationId') as string | null

    console.log('[Resume Parse] File received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      candidateId,
      applicationId
    })

    if (!file) {
      return NextResponse.json(
        { error: 'Resume file is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    console.log('[Resume Parse] Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[Resume Parse] Buffer created, size:', buffer.length)

    // Track company and job for billing
    let companyIdForBilling: string | null = null
    let jobIdForBilling: string | null = null
    let companyOpenAIKey: string | undefined

    // Fetch company's service key BEFORE parsing so we use the company-specific key
    if (applicationId) {
      try {
        const appInfo = await DatabaseService.query(
          `SELECT a.job_id, jp.company_id 
           FROM applications a
           JOIN job_postings jp ON a.job_id = jp.id
           WHERE a.id = $1::uuid`,
          [applicationId]
        )
        if (appInfo && appInfo.length > 0) {
          companyIdForBilling = appInfo[0].company_id
          jobIdForBilling = appInfo[0].job_id
        }

        // Fetch company's OpenAI service key from DB
        if (companyIdForBilling) {
          try {
            const companyData = await DatabaseService.query(
              `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
              [companyIdForBilling]
            ) as any[]

            if (companyData?.[0]?.openai_service_account_key) {
              try {
                const decryptedKey = decrypt(companyData[0].openai_service_account_key).trim()
                if (decryptedKey.startsWith("{")) {
                  const keyObj = JSON.parse(decryptedKey)
                  companyOpenAIKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || undefined
                } else {
                  companyOpenAIKey = decryptedKey
                }
                console.log('[Resume Parse] Using company service account key for companyId:', companyIdForBilling)
              } catch (e) {
                console.warn('[Resume Parse] Failed to decrypt company key:', e)
              }
            }
          } catch (e) {
            console.warn('[Resume Parse] Failed to fetch company key:', e)
          }

          // Fallback to env var
          if (!companyOpenAIKey) {
            companyOpenAIKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY || undefined
            if (companyOpenAIKey) {
              console.log('[Resume Parse] Using environment OPENAI_API_KEY as fallback')
            }
          }
        }
      } catch (e) {
        console.warn('[Resume Parse] Failed to fetch company info:', e)
      }
    }

    // Parse the resume using company-specific key
    console.log('[Resume Parse] Starting parseResume function...')
    let parsed
    try {
      parsed = await parseResume(buffer, file.type, companyOpenAIKey ? { apiKey: companyOpenAIKey } : undefined)
      console.log('[Resume Parse] Parse complete, skills found:', parsed.skills?.length || 0)
    } catch (parseError: any) {
      console.error('[Resume Parse] Parsing failed, using fallback:', parseError.message)
      parsed = {
        rawText: '',
        skills: [],
        experience: [],
        education: [],
      }
    }

    // Optionally save parsed data to database
    if (applicationId && parsed.rawText) {
      try {

        // Check if resume_text column exists in applications table
        const checkCol = await DatabaseService.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'applications' 
              AND column_name = 'resume_text'
          ) as exists`,
          []
        )
        
        const hasResumeText = checkCol?.[0]?.exists === true

        if (hasResumeText) {
          const cleanedText = cleanText(parsed.rawText)
          
          // CRITICAL: Validate that we're not saving binary content
          if (isBinaryContent(cleanedText)) {
            console.error('[Resume Parse] ❌ BINARY CONTENT DETECTED - NOT saving to database!')
            console.error('[Resume Parse] First 200 chars:', cleanedText.substring(0, 200))
            throw new Error('Resume text extraction failed - binary content detected instead of readable text')
          }
          
          console.log('[Resume Parse] ✅ Text validated as readable, length:', cleanedText.length)
          console.log('[Resume Parse] First 300 chars:', cleanedText.substring(0, 300))
          
          // Check if updated_at column exists
          const checkUpdatedAt = await DatabaseService.query(
            `SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
                AND table_name = 'applications' 
                AND column_name = 'updated_at'
            ) as exists`,
            []
          )
          
          const hasUpdatedAt = checkUpdatedAt?.[0]?.exists === true
          
          if (hasUpdatedAt) {
            await DatabaseService.query(
              `UPDATE applications 
               SET resume_text = $1, updated_at = NOW() 
               WHERE id = $2::uuid`,
              [cleanedText, applicationId]
            )
          } else {
            await DatabaseService.query(
              `UPDATE applications 
               SET resume_text = $1 
               WHERE id = $2::uuid`,
              [cleanedText, applicationId]
            )
          }
          
          console.log('[Resume Parse] Successfully saved resume text to database')

          // ---- Auto-evaluate after saving resume text ----
          try {
            const appRows = await DatabaseService.query(
              `SELECT job_id FROM applications WHERE id = $1::uuid`,
              [applicationId]
            )
            const jobId = appRows?.[0]?.job_id

            if (jobId) {
              // Determine which JD column exists
              const jdColsCheck = await DatabaseService.query(
                `SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'job_postings'
                   AND column_name IN ('description','job_description','jd_text','details','summary')`,
                []
              )
              const jdCols = (jdColsCheck || []).map((r: any) => r.column_name)
              const preferred = ['description','job_description','jd_text','details','summary']
              const chosenJdCol = preferred.find(c => jdCols.includes(c))

              if (chosenJdCol) {
                const jdRow = await DatabaseService.query(
                  `SELECT ${chosenJdCol} as jd FROM job_postings WHERE id = $1::uuid`,
                  [jobId]
                )
                const jdText: string | undefined = jdRow?.[0]?.jd || undefined

                if (jdText) {
                  const resumeForEval = cleanedText.length > 15000
                    ? cleanedText.substring(0, 15000) + "\n\n[Resume truncated due to length...]"
                    : cleanedText
                  const jdForEval = String(jdText)
                  const passThreshold = 40

                  const evaluation = await CVEvaluator.evaluateCandidate(
                    resumeForEval,
                    jdForEval,
                    passThreshold,
                    companyIdForBilling || undefined,
                    companyOpenAIKey ? { apiKey: companyOpenAIKey } : undefined
                  )

                  console.log('[Resume Parse] ✅ CV Evaluation completed:', {
                    score: evaluation.overall.score_percent,
                    qualified: evaluation.overall.qualified,
                    reason: evaluation.overall.reason_summary
                  })

                  // Save evaluation results to applications
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
                        const scoreToSave = Math.round(evaluation.overall.score_percent)
                        params.push(scoreToSave)
                        console.log('[Resume Parse] 💾 Saving ai_cv_score:', scoreToSave)
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
                        console.log('[Resume Parse] Auto-evaluation saved to database')
                      }
                    }

                    // Try to set a qualified-like status when candidate is qualified
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
                        const preferredStatus = ['cv_qualified', 'qualified', 'screening_passed']
                        const chosen = preferredStatus.find(s => statuses.has(s))
                        if (chosen) {
                          await DatabaseService.query(
                            `UPDATE applications SET status = $1::status_application WHERE id = $2::uuid`,
                            [chosen, applicationId]
                          )
                          console.log(`[Resume Parse] Application status set to ${chosen}`)
                        }
                      }
                    } catch (setStatusErr) {
                      console.warn('[Resume Parse] Could not set qualified status:', setStatusErr)
                    }
                  } catch (saveErr) {
                    console.warn('[Resume Parse] Failed to save auto-evaluation:', saveErr)
                  }
                }
              }
            }
          } catch (autoEvalErr) {
            console.warn('[Resume Parse] Auto-evaluation failed:', autoEvalErr)
          }
        }
      } catch (err) {
        console.warn('Failed to save resume text to database:', err)
      }
    }

    // Optionally update candidate with parsed info
    if (candidateId && parsed.name) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(candidateId)) {
          console.warn('[Resume Parse] candidateId is not a valid UUID, skipping candidate update:', candidateId)
        } else {
          const colCheck = await DatabaseService.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' 
               AND table_name = 'candidates'
               AND column_name IN ('full_name', 'phone', 'location')`,
            []
          )
          const cols = new Set((colCheck || []).map((r: any) => r.column_name))

          const updates: string[] = []
          const params: any[] = []
          let p = 1

          if (cols.has('full_name') && parsed.name) {
            updates.push(`full_name = $${p++}`)
            params.push(parsed.name)
          }
          if (cols.has('phone') && parsed.phone) {
            updates.push(`phone = $${p++}`)
            params.push(parsed.phone)
          }
          if (cols.has('location') && parsed.location) {
            updates.push(`location = $${p++}`)
            params.push(parsed.location)
          }

          if (updates.length > 0) {
            params.push(candidateId)
            await DatabaseService.query(
              `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${p}::uuid`,
              params
            )
          }
        }
      } catch (err) {
        console.warn('Failed to update candidate with parsed data:', err)
      }
    }

    // Record CV parsing usage for billing
    if (companyIdForBilling && jobIdForBilling && parsed.rawText) {
      try {
        await DatabaseService.recordCVParsingUsage({
          companyId: companyIdForBilling,
          jobId: jobIdForBilling,
          candidateId: candidateId || undefined,
          fileSizeKb: Math.round(file.size / 1024),
          parseSuccessful: true,
          successRate: parsed.skills && parsed.skills.length > 0 ? 95 : 80
        })
        console.log('[Resume Parse] Billing tracking completed')
      } catch (billingErr) {
        console.warn('[Resume Parse] Billing tracking failed:', billingErr)
      }
    }

    return NextResponse.json({
      success: true,
      parsed: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        summary: parsed.summary,
        skills: parsed.skills,
        experience: parsed.experience,
        education: parsed.education,
        certifications: parsed.certifications,
        languages: parsed.languages,
        links: parsed.links,
        rawText: parsed.rawText.substring(0, 5000),
      },
    })
  } catch (error: any) {
    console.error('[Resume Parse] ERROR:', error)
    console.error('[Resume Parse] Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to parse resume',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

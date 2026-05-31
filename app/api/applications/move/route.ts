import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stageMap: Record<string, string> = {
  interview: 'ai_interview',
  hiringManager: 'hiring_manager',
  offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
  talentPool: 'talentPool', // handled separately — no stage change
}

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      applicationId,
      moveToStage,
      remarks = '',
      changedBy,
      changedByEmail,
      companyId,
      rejectionReason,
      addToTalentPool,
      talentPoolCategory,
      talentPoolNotes,
      talentPoolSkillTags,
    } = body || {}

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }
    if (!moveToStage) {
      return NextResponse.json({ error: 'moveToStage is required' }, { status: 400 })
    }

    // Resolve applicationId if it's an email (handle session mismatch)
    let resolvedApplicationId = applicationId
    if (applicationId.includes('@')) {
      // If applicationId looks like an email, find the application by candidate email
      const appByCandidate = await DatabaseService.query(
        `SELECT a.id FROM applications a 
         JOIN candidates c ON a.candidate_id = c.id 
         WHERE c.email = $1 AND a.company_id = $2::uuid 
         LIMIT 1`,
        [applicationId, companyId]
      )
      if (appByCandidate.length > 0) {
        resolvedApplicationId = appByCandidate[0].id
      } else {
        return NextResponse.json({ error: 'Application not found for candidate email' }, { status: 404 })
      }
    }

    const isTalentPoolOnly = moveToStage === 'talentPool'
    const targetStage = isTalentPoolOnly ? null : stageMap[moveToStage]

    if (!isTalentPoolOnly && !targetStage) {
      return NextResponse.json({ error: 'Invalid target stage' }, { status: 400 })
    }

    // Require rejection reason when rejecting
    if (targetStage === 'rejected' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Convert email to user ID if needed
    let changedByValue: string | null = changedBy || null
    
    if (changedByEmail && !changedBy) {
      // Look up user ID by email
      try {
        const userRows = await DatabaseService.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [changedByEmail]
        ) as any[]
        
        if (userRows && userRows.length > 0) {
          changedByValue = userRows[0].id
        } else {
          console.warn('User not found for email:', changedByEmail)
          changedByValue = null
        }
      } catch (error) {
        console.error('Error looking up user by email:', error)
        changedByValue = null
      }
    }

    // Get current stage, candidate_id, and company_id
    const currentRows = await DatabaseService.query(
      companyId
        ? `SELECT current_stage, candidate_id, company_id FROM applications WHERE id = $1::uuid AND company_id = $2::uuid LIMIT 1`
        : `SELECT current_stage, candidate_id, company_id FROM applications WHERE id = $1::uuid LIMIT 1`,
      companyId ? [resolvedApplicationId, companyId] : [resolvedApplicationId]
    ) as any[]

    if (!currentRows || currentRows.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const currentStage = currentRows[0].current_stage
    const candidateId = currentRows[0].candidate_id
    const resolvedCompanyId = companyId || currentRows[0].company_id

    // For talent pool: update stage to 'withdrawn' (parked) + insert into talent_pool_entries
    if (isTalentPoolOnly) {
      await DatabaseService.query(
        `UPDATE applications SET current_stage = 'withdrawn'::application_stage WHERE id = $1::uuid`,
        [resolvedApplicationId]
      )
      await DatabaseService.query(
        `INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, remarks)
         VALUES ($1::uuid, $2::application_stage, 'withdrawn'::application_stage, $3, $4)`,
        [resolvedApplicationId, currentStage || null, changedByValue, remarks || 'Moved to Talent Pool']
      )
    }

    if (!isTalentPoolOnly) {
      let updated: any[]
      if (targetStage === 'rejected') {
        updated = await DatabaseService.query(
          `UPDATE applications
           SET current_stage = $1::application_stage,
               rejection_reason = $2,
               rejection_stage = $3::application_stage,
               rejected_at = NOW()
           WHERE id = $4::uuid
           RETURNING current_stage`,
          [targetStage, rejectionReason, currentStage, resolvedApplicationId]
        ) as any[]
      } else {
        updated = await DatabaseService.query(
          `UPDATE applications
           SET current_stage = $1::application_stage
           WHERE id = $2::uuid
           RETURNING current_stage`,
          [targetStage, resolvedApplicationId]
        ) as any[]
      }

      if (!updated || updated.length === 0) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }

      // Record stage history
      await DatabaseService.query(
        `INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, remarks)
         VALUES ($1::uuid, $2::application_stage, $3::application_stage, $4, $5)`,
        [resolvedApplicationId, currentStage || null, targetStage, changedByValue, remarks || '']
      )
    }

    // Insert into talent_pool_entries when talentPool move OR addToTalentPool flag set
    const shouldInsertPool = isTalentPoolOnly || addToTalentPool
    if (shouldInsertPool && candidateId && resolvedCompanyId) {
      // First ensure columns exist via migration, then insert
      const poolNotes = talentPoolNotes || null
      const poolSource = talentPoolCategory || (isTalentPoolOnly ? 'talent_pool' : 'rejected_candidate')

      try {
        await DatabaseService.query(
          `INSERT INTO talent_pool_entries (company_id, candidate_id, application_id, status, notes, source, last_contacted)
           VALUES ($1::uuid, $2::uuid, $3::uuid, 'passive'::talent_pool_status, $4, $5, NOW())
           ON CONFLICT (company_id, candidate_id) DO UPDATE
             SET notes = COALESCE(EXCLUDED.notes, talent_pool_entries.notes),
                 source = COALESCE(EXCLUDED.source, talent_pool_entries.source),
                 application_id = COALESCE(EXCLUDED.application_id, talent_pool_entries.application_id),
                 last_contacted = NOW()`,
          [resolvedCompanyId, candidateId, resolvedApplicationId, poolNotes, poolSource]
        )
        console.log('✅ Talent pool entry saved for candidate:', candidateId)
      } catch (poolErr: any) {
        console.warn('⚠️ Full talent pool insert failed, trying without new columns:', poolErr?.message)
        // Fallback for databases where migration hasn't run yet
        await DatabaseService.query(
          `INSERT INTO talent_pool_entries (company_id, candidate_id, status, last_contacted)
           VALUES ($1::uuid, $2::uuid, 'passive'::talent_pool_status, NOW())
           ON CONFLICT (company_id, candidate_id) DO UPDATE SET last_contacted = NOW()`,
          [resolvedCompanyId, candidateId]
        )
      }

      // Back-fill candidates.current_title and experience_years from resume if still empty
      try {
        const appRows = await DatabaseService.query(
          `SELECT qualification_explanations FROM applications WHERE id = $1::uuid`,
          [resolvedApplicationId]
        ) as any[]
        if (appRows.length > 0 && appRows[0].qualification_explanations) {
          const qual = typeof appRows[0].qualification_explanations === 'string'
            ? JSON.parse(appRows[0].qualification_explanations)
            : appRows[0].qualification_explanations
          const extracted = qual?.extracted || {}
          const titleFromResume: string | null =
            (Array.isArray(extracted.work_experience) && extracted.work_experience[0]?.title) ||
            (Array.isArray(extracted.titles) && extracted.titles[0]) ||
            null
          const expFromResume: number | null = extracted.total_experience_years_estimate ?? null

          if (titleFromResume || expFromResume != null) {
            await DatabaseService.query(
              `UPDATE candidates SET
                current_title = CASE WHEN current_title IS NULL OR TRIM(current_title) = '' THEN $1 ELSE current_title END,
                experience_years = CASE WHEN experience_years IS NULL OR TRIM(experience_years::text) = '' THEN $2 ELSE experience_years END
               WHERE id = $3::uuid`,
              [titleFromResume, expFromResume != null ? String(expFromResume) : null, candidateId]
            )
          }
        }
      } catch (backfillErr: any) {
        console.warn('⚠️ Candidate back-fill skipped:', backfillErr?.message)
      }
    }


    return NextResponse.json({ ok: true, currentStage: isTalentPoolOnly ? 'withdrawn' : targetStage })
  } catch (err: any) {
    console.error('❌ Move application error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to move application' }, { status: 500 })
  }
}

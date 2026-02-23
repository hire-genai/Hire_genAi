import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get companyId from query param or session cookie
    let companyId: string | null = request.nextUrl.searchParams.get('companyId')

    if (!companyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          companyId = session.companyId || session.company?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie for talent-pool')
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // --- 1. Talent pool entries with candidate info, skills, and application scores ---
    const entriesQuery = `
      SELECT 
        tp.id AS pool_id,
        tp.status AS pool_status,
        tp.skills AS pool_skills,
        tp.last_contacted,
        c.created_at AS added_date,
        c.id AS candidate_id,
        c.full_name,
        c.email,
        c.phone,
        c.location,
        c.current_company,
        c.current_title,
        c.experience_years,
        c.linkedin_url,
        c.resume_url,
        c.photo_url,
        c.source AS candidate_source,
        c.notes AS candidate_notes,
        -- Get best CV score from any application
        (SELECT MAX(a.ai_cv_score) FROM applications a WHERE a.candidate_id = c.id AND a.company_id = $1::uuid) AS best_cv_score,
        -- Get best interview score from interviews table
        (SELECT MAX(i.interview_score) FROM interviews i JOIN applications a ON i.application_id = a.id WHERE a.candidate_id = c.id AND a.company_id = $1::uuid) AS best_interview_score,
        -- Get rejection info from most recent application
        (SELECT a.rejection_stage FROM applications a WHERE a.candidate_id = c.id AND a.company_id = $1::uuid AND a.current_stage = 'rejected' ORDER BY a.updated_at DESC LIMIT 1) AS rejection_stage,
        (SELECT a.rejection_reason FROM applications a WHERE a.candidate_id = c.id AND a.company_id = $1::uuid AND a.current_stage = 'rejected' ORDER BY a.updated_at DESC LIMIT 1) AS rejection_reason,
        -- Get most recent interaction date
        (SELECT MAX(tpi.contacted_at) FROM talent_pool_interactions tpi WHERE tpi.talent_pool_id = tp.id) AS last_interaction_date,
        -- Default added by name since tp.added_by doesn't exist
        'System' AS added_by_name
      FROM talent_pool_entries tp
      JOIN candidates c ON tp.candidate_id = c.id
      WHERE tp.company_id = $1::uuid
      ORDER BY c.created_at DESC
    `
    const entries = await DatabaseService.query(entriesQuery, [companyId])

    // --- 2. Get candidate IDs for application history ---
    const candidateIds = entries.map((e: any) => e.candidate_id)

    // --- 3. Get interaction history for each pool entry ---
    const poolIds = entries.map((e: any) => e.pool_id)
    let interactionsMap: Record<string, any[]> = {}

    if (poolIds.length > 0) {
      const placeholders = poolIds.map((_: any, i: number) => `$${i + 1}::uuid`).join(', ')
      const interactionsQuery = `
        SELECT 
          tpi.talent_pool_id,
          tpi.interaction_type,
          tpi.summary,
          tpi.contacted_at,
          (SELECT u.full_name FROM users u WHERE u.id = tpi.contacted_by) AS contacted_by_name
        FROM talent_pool_interactions tpi
        WHERE tpi.talent_pool_id IN (${placeholders})
        ORDER BY tpi.contacted_at DESC
      `
      try {
        const interactionsResult = await DatabaseService.query(interactionsQuery, poolIds)
        for (const row of interactionsResult) {
          if (!interactionsMap[row.talent_pool_id]) interactionsMap[row.talent_pool_id] = []
          interactionsMap[row.talent_pool_id].push({
            type: row.interaction_type,
            summary: row.summary,
            date: row.contacted_at ? new Date(row.contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            contactedBy: row.contacted_by_name || 'Unknown',
          })
        }
      } catch {
        // talent_pool_interactions table might be empty
      }
    }

    // --- 4. Get application history for past-application candidates ---
    let appHistoryMap: Record<string, any[]> = {}
    if (candidateIds.length > 0) {
      const placeholders = candidateIds.map((_: any, i: number) => `$${i + 2}::uuid`).join(', ')
      const appHistoryQuery = `
        SELECT 
          ash.application_id,
          a.candidate_id,
          ash.from_stage,
          ash.to_stage,
          ash.remarks,
          ash.created_at,
          j.title AS job_title
        FROM application_stage_history ash
        JOIN applications a ON ash.application_id = a.id
        JOIN job_postings j ON a.job_id = j.id
        WHERE a.company_id = $1::uuid AND a.candidate_id IN (${placeholders})
        ORDER BY ash.created_at ASC
      `
      try {
        const appHistoryResult = await DatabaseService.query(appHistoryQuery, [companyId, ...candidateIds])
        for (const row of appHistoryResult) {
          if (!appHistoryMap[row.candidate_id]) appHistoryMap[row.candidate_id] = []
          appHistoryMap[row.candidate_id].push({
            date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            event: `Stage: ${formatStage(row.from_stage)} → ${formatStage(row.to_stage)}`,
            description: row.remarks || `Moved to ${formatStage(row.to_stage)} for ${row.job_title}`,
            stage: formatStage(row.to_stage),
          })
        }
      } catch {
        // application_stage_history might be empty
      }
    }

    // --- 5. Available job descriptions (open jobs for sending JDs) ---
    const jdsQuery = `
      SELECT id, title, department, location
      FROM job_postings
      WHERE company_id = $1::uuid AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 20
    `
    const availableJDs = await DatabaseService.query(jdsQuery, [companyId])

    // --- 6. Recruiters ---
    const recruitersQuery = `
      SELECT u.id, u.full_name AS name
      FROM users u
      WHERE u.company_id = $1::uuid AND u.status = 'active'
      ORDER BY u.full_name
    `
    const recruiters = await DatabaseService.query(recruitersQuery, [companyId])

    // --- Build formatted response ---
    const statusMap: Record<string, string> = {
      'active_interest': 'Active Interest',
      'passive': 'Passive',
      'not_interested': 'Not Interested',
      'hired': 'Hired',
      'archived': 'Archived',
    }

    const formattedEntries = entries.map((e: any) => {
      // Parse skills from comma-separated string to array
      const skills = e.pool_skills ? e.pool_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []
      const interactions = interactionsMap[e.pool_id] || []
      const appHistory = appHistoryMap[e.candidate_id] || []

      // Build combined history
      const history: any[] = []

      // Add "Added to Talent Pool" event
      history.push({
        date: e.added_date ? new Date(e.added_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        event: 'Added to Talent Pool',
        description: e.candidate_notes || `Added via ${e.candidate_source || 'Unknown source'}`,
        source: e.candidate_source || undefined,
      })

      // Add application history events
      for (const ah of appHistory) {
        history.push(ah)
      }

      // Add interaction events
      for (const int of interactions) {
        history.push({
          date: int.date,
          event: `${int.type.charAt(0).toUpperCase() + int.type.slice(1)} - ${int.contactedBy}`,
          description: int.summary || `${int.type} interaction`,
        })
      }

      // Sort history by date descending
      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return {
        poolId: e.pool_id,
        candidateId: e.candidate_id,
        name: e.full_name,
        position: e.current_title || 'Not specified',
        email: e.email,
        phone: e.phone || '',
        location: e.location || '',
        currentCompany: e.current_company || '',
        experienceYears: e.experience_years,
        linkedinUrl: e.linkedin_url || '',
        resumeUrl: e.resume_url || '',
        photoUrl: e.photo_url || '',
        addedDate: e.added_date ? new Date(e.added_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        source: e.candidate_source || 'Unknown',
        status: statusMap[e.pool_status] || e.pool_status,
        lastContact: (() => {
          // Use the most recent of last_contacted or last_interaction_date
          const lastContacted = e.last_contacted ? new Date(e.last_contacted) : null
          const lastInteraction = e.last_interaction_date ? new Date(e.last_interaction_date) : null
          
          if (!lastContacted && !lastInteraction) {
            return 'Never'
          }
          
          const mostRecent = lastContacted && lastInteraction 
            ? (lastContacted > lastInteraction ? lastContacted : lastInteraction)
            : (lastContacted || lastInteraction)
          
          return mostRecent!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        })(),
        skills,
        cvScore: e.best_cv_score != null ? `${Math.round(e.best_cv_score)}/100` : null,
        interviewScore: e.best_interview_score != null ? `${Math.round(e.best_interview_score)}/100` : null,
        rejectionStage: e.rejection_stage ? formatStage(e.rejection_stage) : null,
        rejectionReason: e.rejection_reason || null,
        addedByName: e.added_by_name || null,
        notes: e.candidate_notes || '',
        history,
      }
    })

    // --- Stats ---
    const stats = {
      total: formattedEntries.length,
      activeInterest: formattedEntries.filter((e: any) => e.status === 'Active Interest').length,
      passive: formattedEntries.filter((e: any) => e.status === 'Passive').length,
      byPosition: new Set(formattedEntries.map((e: any) => e.position)).size,
      bySource: {
        referral: formattedEntries.filter((e: any) => e.source === 'Referral').length,
        linkedin: formattedEntries.filter((e: any) => e.source === 'LinkedIn').length,
        pastApplication: formattedEntries.filter((e: any) => e.source === 'Past Application').length,
      },
      recentlyContacted: formattedEntries.filter((e: any) => {
        if (e.lastContact === 'Never') return false
        const contactDate = new Date(e.lastContact)
        const daysDiff = Math.floor((Date.now() - contactDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= 7
      }).length,
      avgSkillsPerCandidate: formattedEntries.length > 0
        ? (formattedEntries.reduce((sum: number, e: any) => sum + e.skills.length, 0) / formattedEntries.length).toFixed(1)
        : '0',
    }

    return NextResponse.json({
      success: true,
      data: {
        entries: formattedEntries,
        stats,
        availableJDs: (availableJDs || []).map((jd: any) => ({
          id: jd.id,
          title: jd.title,
          department: jd.department || 'General',
          location: jd.location || 'Not specified',
        })),
        recruiters: (recruiters || []).map((r: any) => ({
          id: r.id,
          name: r.name,
        })),
      }
    })
  } catch (error: any) {
    console.error('Talent Pool API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch talent pool data' },
      { status: 500 }
    )
  }
}

// POST - Add a new candidate to talent pool
export async function POST(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { 
      name, 
      position, 
      email, 
      phone, 
      source, 
      status, 
      skills, 
      experience, 
      location, 
      currentCompany, 
      linkedIn, 
      notes,
      companyId 
    } = body

    // Get companyId from body or session
    let finalCompanyId = companyId

    if (!finalCompanyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          finalCompanyId = session.companyId || session.company?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie for talent-pool POST')
      }
    }

    if (!finalCompanyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Map status from frontend to database enum
    const statusMap: Record<string, string> = {
      'Active Interest': 'active_interest',
      'Passive': 'passive',
      'Not Interested': 'not_interested',
      'Hired': 'hired',
      'Archived': 'archived',
    }
    const dbStatus = statusMap[status] || 'passive'

    // 1. Check if candidate already exists
    const checkCandidateQuery = `
      SELECT id FROM candidates 
      WHERE company_id = $1::uuid AND email = $2
      LIMIT 1
    `
    const existingCandidate = await DatabaseService.query(checkCandidateQuery, [finalCompanyId, email])
    
    let candidateId: string
    
    if (existingCandidate && existingCandidate.length > 0) {
      // Update existing candidate
      candidateId = existingCandidate[0].id
      const updateCandidateQuery = `
        UPDATE candidates SET
          full_name = $1,
          phone = $2,
          location = $3,
          current_company = $4,
          current_title = $5,
          experience_years = $6,
          linkedin_url = $7,
          source = $8,
          notes = $9
        WHERE id = $10::uuid
      `
      const experienceYears = experience ? parseInt(experience) : null
      await DatabaseService.query(updateCandidateQuery, [
        name,
        phone || null,
        location || null,
        currentCompany || null,
        position || null,
        experienceYears,
        linkedIn || null,
        source || 'Manual Entry',
        notes || null,
        candidateId,
      ])
    } else {
      // Create new candidate
      const insertCandidateQuery = `
        INSERT INTO candidates (
          company_id, 
          full_name, 
          email, 
          phone, 
          location, 
          current_company, 
          current_title, 
          experience_years, 
          linkedin_url, 
          source, 
          notes
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING id
      `
      const experienceYears = experience ? parseInt(experience) : null
      const candidateResult = await DatabaseService.query(insertCandidateQuery, [
        finalCompanyId,
        name,
        email,
        phone || null,
        location || null,
        currentCompany || null,
        position || null,
        experienceYears,
        linkedIn || null,
        source || 'Manual Entry',
        notes || null,
      ])
      candidateId = candidateResult[0].id
    }

    // 2. Add to talent pool with skills
    const talentPoolQuery = `
      INSERT INTO talent_pool_entries (
        company_id,
        candidate_id,
        status,
        skills
      ) VALUES (
        $1::uuid, $2::uuid, $3::talent_pool_status, $4
      )
      ON CONFLICT (company_id, candidate_id) 
      DO UPDATE SET
        status = EXCLUDED.status,
        skills = EXCLUDED.skills
      RETURNING id
    `
    
    await DatabaseService.query(talentPoolQuery, [
      finalCompanyId,
      candidateId,
      dbStatus,
      skills || null,
    ])

    return NextResponse.json({
      success: true,
      message: 'Candidate added to talent pool successfully',
      candidateId,
    })
  } catch (error: any) {
    console.error('Talent Pool POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add candidate to talent pool' },
      { status: 500 }
    )
  }
}

function formatStage(stage: string | null): string {
  if (!stage) return 'Unknown'
  const map: Record<string, string> = {
    'screening': 'Screening',
    'ai_interview': 'AI Interview',
    'hiring_manager': 'HM Review',
    'offer': 'Offer Stage',
    'hired': 'Hired',
    'rejected': 'Rejected',
    'withdrawn': 'Withdrawn',
  }
  return map[stage] || stage
}

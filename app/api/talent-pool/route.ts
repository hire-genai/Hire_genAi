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
    // Note: Using only columns that exist in the actual DB - minimal set (tp table has: id, company_id, candidate_id, status, added_by)
    const entriesQuery = `
      SELECT 
        tp.id AS pool_id,
        tp.status AS pool_status,
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
        -- Get best interview score from any application
        (SELECT MAX(a.interview_score) FROM applications a WHERE a.candidate_id = c.id AND a.company_id = $1::uuid) AS best_interview_score,
        -- Get rejection info from most recent application
        (SELECT a.rejection_stage FROM applications a WHERE a.candidate_id = c.id AND a.company_id = $1::uuid AND a.current_stage = 'rejected' ORDER BY a.updated_at DESC LIMIT 1) AS rejection_stage,
        (SELECT a.rejection_reason FROM applications a WHERE a.candidate_id = c.id AND a.company_id = $1::uuid AND a.current_stage = 'rejected' ORDER BY a.updated_at DESC LIMIT 1) AS rejection_reason,
        -- Default added by name since tp.added_by doesn't exist
        'System' AS added_by_name
      FROM talent_pool_entries tp
      JOIN candidates c ON tp.candidate_id = c.id
      WHERE tp.company_id = $1::uuid
      ORDER BY c.created_at DESC
    `
    const entries = await DatabaseService.query(entriesQuery, [companyId])

    // --- 2. Get skills for all candidates in the pool ---
    const candidateIds = entries.map((e: any) => e.candidate_id)
    let skillsMap: Record<string, string[]> = {}

    if (candidateIds.length > 0) {
      // Build a parameterized query for candidate IDs
      const placeholders = candidateIds.map((_: any, i: number) => `$${i + 1}::uuid`).join(', ')
      const skillsQuery = `
        SELECT candidate_id, skill_name 
        FROM candidate_skills 
        WHERE candidate_id IN (${placeholders})
        ORDER BY skill_name
      `
      try {
        const skillsResult = await DatabaseService.query(skillsQuery, candidateIds)
        for (const row of skillsResult) {
          if (!skillsMap[row.candidate_id]) skillsMap[row.candidate_id] = []
          skillsMap[row.candidate_id].push(row.skill_name)
        }
      } catch {
        // candidate_skills table might be empty
      }
    }

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
      const skills = skillsMap[e.candidate_id] || []
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
        lastContact: 'Never',
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

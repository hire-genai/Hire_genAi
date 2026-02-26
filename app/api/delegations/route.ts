import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { EmailService } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validate whether a string is a proper UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUUID(val: string | null | undefined): boolean {
  return !!val && UUID_REGEX.test(val)
}

// Helper: extract userId, companyId and email from session cookie or query params
async function getSessionInfo(req: NextRequest) {
  let companyId: string | null = req.nextUrl.searchParams.get('companyId')
  let userId: string | null = req.nextUrl.searchParams.get('userId')
  let sessionEmail: string | null = null

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (sessionCookie?.value) {
    try {
      let cookieValue = sessionCookie.value
      try { cookieValue = decodeURIComponent(cookieValue) } catch { /* use raw */ }
      const session = JSON.parse(cookieValue)
      if (!companyId) companyId = session.companyId || session.company?.id
      if (!userId) userId = session.userId || session.user?.id
      sessionEmail = session.email || session.user?.email || null
    } catch {
      console.log('[Delegations] Failed to parse session cookie')
    }
  }

  return { userId, companyId, sessionEmail }
}

// GET - Fetch delegations for the current user's company
export async function GET(req: NextRequest) {
  try {
    const { userId, companyId, sessionEmail } = await getSessionInfo(req)

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Auto-expire delegations whose end_date has passed
    try {
      await DatabaseService.query(
        `UPDATE delegations SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE AND company_id::text = $1::text`,
        [companyId]
      )
    } catch (e) {
      console.log('[Delegations] Auto-expire failed:', e)
    }

    // Resolve actual DB user ID - try by ID first, then by email (handles mock ID mismatch)
    let resolvedUserId: string = userId
    try {
      const byIdRow = await DatabaseService.query(
        `SELECT id::text AS id FROM users WHERE id::text = $1::text LIMIT 1`,
        [userId]
      )
      if (byIdRow.length > 0) {
        resolvedUserId = byIdRow[0].id
      } else if (sessionEmail) {
        const byEmailRow = await DatabaseService.query(
          `SELECT id::text AS id FROM users WHERE email = $1 LIMIT 1`,
          [sessionEmail]
        )
        if (byEmailRow.length > 0) resolvedUserId = byEmailRow[0].id
      }
    } catch (e) {
      console.log('[Delegations] User resolve failed, using raw userId:', e)
    }

    // Fetch delegations where user is either delegator or delegatee
    const delegations = await DatabaseService.query(
      `SELECT 
        d.*,
        u_by.full_name AS delegated_by_name,
        u_by.email AS delegated_by_email,
        u_to.full_name AS delegated_to_name,
        u_to.email AS delegated_to_email
      FROM delegations d
      LEFT JOIN users u_by ON d.delegated_by = u_by.id
      LEFT JOIN users u_to ON d.delegated_to = u_to.id
      WHERE d.company_id::text = $1::text
        AND (d.delegated_by::text = $2::text OR d.delegated_to::text = $2::text)
      ORDER BY d.created_at DESC`,
      [companyId, resolvedUserId]
    )

    // Fetch audit logs for this company
    const auditLogs = await DatabaseService.query(
      `SELECT 
        dal.*,
        u.full_name AS performed_by_name,
        d.delegation_type,
        d.item_name,
        d.delegated_by,
        d.delegated_to,
        d.reason,
        u_by.full_name AS delegated_by_name,
        u_to.full_name AS delegated_to_name
      FROM delegation_audit_logs dal
      JOIN delegations d ON dal.delegation_id = d.id
      LEFT JOIN users u ON dal.performed_by = u.id
      LEFT JOIN users u_by ON d.delegated_by = u_by.id
      LEFT JOIN users u_to ON d.delegated_to = u_to.id
      WHERE d.company_id::text = $1::text
        AND (d.delegated_by::text = $2::text OR d.delegated_to::text = $2::text)
      ORDER BY dal.created_at DESC
      LIMIT 100`,
      [companyId, resolvedUserId]
    )

    // Fetch recruiters in the same company (for the "delegate to" dropdown)
    const recruiters = await DatabaseService.query(
      `SELECT u.id::text as id, u.full_name, u.email 
       FROM users u 
       WHERE u.company_id::text = $1::text
         AND u.id::text != $2::text
         AND u.status = 'active'
       ORDER BY u.full_name`,
      [companyId, resolvedUserId]
    )

    // Fetch jobs owned by current user (for job delegation dropdown)
    const myJobs = await DatabaseService.query(
      `SELECT DISTINCT jp.id::text as id, jp.title, jp.status, jp.created_at FROM job_postings jp
       WHERE jp.company_id::text = $1::text
         AND jp.created_by = $2::text
       ORDER BY jp.created_at DESC`,
      [companyId, resolvedUserId]
    )

    // Fetch applications for jobs owned by current user (for application delegation)
    const myApplications = await DatabaseService.query(
      `SELECT 
        a.id::text as id, 
        a.current_stage,
        a.applied_at,
        c.full_name AS candidate_name,
        j.title AS job_title
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       JOIN job_postings j ON a.job_id = j.id
       WHERE j.company_id::text = $1::text
         AND j.created_by = $2::text
       ORDER BY a.applied_at DESC`,
      [companyId, resolvedUserId]
    )

    // Stats
    const stats = {
      active: delegations.filter((d: any) => d.status === 'active').length,
      jobsDelegated: delegations.filter((d: any) => d.delegation_type === 'job').length,
      applicationsDelegated: delegations.filter((d: any) => d.delegation_type === 'application').length,
    }

    return NextResponse.json({
      success: true,
      delegations,
      auditLogs,
      recruiters,
      myJobs,
      myApplications,
      stats
    })
  } catch (error: any) {
    console.error('[Delegations GET] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch delegations' }, { status: 500 })
  }
}

// POST - Create a new delegation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let { userId, companyId, sessionEmail } = await getSessionInfo(req)

    // Allow body overrides for mock auth
    if (!userId) userId = body.userId
    if (!companyId) companyId = body.companyId

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Resolve actual DB user ID - same logic as GET route
    let resolvedUserId: string = userId
    try {
      const byIdRow = await DatabaseService.query(
        `SELECT id::text AS id FROM users WHERE id::text = $1::text LIMIT 1`,
        [userId]
      )
      if (byIdRow.length > 0) {
        resolvedUserId = byIdRow[0].id
      } else if (sessionEmail) {
        const byEmailRow = await DatabaseService.query(
          `SELECT id::text AS id FROM users WHERE email = $1 LIMIT 1`,
          [sessionEmail]
        )
        if (byEmailRow.length > 0) resolvedUserId = byEmailRow[0].id
      }
    } catch (e) {
      console.log('[Delegations POST] User resolve failed, using raw userId:', e)
    }

    const { delegationType, itemId, delegatedTo, startDate, endDate, reason } = body

    // Validate required fields
    if (!delegationType || !itemId || !delegatedTo || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields: delegationType, itemId, delegatedTo, startDate, endDate' }, { status: 400 })
    }

    if (!['job', 'application'].includes(delegationType)) {
      return NextResponse.json({ error: 'delegationType must be "job" or "application"' }, { status: 400 })
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    if (delegatedTo === resolvedUserId) {
      return NextResponse.json({ error: 'Cannot delegate to yourself' }, { status: 400 })
    }

    // OWNERSHIP CHECK: Verify the user owns the item they're delegating
    let itemName = ''
    if (delegationType === 'job') {
      const jobCheck = await DatabaseService.query(
        `SELECT id, title, created_by FROM job_postings WHERE id::text = $1::text AND company_id::text = $2::text`,
        [itemId, companyId]
      )
      if (jobCheck.length === 0) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      if (jobCheck[0].created_by !== resolvedUserId) {
        return NextResponse.json({ error: 'You can only delegate jobs you own' }, { status: 403 })
      }
      itemName = jobCheck[0].title
    } else {
      // Application delegation — verify the application belongs to a job the user owns
      const appCheck = await DatabaseService.query(
        `SELECT a.id, c.full_name, j.title, j.created_by
         FROM applications a
         JOIN candidates c ON a.candidate_id = c.id
         JOIN job_postings j ON a.job_id = j.id
         WHERE a.id::text = $1::text AND a.company_id::text = $2::text`,
        [itemId, companyId]
      )
      if (appCheck.length === 0) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      if (appCheck[0].created_by !== resolvedUserId) {
        return NextResponse.json({ error: 'You can only delegate applications for jobs you own' }, { status: 403 })
      }
      itemName = `${appCheck[0].full_name} - ${appCheck[0].title}`
    }

    // Verify delegatee exists in same company
    const delegateeCheck = await DatabaseService.query(
      `SELECT id FROM users WHERE id::text = $1::text AND company_id::text = $2::text AND status = 'active'`,
      [delegatedTo, companyId]
    )
    if (delegateeCheck.length === 0) {
      return NextResponse.json({ error: 'Delegatee not found in your company' }, { status: 404 })
    }

    // Check for duplicate active delegation
    const duplicateCheck = await DatabaseService.query(
      `SELECT id FROM delegations 
       WHERE item_id::text = $1::text AND delegated_to::text = $2::text AND status = 'active'
         AND delegation_type = $3`,
      [itemId, delegatedTo, delegationType]
    )
    if (duplicateCheck.length > 0) {
      return NextResponse.json({ error: 'An active delegation already exists for this item and user' }, { status: 409 })
    }

    // Create delegation — use ::uuid only for values we know are valid UUIDs (itemId, delegatedTo are from DB dropdowns)
    const result = await DatabaseService.query(
      `INSERT INTO delegations (company_id, delegation_type, item_id, item_name, delegated_by, delegated_to, reason, start_date, end_date, status)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5::uuid, $6::uuid, $7, $8, $9, 'active')
       RETURNING *`,
      [companyId, delegationType, itemId, itemName, resolvedUserId, delegatedTo, reason || null, startDate, endDate]
    )

    const delegation = result[0]

    // Create audit log
    await DatabaseService.query(
      `INSERT INTO delegation_audit_logs (delegation_id, action, performed_by, details)
       VALUES ($1::uuid, 'created', $2::uuid, $3)`,
      [delegation.id, resolvedUserId, `Delegated ${delegationType} "${itemName}" from ${startDate} to ${endDate}. Reason: ${reason || 'N/A'}`]
    )

    // Send email notification to the delegatee (recruiter)
    try {
      const delegateeInfo = await DatabaseService.query(
        `SELECT email, full_name FROM users WHERE id::text = $1::text LIMIT 1`,
        [delegatedTo]
      )
      const delegatorInfo = await DatabaseService.query(
        `SELECT full_name FROM users WHERE id::text = $1::text LIMIT 1`,
        [resolvedUserId]
      )
      const companyInfo = await DatabaseService.query(
        `SELECT name FROM companies WHERE id::text = $1::text LIMIT 1`,
        [companyId]
      )

      if (delegateeInfo.length > 0) {
        const recruiterEmail = delegateeInfo[0].email
        const recruiterName = delegateeInfo[0].full_name || 'Recruiter'
        const delegatorName = delegatorInfo[0]?.full_name || 'Your manager'
        const companyName = companyInfo[0]?.name || 'your company'
        const typeLabel = delegationType === 'job' ? 'Job Opening' : 'Application'

        const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

        await EmailService.sendDelegationNotification({
          to: recruiterEmail,
          recruiterName,
          delegatorName,
          companyName,
          delegationType: typeLabel,
          itemName,
          startDate: fmtDate(startDate),
          endDate: fmtDate(endDate),
          reason: reason || 'N/A'
        })
        console.log('✅ [Delegations] Notification email sent to:', recruiterEmail)
      }
    } catch (emailErr: any) {
      console.log('⚠️ [Delegations] Email notification failed (non-critical):', emailErr.message)
    }

    return NextResponse.json({ success: true, delegation }, { status: 201 })
  } catch (error: any) {
    console.error('[Delegations POST] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create delegation' }, { status: 500 })
  }
}

// DELETE - Revoke/cancel a delegation
export async function DELETE(req: NextRequest) {
  try {
    const { userId, companyId } = await getSessionInfo(req)
    const delegationId = req.nextUrl.searchParams.get('id')

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!delegationId) {
      return NextResponse.json({ error: 'Delegation ID is required' }, { status: 400 })
    }

    // Verify ownership — only the delegator can revoke
    const delegation = await DatabaseService.query(
      `SELECT *, delegated_by::text AS delegated_by_text FROM delegations WHERE id::text = $1 AND company_id::text = $2`,
      [delegationId, companyId]
    )

    if (delegation.length === 0) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 })
    }

    if (delegation[0].delegated_by_text !== userId) {
      return NextResponse.json({ error: 'Only the delegator can revoke a delegation' }, { status: 403 })
    }

    if (delegation[0].status !== 'active') {
      return NextResponse.json({ error: 'Delegation is not active' }, { status: 400 })
    }

    // Revoke
    await DatabaseService.query(
      `UPDATE delegations SET status = 'revoked' WHERE id::text = $1`,
      [delegationId]
    )

    // Audit log
    await DatabaseService.query(
      `INSERT INTO delegation_audit_logs (delegation_id, action, performed_by, details)
       VALUES ($1::uuid, 'created', $2::uuid, 'Delegation revoked by owner')`,
      [delegationId, userId]
    )

    return NextResponse.json({ success: true, message: 'Delegation revoked' })
  } catch (error: any) {
    console.error('[Delegations DELETE] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to revoke delegation' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

// Helper to get session data
async function getSessionData() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  
  if (!sessionCookie?.value) {
    return null
  }
  
  try {
    const session = JSON.parse(sessionCookie.value)
    return {
      userId: session.userId || session.user?.id,
      companyId: session.companyId || session.company?.id,
      userEmail: session.email || session.user?.email,
      userName: session.fullName || session.user?.full_name || session.user?.fullName
    }
  } catch {
    return null
  }
}

// GET - Fetch all support tickets for the current user's company
export async function GET(request: NextRequest) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    const { searchParams } = new URL(request.url)
    let companyId: string | null = searchParams.get('companyId')
    let userId: string | null = null

    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        if (!companyId) companyId = session.companyId || session.company?.id
        userId = session.userId || session.user?.id
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    // If no company, return empty list
    if (!companyId) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        stats: { open: 0, in_progress: 0, resolved: 0, total: 0 },
        total: 0,
        limit: 50,
        offset: 0
      })
    }

    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query with filters
    let sql = `
      SELECT 
        st.id,
        st.company_id,
        st.created_by,
        st.ticket_type,
        st.category,
        st.title,
        st.description,
        st.priority,
        st.status,
        st.screenshot_url,
        st.resolved_at,
        st.created_at,
        st.updated_at,
        u.full_name as created_by_name,
        u.email as created_by_email
      FROM support_tickets st
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.company_id = $1::uuid
    `
    const params: any[] = [companyId]
    let paramIndex = 2

    if (status && status !== 'all') {
      sql += ` AND st.status = $${paramIndex}::ticket_status`
      params.push(status)
      paramIndex++
    }

    if (type && type !== 'all') {
      sql += ` AND st.ticket_type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    sql += ` ORDER BY st.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const tickets = await DatabaseService.query(sql, params)

    // Get comments count for each ticket
    for (const ticket of tickets) {
      try {
        const commentsCount = await DatabaseService.query(
          `SELECT COUNT(*) as count FROM ticket_comments WHERE ticket_id = $1::uuid`,
          [ticket.id]
        )
        ticket.comments_count = parseInt(commentsCount[0]?.count || '0')
      } catch {
        ticket.comments_count = 0
      }
    }

    // Get total count for pagination
    let countSql = `SELECT COUNT(*) as total FROM support_tickets WHERE company_id = $1::uuid`
    const countParams: any[] = [companyId]
    let countParamIndex = 2

    if (status && status !== 'all') {
      countSql += ` AND status = $${countParamIndex}::ticket_status`
      countParams.push(status)
      countParamIndex++
    }

    if (type && type !== 'all') {
      countSql += ` AND ticket_type = $${countParamIndex}`
      countParams.push(type)
    }

    const countResult = await DatabaseService.query(countSql, countParams)
    const total = parseInt(countResult[0]?.total || '0')

    // Get stats for dashboard cards
    const statsResult = await DatabaseService.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) as total_count
      FROM support_tickets 
      WHERE company_id = $1::uuid`,
      [companyId]
    )

    const stats = {
      open: parseInt(statsResult[0]?.open_count || '0'),
      in_progress: parseInt(statsResult[0]?.in_progress_count || '0'),
      resolved: parseInt(statsResult[0]?.resolved_count || '0'),
      total: parseInt(statsResult[0]?.total_count || '0')
    }

    // Format tickets for frontend
    const formattedTickets = tickets.map((ticket: any) => ({
      id: ticket.id,
      type: mapTicketTypeToFrontend(ticket.ticket_type),
      category: ticket.category || 'other',
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      createdBy: ticket.created_by_name || ticket.created_by_email || 'Unknown',
      createdAt: formatDate(ticket.created_at),
      screenshot: ticket.screenshot_url,
      commentsCount: ticket.comments_count
    }))

    return NextResponse.json({
      success: true,
      data: formattedTickets,
      stats,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    const body = await request.json()
    let companyId: string = ''
    let userId: string = ''
    let userName: string = 'User'

    let sessionEmail: string = ''
    
    // Parse session cookie - try both encoded and raw formats
    if (sessionCookie?.value) {
      try {
        // First try decoding (cookie was URL-encoded)
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(sessionCookie.value)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id || ''
        userId = session.userId || session.user?.id || ''
        userName = session.fullName || session.user?.full_name || session.user?.fullName || 'User'
        sessionEmail = session.email || ''
        
        console.log('🍪 Session cookie parsed:', { userId, companyId, sessionEmail })
      } catch (parseError) {
        console.error('Failed to parse session cookie:', parseError)
      }
    }

    // SECURITY: Only use authenticated session data - never accept userId/companyId from request body
    if (!companyId || !userId) {
      console.error('❌ No valid session found in cookie')
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create a support ticket.' },
        { status: 401 }
      )
    }

    const { type, category, title, description, priority, screenshot } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Map frontend type to database type
    const ticketType = mapTicketTypeToBackend(type)
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    const ticketPriority = validPriorities.includes(priority) ? priority : 'medium'

    // STRICT: Ensure user and company exist in database - create from session if missing, FAIL if creation fails
    // Check/create company
    console.log('🔍 Checking company exists:', companyId)
    let companyVerified = false
    try {
      const companyCheck = await DatabaseService.query(
        'SELECT id FROM companies WHERE id = $1::uuid',
        [companyId]
      )
      
      if (!companyCheck || companyCheck.length === 0) {
        // Create company from authenticated session data
        console.log('🔄 Creating company from session:', companyId)
        await DatabaseService.query(
          `INSERT INTO companies (id, name, status, verified, created_at)
           VALUES ($1::uuid, $2, 'active', false, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [companyId, 'Company']
        )
        console.log('✅ Company created successfully')
      } else {
        console.log('✅ Company already exists')
      }
      companyVerified = true
    } catch (companyError: any) {
      console.error('❌ Failed to verify/create company:', companyError.message)
      return NextResponse.json(
        { error: 'Failed to verify company. Please try again.' },
        { status: 500 }
      )
    }

    // Check/create user - check by ID first, then by email to handle ID mismatch
    console.log('🔍 Checking user exists:', userId)
    let userVerified = false
    let actualUserId = userId
    try {
      // First check by ID
      const userExistsById = await DatabaseService.query(
        `SELECT id, full_name FROM users WHERE id = $1::uuid LIMIT 1`,
        [userId]
      )
      if (userExistsById.length > 0) {
        console.log('✅ User already exists by ID')
        userVerified = true
        if (userExistsById[0].full_name && userExistsById[0].full_name !== 'User') {
          userName = userExistsById[0].full_name
        }
      } else if (sessionEmail) {
        // User not found by ID - check if exists by email (ID mismatch scenario)
        const userExistsByEmail = await DatabaseService.query(
          `SELECT id, full_name FROM users WHERE email = $1 LIMIT 1`,
          [sessionEmail]
        )
        if (userExistsByEmail.length > 0) {
          // User exists with different ID - use the existing user's ID
          actualUserId = userExistsByEmail[0].id
          console.log('✅ User found by email with different ID, using:', actualUserId)
          userVerified = true
          if (userExistsByEmail[0].full_name && userExistsByEmail[0].full_name !== 'User') {
            userName = userExistsByEmail[0].full_name
          }
        } else {
          // User doesn't exist at all - create new
          console.log('🔄 Creating user from session:', userId, sessionEmail)
          await DatabaseService.query(
            `INSERT INTO users (id, company_id, email, full_name, status, created_at)
             VALUES ($1::uuid, $2::uuid, $3, $4, 'active', NOW())
             ON CONFLICT (id) DO NOTHING`,
            [userId, companyId, sessionEmail, userName || sessionEmail]
          )
          console.log('✅ User created successfully')
          userVerified = true
        }
      } else {
        console.error('❌ User not found and no email in session:', userId)
        return NextResponse.json(
          { error: 'User not found. Please sign out and sign in again.' },
          { status: 401 }
        )
      }
    } catch (userError: any) {
      console.error('❌ Failed to verify/create user:', userError.message)
      return NextResponse.json(
        { error: 'Failed to verify user. Please try again.' },
        { status: 500 }
      )
    }

    // STRICT: Do not proceed if verification failed
    if (!companyVerified || !userVerified) {
      console.error('❌ Verification incomplete:', { companyVerified, userVerified })
      return NextResponse.json(
        { error: 'Authentication verification failed. Please sign in again.' },
        { status: 401 }
      )
    }
    console.log('✅ User and company fully verified in DB:', { actualUserId, companyId })

    // Insert ticket
    const result = await DatabaseService.query(
      `INSERT INTO support_tickets (
        company_id, created_by, ticket_type, category, title, 
        description, priority, status, screenshot_url
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4, $5, $6, $7::ticket_priority, 'open'::ticket_status, $8
      ) RETURNING *`,
      [
        companyId,
        actualUserId,
        ticketType,
        category || 'other',
        title.trim(),
        description.trim(),
        ticketPriority,
        screenshot || null
      ]
    )

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    const ticket = result[0]

    return NextResponse.json({
      success: true,
      message: 'Support ticket created successfully',
      data: {
        id: ticket.id,
        type: mapTicketTypeToFrontend(ticket.ticket_type),
        category: ticket.category,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        createdBy: userName || 'You',
        createdAt: formatDate(ticket.created_at)
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function mapTicketTypeToBackend(frontendType: string): string {
  const typeMap: Record<string, string> = {
    'bug': 'bug_report',
    'feature_request': 'feature_request',
    'question': 'support',
    'feedback': 'feedback'
  }
  return typeMap[frontendType] || 'support'
}

function mapTicketTypeToFrontend(backendType: string): string {
  const typeMap: Record<string, string> = {
    'bug_report': 'bug',
    'feature_request': 'feature_request',
    'support': 'question',
    'feedback': 'feedback'
  }
  return typeMap[backendType] || 'question'
}

function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

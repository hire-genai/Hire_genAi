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

// GET - Fetch a single support ticket with comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = request.nextUrl.searchParams.get('companyId')
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

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company found. Please sign in first.' },
        { status: 400 }
      )
    }

    const { id } = await params

    // Fetch ticket
    const ticketResult = await DatabaseService.query(
      `SELECT 
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
      WHERE st.id = $1::uuid AND st.company_id = $2::uuid`,
      [id, companyId]
    )

    if (!ticketResult || ticketResult.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = ticketResult[0]

    // Fetch comments
    const commentsResult = await DatabaseService.query(
      `SELECT 
        tc.id,
        tc.ticket_id,
        tc.author_id,
        tc.author_role,
        tc.message,
        tc.created_at,
        u.full_name as author_name,
        u.email as author_email
      FROM ticket_comments tc
      LEFT JOIN users u ON tc.author_id = u.id
      WHERE tc.ticket_id = $1::uuid
      ORDER BY tc.created_at ASC`,
      [id]
    )

    // Format comments
    const comments = commentsResult.map((comment: any) => ({
      id: comment.id,
      author: comment.author_name || comment.author_email || 'Unknown',
      role: comment.author_role === 'support_agent' ? 'support' : 'recruiter',
      message: comment.message,
      timestamp: formatDateTime(comment.created_at)
    }))

    // Format ticket response
    const formattedTicket = {
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
      comments
    }

    return NextResponse.json({
      success: true,
      data: formattedTicket
    })
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update a support ticket (status, priority, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    const body = await request.json()
    let companyId: string | null = body.companyId || null
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

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company found. Please sign in first.' },
        { status: 400 }
      )
    }

    const { id } = await params
    const { status, priority } = body

    // Verify ticket exists and belongs to company
    const existingTicket = await DatabaseService.query(
      `SELECT id FROM support_tickets WHERE id = $1::uuid AND company_id = $2::uuid`,
      [id, companyId]
    )

    if (!existingTicket || existingTicket.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Build update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status) {
      const validStatuses = ['open', 'in_progress', 'waiting', 'resolved', 'closed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updates.push(`status = $${paramIndex}::ticket_status`)
      values.push(status)
      paramIndex++

      // Set resolved_at if status is resolved or closed
      if (status === 'resolved' || status === 'closed') {
        updates.push(`resolved_at = NOW()`)
      }
    }

    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        )
      }
      updates.push(`priority = $${paramIndex}::ticket_priority`)
      values.push(priority)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const sql = `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`
    const result = await DatabaseService.query(sql, values)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      data: result[0]
    })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
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

function formatDateTime(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return `${d.toISOString().split('T')[0]} ${d.toTimeString().slice(0, 5)}`
}

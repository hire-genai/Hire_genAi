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

// GET - Fetch all comments for a ticket
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

    // Verify ticket exists and belongs to company
    const ticketCheck = await DatabaseService.query(
      `SELECT id FROM support_tickets WHERE id = $1::uuid AND company_id = $2::uuid`,
      [id, companyId]
    )

    if (!ticketCheck || ticketCheck.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Fetch comments
    const comments = await DatabaseService.query(
      `SELECT 
        tc.id,
        tc.ticket_id,
        tc.author_id,
        tc.author_role,
        tc.message,
        tc.image_url,
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
    const formattedComments = comments.map((comment: any) => ({
      id: comment.id,
      author: comment.author_name || comment.author_email || 'Unknown',
      role: comment.author_role === 'support_agent' ? 'support' : 'recruiter',
      message: comment.message,
      image: comment.image_url,
      timestamp: formatDateTime(comment.created_at)
    }))

    return NextResponse.json({
      success: true,
      data: formattedComments
    })
  } catch (error) {
    console.error('Error fetching ticket comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add a comment to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    const body = await request.json()
    let companyId: string | null = body.companyId || null
    let userId: string | null = body.userId || null
    let userName: string = 'User'

    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        if (!companyId) companyId = session.companyId || session.company?.id
        if (!userId) userId = session.userId || session.user?.id
        userName = session.fullName || session.user?.full_name || session.user?.fullName || 'User'
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'No user or company found. Please sign in first.' },
        { status: 400 }
      )
    }

    const { id } = await params
    const { message, imageUrl } = body

    // Validate message or image
    if (!message?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      )
    }

    // Verify ticket exists and belongs to company
    const ticketCheck = await DatabaseService.query(
      `SELECT id, status FROM support_tickets WHERE id = $1::uuid AND company_id = $2::uuid`,
      [id, companyId]
    )

    if (!ticketCheck || ticketCheck.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = ticketCheck[0]

    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot add comments to a closed ticket' },
        { status: 400 }
      )
    }

    // Insert comment
    const result = await DatabaseService.query(
      `INSERT INTO ticket_comments (ticket_id, author_id, author_role, message, image_url)
       VALUES ($1::uuid, $2::uuid, 'user', $3, $4)
       RETURNING *`,
      [id, userId, message?.trim() || '', imageUrl || null]
    )

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to add comment' },
        { status: 500 }
      )
    }

    // Update ticket's updated_at timestamp
    await DatabaseService.query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1::uuid`,
      [id]
    )

    const comment = result[0]

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: comment.id,
        author: userName || 'You',
        role: 'recruiter',
        message: comment.message,
        image: comment.image_url,
        timestamp: formatDateTime(comment.created_at)
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding ticket comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function
function formatDateTime(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return `${d.toISOString().split('T')[0]} ${d.toTimeString().slice(0, 5)}`
}

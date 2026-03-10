import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// POST - Add a message/reply to a ticket (admin/support agent)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const body = await req.json()
    const { message, screenshot } = body

    if (!message?.trim() && !screenshot) {
      return NextResponse.json(
        { success: false, error: "Message or image is required" },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const ticketResult = await DatabaseService.query(
      `SELECT id FROM support_tickets WHERE id = $1::uuid`,
      [id]
    )

    if (!ticketResult || ticketResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      )
    }

    // Find or create a user for the admin email
    let adminUserId = null
    try {
      const userResult = await DatabaseService.query(
        `SELECT id FROM users WHERE email = $1`,
        [user.email]
      )
      
      if (userResult && userResult.length > 0) {
        adminUserId = userResult[0].id
      } else {
        // Create a system user for admin if doesn't exist
        const createUserResult = await DatabaseService.query(
          `INSERT INTO users (email, full_name, status) 
           VALUES ($1, $2, 'active') 
           RETURNING id`,
          [user.email, `Admin (${user.email})`]
        )
        adminUserId = createUserResult[0].id
      }
    } catch (userError) {
      console.error("Error handling admin user:", userError)
      return NextResponse.json(
        { success: false, error: "Failed to create admin user record" },
        { status: 500 }
      )
    }

    if (!adminUserId) {
      return NextResponse.json(
        { success: false, error: "Could not determine admin user ID" },
        { status: 500 }
      )
    }

    // Insert comment as support agent
    await DatabaseService.query(
      `INSERT INTO ticket_comments (ticket_id, author_id, author_role, message, image_url)
       VALUES ($1::uuid, $2::uuid, 'support_agent', $3, $4)`,
      [id, adminUserId, message?.trim() || null, screenshot || null]
    )

    // Update ticket status to in_progress if it was open
    await DatabaseService.query(
      `UPDATE support_tickets 
       SET status = 'in_progress', updated_at = NOW() 
       WHERE id = $1::uuid AND status = 'open'`,
      [id]
    )

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully",
    })
  } catch (error: any) {
    console.error("Admin message error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

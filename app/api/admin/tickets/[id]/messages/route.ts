import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

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

    // Verify ticket exists and get company_id for admin user creation
    const ticketResult = await DatabaseService.query(
      `SELECT id, company_id FROM support_tickets WHERE id = $1::uuid`,
      [id]
    ) as any[]

    if (!ticketResult || ticketResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      )
    }

    const ticketCompanyId = ticketResult[0].company_id

    // Find or create a user record for the admin
    // Users table requires company_id (NOT NULL), so we use the ticket's company as context
    let adminUserId: string | null = null
    const userResult = await DatabaseService.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [user.email]
    ) as any[]

    if (userResult && userResult.length > 0) {
      adminUserId = userResult[0].id
    } else {
      // Create admin user record tied to this ticket's company (satisfies NOT NULL constraint)
      const createResult = await DatabaseService.query(
        `INSERT INTO users (email, full_name, status, company_id)
         VALUES ($1, $2, 'active', $3::uuid)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [user.email, `Support Team`, ticketCompanyId]
      ) as any[]
      adminUserId = createResult[0]?.id
    }

    if (!adminUserId) {
      return NextResponse.json(
        { success: false, error: "Could not resolve admin user" },
        { status: 500 }
      )
    }

    // Insert support reply
    await DatabaseService.query(
      `INSERT INTO ticket_comments (ticket_id, author_id, author_role, message, image_url)
       VALUES ($1::uuid, $2::uuid, 'support_agent', $3, $4)`,
      [id, adminUserId, message?.trim() || null, screenshot || null]
    )

    // Auto-move open → in_progress
    await DatabaseService.query(
      `UPDATE support_tickets
       SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1::uuid AND status = 'open'`,
      [id]
    )

    return NextResponse.json({ success: true, message: "Reply sent successfully" })
  } catch (error: any) {
    console.error("Admin message error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

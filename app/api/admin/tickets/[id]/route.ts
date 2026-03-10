import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET - Fetch a single ticket with comments (admin view)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
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
        c.name as company_name,
        u.full_name as user_name,
        u.email as user_email
      FROM support_tickets st
      LEFT JOIN companies c ON c.id = st.company_id
      LEFT JOIN users u ON u.id = st.created_by
      WHERE st.id = $1::uuid`,
      [id]
    )

    if (!ticketResult || ticketResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      )
    }

    const ticket = ticketResult[0] as any

    // Fetch comments/messages
    const commentsResult = await DatabaseService.query(
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

    // Format messages
    const messages = (commentsResult as any[]).map((c) => ({
      id: c.id,
      sender_type: c.author_role === "support_agent" ? "support" : "customer",
      sender_name: c.author_name || c.author_email?.split("@")[0] || "User",
      sender_email: c.author_email,
      message: c.message,
      screenshot_url: c.image_url,
      created_at: c.created_at,
    }))

    // Always add initial description as first message
    if (ticket.description) {
      messages.unshift({
        id: "initial",
        sender_type: "customer",
        sender_name: ticket.user_name || ticket.user_email?.split("@")[0] || "User",
        sender_email: ticket.user_email,
        message: ticket.description,
        screenshot_url: ticket.screenshot_url,
        created_at: ticket.created_at,
      })
    }

    const formattedTicket = {
      id: ticket.id,
      ticket_number: `TKT-${ticket.id.substring(0, 8).toUpperCase()}`,
      title: ticket.title,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      type: ticket.ticket_type,
      user_email: ticket.user_email || "Unknown",
      user_name: ticket.user_name || ticket.user_email?.split("@")[0] || "Unknown",
      company_name: ticket.company_name || "Unknown",
      messages,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    }

    return NextResponse.json({
      success: true,
      ticket: formattedTicket,
    })
  } catch (error: any) {
    console.error("Admin ticket detail error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update ticket status (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const body = await req.json()
    const { status, priority } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status) {
      const validStatuses = ["open", "in_progress", "waiting", "resolved", "closed"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status` },
          { status: 400 }
        )
      }
      updates.push(`status = $${paramIndex}::ticket_status`)
      values.push(status)
      paramIndex++

      if (status === "resolved" || status === "closed") {
        updates.push(`resolved_at = NOW()`)
      }
    }

    if (priority) {
      const validPriorities = ["low", "medium", "high", "urgent"]
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { success: false, error: `Invalid priority` },
          { status: 400 }
        )
      }
      updates.push(`priority = $${paramIndex}::ticket_priority`)
      values.push(priority)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const sql = `UPDATE support_tickets SET ${updates.join(", ")} WHERE id = $${paramIndex}::uuid RETURNING *`
    const result = await DatabaseService.query(sql, values)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to update ticket" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully",
    })
  } catch (error: any) {
    console.error("Admin ticket update error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

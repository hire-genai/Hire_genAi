import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET - Fetch all support tickets (admin view - all companies)
export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")

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
        c.name as company_name,
        u.full_name as user_name,
        u.email as user_email,
        COALESCE(tc.comment_count, 0) as message_count
      FROM support_tickets st
      LEFT JOIN companies c ON c.id = st.company_id
      LEFT JOIN users u ON u.id = st.created_by
      LEFT JOIN (
        SELECT ticket_id, COUNT(*) as comment_count 
        FROM ticket_comments 
        GROUP BY ticket_id
      ) tc ON tc.ticket_id = st.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status && status !== "all") {
      if (status === "open") {
        sql += ` AND st.status IN ('open', 'in_progress', 'waiting')`
      } else if (status === "resolved") {
        sql += ` AND st.status IN ('resolved', 'closed')`
      } else {
        sql += ` AND st.status = $${paramIndex}::ticket_status`
        params.push(status)
        paramIndex++
      }
    }

    if (type && type !== "all") {
      sql += ` AND st.ticket_type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    sql += ` ORDER BY 
      CASE st.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      st.updated_at DESC`

    const tickets = await DatabaseService.query(sql, params)

    // Format tickets
    const formattedTickets = (tickets as any[]).map((t) => ({
      id: t.id,
      ticket_number: `TKT-${t.id.substring(0, 8).toUpperCase()}`,
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status,
      type: t.ticket_type,
      user_email: t.user_email || "Unknown",
      user_name: t.user_name || t.user_email?.split("@")[0] || "Unknown",
      company_name: t.company_name || "Unknown",
      message_count: t.message_count,
      first_message: t.description?.substring(0, 100) || "",
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
    })
  } catch (error: any) {
    console.error("Admin tickets error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

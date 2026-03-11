import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    // Support ticket stats (excluding feedback)
    const statsRows = await DatabaseService.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'open' AND ticket_type != 'feedback') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress' AND ticket_type != 'feedback') as in_progress_count,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed') AND resolved_at >= CURRENT_DATE AND ticket_type != 'feedback') as resolved_today,
        COUNT(*) FILTER (WHERE ticket_type != 'feedback') as total
       FROM support_tickets`
    )
    const stats = statsRows[0] as any

    // Recent tickets
    const ticketRows = await DatabaseService.query(
      `SELECT
        st.id, st.title, st.ticket_type, st.category, st.priority, st.status,
        st.created_at, st.updated_at,
        c.name as company_name,
        u.full_name as created_by_name, u.email as created_by_email
       FROM support_tickets st
       LEFT JOIN companies c ON c.id = st.company_id
       LEFT JOIN users u ON u.id = st.created_by
       ORDER BY st.created_at DESC
       LIMIT 20`
    )

    const tickets = (ticketRows as any[]).map((r) => ({
      id: r.id,
      title: r.title,
      ticketType: r.ticket_type,
      category: r.category,
      priority: r.priority,
      status: r.status,
      companyName: r.company_name || "Unknown",
      createdByName: r.created_by_name || "Unknown",
      createdByEmail: r.created_by_email,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return NextResponse.json({
      ok: true,
      stats: {
        open: parseInt(stats.open_count || "0"),
        inProgress: parseInt(stats.in_progress_count || "0"),
        resolvedToday: parseInt(stats.resolved_today || "0"),
        total: parseInt(stats.total || "0"),
      },
      tickets,
    })
  } catch (error: any) {
    console.error("Support overview error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

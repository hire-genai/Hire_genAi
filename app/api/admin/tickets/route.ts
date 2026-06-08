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
        COALESCE(tc.comment_count, 0) as message_count,
        (SELECT tc2.author_role FROM ticket_comments tc2 WHERE tc2.ticket_id = st.id ORDER BY tc2.created_at DESC LIMIT 1) as last_message_from,
        (SELECT tc2.created_at FROM ticket_comments tc2 WHERE tc2.ticket_id = st.id ORDER BY tc2.created_at DESC LIMIT 1) as last_message_at,
        (SELECT LEFT(tc2.message, 120) FROM ticket_comments tc2 WHERE tc2.ticket_id = st.id ORDER BY tc2.created_at DESC LIMIT 1) as last_message_preview,
        (
          SELECT CASE
            WHEN LOWER(COALESCE(cs.plan_name, cs.plan_id, '')) LIKE '%enterprise%' THEN 'Enterprise'
            WHEN LOWER(COALESCE(cs.plan_name, cs.plan_id, '')) LIKE '%ultra%' THEN 'Ultra'
            WHEN LOWER(COALESCE(cs.plan_name, cs.plan_id, '')) LIKE '%large%' THEN 'Large'
            WHEN LOWER(COALESCE(cs.plan_name, cs.plan_id, '')) LIKE '%business%' THEN 'Business'
            WHEN LOWER(COALESCE(cs.plan_name, cs.plan_id, '')) LIKE '%professional%' THEN 'Professional'
            WHEN LOWER(COALESCE(cs.plan_name, cs.plan_id, '')) LIKE '%starter%' THEN 'Starter'
            ELSE NULL
          END
          FROM company_subscriptions cs
          WHERE cs.company_id = st.company_id
            AND cs.status IN ('active', 'authenticated', 'created')
            AND COALESCE(cs.plan_name, cs.plan_id, '') <> ''
          ORDER BY CASE cs.provider WHEN 'razorpay' THEN 0 ELSE 1 END,
                   CASE cs.status WHEN 'active' THEN 0 WHEN 'authenticated' THEN 1 ELSE 2 END
          LIMIT 1
        ) as plan_tier
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
      message_count: Number(t.message_count ?? 0),
      first_message: t.description?.substring(0, 100) || "",
      last_message_from: t.last_message_from ?? null,
      last_message_at: t.last_message_at ?? null,
      last_message_preview: t.last_message_preview ?? null,
      plan_tier: t.plan_tier ?? "Trial",
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

// PATCH - Update ticket status
export async function PATCH(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const { id, status } = await req.json()
    
    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing id or status" }, { status: 400 })
    }

    // Update ticket status
    const updateFields = ["status = $2"]
    const params = [id, status]
    
    // If resolving, set resolved_at timestamp
    if (status === 'resolved' || status === 'closed') {
      updateFields.push("resolved_at = NOW()")
    }

    await DatabaseService.query(
      `UPDATE support_tickets 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $1`,
      params
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update ticket error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

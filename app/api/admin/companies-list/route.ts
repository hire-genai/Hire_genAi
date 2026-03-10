import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const url = new URL(req.url)
    const search = url.searchParams.get("search") || ""
    const status = url.searchParams.get("status") || "all"

    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIdx = 1

    if (search) {
      whereClause += ` AND LOWER(c.name) LIKE $${paramIdx}`
      params.push(`%${search.toLowerCase()}%`)
      paramIdx++
    }

    if (status !== "all") {
      whereClause += ` AND c.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    }

    const rows = await DatabaseService.query(
      `SELECT
        c.id,
        c.name,
        c.status,
        c.created_at,
        COALESCE(cb.wallet_balance, 0) as wallet_balance,
        COALESCE(cb.current_month_spent, 0) as month_spent,
        COALESCE(cb.total_spent, 0) as total_spent,
        COALESCE(u.user_count, 0) as user_count,
        s.plan_name as subscription_plan,
        s.status as subscription_status
       FROM companies c
       LEFT JOIN company_billing cb ON cb.company_id = c.id
       LEFT JOIN (
        SELECT company_id, COUNT(*) as user_count
        FROM users
        GROUP BY company_id
       ) u ON u.company_id = c.id
       LEFT JOIN subscriptions s ON s.company_id = c.id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    )

    const companies = (rows as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.subscription_status || r.status || "active",
      walletBalance: parseFloat(r.wallet_balance || "0"),
      monthSpent: parseFloat(r.month_spent || "0"),
      totalSpent: parseFloat(r.total_spent || "0"),
      userCount: parseInt(r.user_count || "0"),
      subscriptionPlan: r.subscription_plan || "Free",
      createdAt: r.created_at,
    }))

    return NextResponse.json({ ok: true, companies })
  } catch (error: any) {
    console.error("Companies list error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

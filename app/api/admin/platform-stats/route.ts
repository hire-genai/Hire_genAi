import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = url.searchParams.get("endDate") || new Date().toISOString()

    // Total revenue (sum of all usage costs charged to companies)
    const revenueRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(cost), 0) as total
       FROM (
        SELECT cost FROM cv_parsing_usage
        UNION ALL
        SELECT cost FROM question_generation_usage
        UNION ALL
        SELECT cost FROM video_interview_usage
       ) all_usage`
    )
    const totalRevenue = parseFloat((revenueRows[0] as any)?.total || "0")

    // This month revenue
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthRevenueRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(cost), 0) as total
       FROM (
        SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1
        UNION ALL
        SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1
        UNION ALL
        SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1
       ) month_usage`,
      [monthStart.toISOString()]
    )
    const monthRevenue = parseFloat((monthRevenueRows[0] as any)?.total || "0")

    // Last month revenue for comparison
    const lastMonthStart = new Date(monthStart)
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)

    const lastMonthRevenueRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(cost), 0) as total
       FROM (
        SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at < $2
        UNION ALL
        SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at < $2
        UNION ALL
        SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at < $2
       ) last_month_usage`,
      [lastMonthStart.toISOString(), monthStart.toISOString()]
    )
    const lastMonthRevenue = parseFloat((lastMonthRevenueRows[0] as any)?.total || "0")
    const revenueChange = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Total expenses (OpenAI base costs)
    const expenseRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(base_cost), 0) as total
       FROM (
        SELECT COALESCE(openai_base_cost, cost * 0.7) as base_cost FROM cv_parsing_usage
        UNION ALL
        SELECT cost as base_cost FROM question_generation_usage
        UNION ALL
        SELECT COALESCE(openai_base_cost, cost * 0.7) as base_cost FROM video_interview_usage
       ) all_expenses`
    )
    const totalExpenses = parseFloat((expenseRows[0] as any)?.total || "0")

    // Profit margin from settings
    let profitMarginPercent = 20
    try {
      const marginRows = await DatabaseService.query(
        `SELECT value FROM admin_settings WHERE key = 'profit_margin'`
      )
      if (marginRows.length > 0) {
        profitMarginPercent = parseFloat((marginRows[0] as any).value || "20")
      }
    } catch { /* table may not exist yet */ }

    // Daily trend data for charts
    const trendRows = await DatabaseService.query(
      `SELECT
        d.day::date as date,
        COALESCE(cv.total, 0) + COALESCE(qg.total, 0) + COALESCE(vi.total, 0) as revenue,
        COALESCE(cv.base, 0) + COALESCE(qg.base, 0) + COALESCE(vi.base, 0) as expenses
       FROM generate_series($1::date, $2::date, '1 day') as d(day)
       LEFT JOIN (
        SELECT created_at::date as day, SUM(cost) as total, SUM(COALESCE(openai_base_cost, cost * 0.7)) as base
        FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        GROUP BY created_at::date
       ) cv ON d.day::date = cv.day
       LEFT JOIN (
        SELECT created_at::date as day, SUM(cost) as total, SUM(cost) as base
        FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        GROUP BY created_at::date
       ) qg ON d.day::date = qg.day
       LEFT JOIN (
        SELECT created_at::date as day, SUM(cost) as total, SUM(COALESCE(openai_base_cost, cost * 0.7)) as base
        FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
        GROUP BY created_at::date
       ) vi ON d.day::date = vi.day
       ORDER BY d.day`,
      [startDate, endDate]
    )

    const trend = (trendRows as any[]).map((r) => ({
      date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: parseFloat(r.revenue || "0"),
      expenses: parseFloat(r.expenses || "0"),
      profit: parseFloat(r.revenue || "0") - parseFloat(r.expenses || "0"),
    }))

    // Active alerts
    let alerts: any[] = []
    try {
      const alertRows = await DatabaseService.query(
        `SELECT id, alert_type, severity, title, description, created_at
         FROM admin_alerts
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT 10`
      )
      alerts = alertRows as any[]
    } catch { /* table may not exist yet */ }

    // Platform stats
    const companyCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM companies`)
    const userCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM users`)
    const jobCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM job_postings WHERE status = 'open'`)
    const interviewCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM interviews WHERE interview_status = 'Completed'`)

    return NextResponse.json({
      ok: true,
      kpis: {
        totalRevenue,
        monthRevenue,
        revenueChange,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        profitMarginPercent,
      },
      platformStats: {
        companies: parseInt((companyCount[0] as any)?.count || "0"),
        users: parseInt((userCount[0] as any)?.count || "0"),
        openJobs: parseInt((jobCount[0] as any)?.count || "0"),
        completedInterviews: parseInt((interviewCount[0] as any)?.count || "0"),
      },
      trend,
      alerts,
    })
  } catch (error: any) {
    console.error("Platform stats error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

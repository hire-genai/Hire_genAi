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

    // Total revenue (sum of all usage costs charged to companies within date range)
    const revenueRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(cost), 0) as total
       FROM (
        SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) all_usage`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    )
    const totalRevenue = parseFloat((revenueRows[0] as any)?.total || "0")

    // Revenue in selected date range (this is now the "current" period)
    const monthRevenue = totalRevenue

    // Previous period revenue for comparison (same duration before the selected date range)
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const durationMs = endDateObj.getTime() - startDateObj.getTime()
    
    const prevStartDate = new Date(startDateObj.getTime() - durationMs)
    const prevEndDate = new Date(endDateObj.getTime() - durationMs)

    const lastMonthRevenueRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(cost), 0) as total
       FROM (
        SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) previous_period_usage`,
      [prevStartDate.toISOString().slice(0, 10) + " 00:00:00", prevEndDate.toISOString().slice(0, 10) + " 23:59:59"]
    )
    const lastMonthRevenue = parseFloat((lastMonthRevenueRows[0] as any)?.total || "0")
    const revenueChange = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Total expenses (OpenAI base costs within date range)
    const expenseRows = await DatabaseService.query(
      `SELECT
        COALESCE(SUM(base_cost), 0) as total
       FROM (
        SELECT COALESCE(openai_base_cost, cost * 0.7) as base_cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost as base_cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT COALESCE(openai_base_cost, cost * 0.7) as base_cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) all_expenses`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
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

    // Active alerts within date range
    let alerts: any[] = []
    try {
      const alertRows = await DatabaseService.query(
        `SELECT id, alert_type, severity, title, description, created_at
         FROM admin_alerts
         WHERE status = 'active' AND created_at >= $1 AND created_at <= $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [startDate + " 00:00:00", endDate + " 23:59:59"]
      )
      alerts = alertRows as any[]
    } catch { /* table may not exist yet */ }

    // Platform stats (all-time counts)
    const companyCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM companies`)
    const userCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM users`)
    const jobCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM job_postings WHERE status = 'open'`)
    const interviewCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM interviews WHERE interview_status = 'Completed'`)

    // New companies in selected period
    const newCompanyRows = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM companies WHERE created_at >= $1 AND created_at <= $2`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    )

    // Per-feature usage breakdown in selected period
    const cvRows = await DatabaseService.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(cost), 0) as cost
       FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    )
    const qgRows = await DatabaseService.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(cost), 0) as cost
       FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    )
    const viRows = await DatabaseService.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(cost), 0) as cost,
              COALESCE(SUM(duration_minutes), 0) as minutes
       FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    )

    // Top companies by spend in period
    const topCompanyRows = await DatabaseService.query(
      `SELECT c.name, COALESCE(SUM(u.cost), 0) as total_spend
       FROM companies c
       JOIN (
         SELECT company_id, cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
         UNION ALL
         SELECT company_id, cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
         UNION ALL
         SELECT company_id, cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) u ON u.company_id = c.id
       GROUP BY c.id, c.name
       ORDER BY total_spend DESC
       LIMIT 5`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    )

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
        newCompanies: parseInt((newCompanyRows[0] as any)?.count || "0"),
      },
      usageBreakdown: {
        cvParses: {
          count: parseInt((cvRows[0] as any)?.count || "0"),
          cost: parseFloat((cvRows[0] as any)?.cost || "0"),
        },
        questions: {
          count: parseInt((qgRows[0] as any)?.count || "0"),
          cost: parseFloat((qgRows[0] as any)?.cost || "0"),
        },
        videoInterviews: {
          count: parseInt((viRows[0] as any)?.count || "0"),
          cost: parseFloat((viRows[0] as any)?.cost || "0"),
          minutes: parseFloat((viRows[0] as any)?.minutes || "0"),
        },
      },
      topCompanies: (topCompanyRows as any[]).map(r => ({
        name: r.name,
        spend: parseFloat(r.total_spend || "0"),
      })),
      trend,
      alerts,
    })
  } catch (error: any) {
    console.error("Platform stats error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

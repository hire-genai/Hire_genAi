import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// Standard "OpenAI cost" expression used everywhere:
//   1. Use real openai_base_cost if recorded
//   2. Otherwise fall back to 70% of customer charge (legacy rows pre-instrumentation)
const OAI_COST = (table: string) => `COALESCE(${table}.openai_base_cost, ${table}.cost * 0.7)`

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = url.searchParams.get("endDate") || new Date().toISOString()
    const startTs = startDate + " 00:00:00"
    const endTs = endDate + " 23:59:59"

    // Total revenue = sum of customer charges across all 3 usage tables
    const revenueRows = await DatabaseService.query(
      `SELECT COALESCE(SUM(cost), 0) as total FROM (
        SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) all_usage`,
      [startTs, endTs]
    )
    const totalRevenue = parseFloat((revenueRows[0] as any)?.total || "0")
    const monthRevenue = totalRevenue

    // Prior-period comparison
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const durationMs = endDateObj.getTime() - startDateObj.getTime()
    const prevStart = new Date(startDateObj.getTime() - durationMs).toISOString().slice(0, 10) + " 00:00:00"
    const prevEnd = new Date(endDateObj.getTime() - durationMs).toISOString().slice(0, 10) + " 23:59:59"
    const lastMonthRows = await DatabaseService.query(
      `SELECT COALESCE(SUM(cost), 0) as total FROM (
        SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) prev_usage`,
      [prevStart, prevEnd]
    )
    const lastMonthRevenue = parseFloat((lastMonthRows[0] as any)?.total || "0")
    const revenueChange = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Total OpenAI expenses (real cost from token usage, with 70% legacy fallback)
    const expenseRows = await DatabaseService.query(
      `SELECT COALESCE(SUM(base_cost), 0) as total FROM (
        SELECT ${OAI_COST("cv_parsing_usage")} as base_cost, created_at FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT ${OAI_COST("question_generation_usage")} as base_cost, created_at FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        UNION ALL
        SELECT ${OAI_COST("video_interview_usage")} as base_cost, created_at FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
       ) all_expenses`,
      [startTs, endTs]
    )
    const totalExpenses = parseFloat((expenseRows[0] as any)?.total || "0")

    // Admin-configured profit margin (informational)
    let profitMarginPercent = 20
    try {
      const marginRows = await DatabaseService.query(
        `SELECT value FROM admin_settings WHERE key = 'profit_margin'`
      )
      if (marginRows.length > 0) {
        profitMarginPercent = parseFloat((marginRows[0] as any).value || "20")
      }
    } catch { /* table may not exist yet */ }

    // Daily trend — includes actual OpenAI cost per day from openai_cost_sync when available
    const trendRows = await DatabaseService.query(
      `SELECT
        d.day::date as date,
        COALESCE(cv.total, 0) + COALESCE(qg.total, 0) + COALESCE(vi.total, 0) as revenue,
        COALESCE(cv.base, 0) + COALESCE(qg.base, 0) + COALESCE(vi.base, 0) as est_cost,
        COALESCE(ocs.actual, 0) as actual_cost
       FROM generate_series($1::date, $2::date, '1 day') as d(day)
       LEFT JOIN (
        SELECT created_at::date as day,
               SUM(cost) as total,
               SUM(${OAI_COST("cv_parsing_usage")}) as base
        FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
        GROUP BY created_at::date
       ) cv ON d.day::date = cv.day
       LEFT JOIN (
        SELECT created_at::date as day,
               SUM(cost) as total,
               SUM(${OAI_COST("question_generation_usage")}) as base
        FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
        GROUP BY created_at::date
       ) qg ON d.day::date = qg.day
       LEFT JOIN (
        SELECT created_at::date as day,
               SUM(cost) as total,
               SUM(${OAI_COST("video_interview_usage")}) as base
        FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
        GROUP BY created_at::date
       ) vi ON d.day::date = vi.day
       LEFT JOIN (
        SELECT date_bucket, SUM(amount_usd) as actual
        FROM openai_cost_sync
        WHERE date_bucket >= $1::date AND date_bucket <= $2::date
        GROUP BY date_bucket
       ) ocs ON d.day::date = ocs.date_bucket
       ORDER BY d.day`,
      [startDate, endDate]
    )
    const trend = (trendRows as any[]).map((r) => {
      const revenue = parseFloat(r.revenue || "0")
      const estCost = parseFloat(r.est_cost || "0")
      const actualCost = parseFloat(r.actual_cost || "0")
      const openaiCost = actualCost > 0 ? actualCost : estCost
      return {
        date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue,
        expenses: estCost,       // kept for backward compat
        actualCost,
        openaiCost,              // actual if synced, else estimated
        profit: revenue - openaiCost,
      }
    })

    // Active alerts
    let alerts: any[] = []
    try {
      const alertRows = await DatabaseService.query(
        `SELECT id, alert_type, severity, title, description, created_at
         FROM admin_alerts
         WHERE status = 'active' AND created_at >= $1 AND created_at <= $2
         ORDER BY created_at DESC LIMIT 10`,
        [startTs, endTs]
      )
      alerts = alertRows as any[]
    } catch { /* may not exist */ }

    // Platform counts
    const companyCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM companies`)
    const userCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM users`)
    const jobCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM job_postings WHERE status = 'open'`)
    const interviewCount = await DatabaseService.query(`SELECT COUNT(*) as count FROM interviews WHERE interview_status = 'Completed'`)
    const newCompanyRows = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM companies WHERE created_at >= $1 AND created_at <= $2`,
      [startTs, endTs]
    )

    // Per-feature profitability — revenue, openai cost, profit, tokens, count
    const cvRows = await DatabaseService.query(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(cost), 0) as revenue,
              COALESCE(SUM(${OAI_COST("cv_parsing_usage")}), 0) as openai_cost,
              COALESCE(SUM(tokens_used), 0) as tokens
       FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2`,
      [startTs, endTs]
    )
    const qgRows = await DatabaseService.query(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(cost), 0) as revenue,
              COALESCE(SUM(${OAI_COST("question_generation_usage")}), 0) as openai_cost,
              COALESCE(SUM(total_tokens), 0) as tokens
       FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2`,
      [startTs, endTs]
    )
    const viRows = await DatabaseService.query(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(cost), 0) as revenue,
              COALESCE(SUM(${OAI_COST("video_interview_usage")}), 0) as openai_cost,
              COALESCE(SUM(tokens_used), 0) as tokens,
              COALESCE(SUM(duration_minutes), 0) as minutes
       FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2`,
      [startTs, endTs]
    )

    const buildFeature = (r: any): {
      count: number; revenue: number; openaiCost: number; profit: number;
      marginPercent: number; tokens: number; minutes: number
    } => {
      const revenue = parseFloat(r?.revenue || "0")
      const cost = parseFloat(r?.openai_cost || "0")
      const profit = revenue - cost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0
      return {
        count: parseInt(r?.count || "0"),
        revenue,
        openaiCost: cost,
        profit,
        marginPercent: margin,
        tokens: parseInt(r?.tokens || "0"),
        minutes: parseFloat(r?.minutes || "0"),
      }
    }

    const featureProfitability = {
      cvParsing: buildFeature(cvRows[0]),
      jdGeneration: buildFeature(qgRows[0]),
      aiInterview: buildFeature(viRows[0]),
    }

    // ─── Per-company profitability (estimated from token usage) ───
    const topCompanyRows = await DatabaseService.query(
      `WITH agg AS (
         SELECT company_id, SUM(cost) as revenue, SUM(openai_cost) as openai_cost, SUM(tokens) as tokens FROM (
           SELECT company_id, cost, ${OAI_COST("cv_parsing_usage")} as openai_cost, COALESCE(tokens_used, 0) as tokens
             FROM cv_parsing_usage WHERE created_at >= $1 AND created_at <= $2
           UNION ALL
           SELECT company_id, cost, ${OAI_COST("question_generation_usage")} as openai_cost, COALESCE(total_tokens, 0) as tokens
             FROM question_generation_usage WHERE created_at >= $1 AND created_at <= $2
           UNION ALL
           SELECT company_id, cost, ${OAI_COST("video_interview_usage")} as openai_cost, COALESCE(tokens_used, 0) as tokens
             FROM video_interview_usage WHERE created_at >= $1 AND created_at <= $2
         ) u
         GROUP BY company_id
       )
       SELECT c.id, c.name, c.openai_project_id, agg.revenue, agg.openai_cost as estimated_openai_cost, agg.tokens
       FROM agg JOIN companies c ON c.id = agg.company_id
       ORDER BY agg.revenue DESC
       LIMIT 20`,
      [startTs, endTs]
    )

    // ─── Actual OpenAI cost per company (from Costs API sync) ───
    // Source of truth: openai_cost_sync table populated by /api/admin/sync-openai-costs
    let actualByCompany: Map<string, number> = new Map()
    let totalActualOpenaiCost = 0
    let lastSyncedAt: string | null = null
    let companiesWithActual = 0
    try {
      const actualRows = (await DatabaseService.query(
        `SELECT company_id, SUM(amount_usd) as actual_cost
         FROM openai_cost_sync
         WHERE company_id IS NOT NULL
           AND date_bucket >= $1::date
           AND date_bucket <= $2::date
         GROUP BY company_id`,
        [startDate, endDate]
      )) as Array<{ company_id: string; actual_cost: string }>
      for (const r of actualRows) {
        const v = parseFloat(r.actual_cost || "0")
        actualByCompany.set(r.company_id, v)
        totalActualOpenaiCost += v
      }
      companiesWithActual = actualByCompany.size

      const syncRows = (await DatabaseService.query(
        `SELECT MAX(synced_at) AS last_synced FROM openai_cost_sync`
      )) as Array<{ last_synced: string | null }>
      lastSyncedAt = syncRows[0]?.last_synced ? new Date(syncRows[0].last_synced).toISOString() : null
    } catch (e) {
      // openai_cost_sync may not exist yet (pre-migration 023) — leave actual empty
      console.warn("[platform-stats] openai_cost_sync unavailable:", (e as any)?.message)
    }

    const topCompanies = (topCompanyRows as any[]).map((r) => {
      const revenue = parseFloat(r.revenue || "0")
      const estimatedCost = parseFloat(r.estimated_openai_cost || "0")
      const actualCost = actualByCompany.get(r.id)
      const hasActual = actualCost !== undefined
      const openaiCost = hasActual ? (actualCost as number) : estimatedCost
      const profit = revenue - openaiCost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0
      return {
        id: r.id,
        name: r.name,
        openaiProjectId: r.openai_project_id || null,
        spend: revenue,
        revenue,
        openaiCost,            // canonical: actual if synced, else estimated
        actualOpenaiCost: hasActual ? actualCost : null,
        estimatedOpenaiCost: estimatedCost,
        costSource: hasActual ? "actual" : "estimated",
        profit,
        marginPercent: margin,
        tokens: parseInt(r.tokens || "0"),
      }
    })

    // Canonical "OpenAI Cost" for top-line KPI: actual when synced, else estimated
    const usesActual = totalActualOpenaiCost > 0
    const canonicalOpenaiCost = usesActual ? totalActualOpenaiCost : totalExpenses
    const canonicalNetProfit = totalRevenue - canonicalOpenaiCost
    const canonicalMargin = totalRevenue > 0 ? (canonicalNetProfit / totalRevenue) * 100 : 0

    return NextResponse.json({
      ok: true,
      kpis: {
        totalRevenue,
        monthRevenue,
        revenueChange,
        // Backward-compat (token-estimated)
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        profitMarginPercent,
        // New: actual OpenAI spend from /v1/organization/costs
        totalActualOpenaiCost,
        totalEstimatedOpenaiCost: totalExpenses,
        // Canonical (actual if available, else estimated) — preferred for headline KPI
        canonicalOpenaiCost,
        canonicalNetProfit,
        canonicalMarginPercent: canonicalMargin,
        costSource: usesActual ? "actual" : "estimated",
        companiesWithActual,
      },
      lastSyncedAt,
      platformStats: {
        companies: parseInt((companyCount[0] as any)?.count || "0"),
        users: parseInt((userCount[0] as any)?.count || "0"),
        openJobs: parseInt((jobCount[0] as any)?.count || "0"),
        completedInterviews: parseInt((interviewCount[0] as any)?.count || "0"),
        newCompanies: parseInt((newCompanyRows[0] as any)?.count || "0"),
      },
      // Backward-compat usageBreakdown shape (used by existing UI sections)
      usageBreakdown: {
        cvParses: {
          count: featureProfitability.cvParsing.count,
          cost: featureProfitability.cvParsing.revenue,
        },
        questions: {
          count: featureProfitability.jdGeneration.count,
          cost: featureProfitability.jdGeneration.revenue,
        },
        videoInterviews: {
          count: featureProfitability.aiInterview.count,
          cost: featureProfitability.aiInterview.revenue,
          minutes: featureProfitability.aiInterview.minutes,
        },
      },
      // New: per-feature Revenue / OpenAI Cost / Profit / Margin
      featureProfitability,
      // Existing field name retained; now enriched with cost/profit/margin
      topCompanies,
      trend,
      alerts,
    })
  } catch (error: any) {
    console.error("Platform stats error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

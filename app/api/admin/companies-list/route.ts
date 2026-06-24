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
    const startDate = url.searchParams.get("startDate") || ""
    const endDate = url.searchParams.get("endDate") || ""

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

    if (startDate) {
      whereClause += ` AND c.created_at >= $${paramIdx}::timestamptz` 
      params.push(startDate + " 00:00:00")
      paramIdx++
    }

    if (endDate) {
      whereClause += ` AND c.created_at <= $${paramIdx}::timestamptz` 
      params.push(endDate + " 23:59:59")
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
        cb.status as billing_status,
        COALESCE(u.user_count, 0) as user_count,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.company_id = c.id) as job_count,
        cs.plan_name,
        cs.status as subscription_status,
        cs.next_billing_time,
        cs.cancel_at_cycle_end,
        COALESCE(est.ai_revenue, 0) as ai_revenue,
        COALESCE(est.estimated_openai_cost, 0) as estimated_openai_cost,
        COALESCE(act.actual_openai_cost, 0) as actual_openai_cost,
        COALESCE(act.token_estimated_cost, 0) as token_estimated_cost
       FROM companies c
       LEFT JOIN company_billing cb ON cb.company_id = c.id
       LEFT JOIN (
        SELECT company_id, COUNT(*) as user_count
        FROM users
        GROUP BY company_id
       ) u ON u.company_id = c.id
       LEFT JOIN LATERAL (
         SELECT plan_name, plan_id, status, next_billing_time, cancel_at_cycle_end, provider
         FROM company_subscriptions cs2
         WHERE cs2.company_id = c.id
         ORDER BY
           CASE WHEN COALESCE(cs2.plan_name, cs2.plan_id, '') <> '' THEN 0 ELSE 1 END,
           CASE cs2.provider WHEN 'razorpay' THEN 0 WHEN 'paypal' THEN 1 ELSE 2 END,
           CASE cs2.status WHEN 'active' THEN 0 WHEN 'authenticated' THEN 1 WHEN 'created' THEN 2 ELSE 3 END
         LIMIT 1
       ) cs ON TRUE
       LEFT JOIN (
         SELECT company_id,
           SUM(cost) as ai_revenue,
           SUM(COALESCE(openai_base_cost, cost * 0.7)) as estimated_openai_cost
         FROM (
           SELECT company_id, cost, openai_base_cost FROM cv_parsing_usage
           UNION ALL
           SELECT company_id, cost, openai_base_cost FROM question_generation_usage
           UNION ALL
           SELECT company_id, cost, openai_base_cost FROM video_interview_usage
         ) usage_all
         GROUP BY company_id
       ) est ON est.company_id = c.id
       LEFT JOIN (
         SELECT company_id,
           SUM(CASE WHEN cost_source = 'costs_api'      THEN amount_usd ELSE 0 END) as actual_openai_cost,
           SUM(CASE WHEN cost_source = 'usage_estimate' THEN amount_usd ELSE 0 END) as token_estimated_cost
         FROM openai_cost_sync
         WHERE company_id IS NOT NULL
         GROUP BY company_id
       ) act ON act.company_id = c.id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    )

    const trialDays = parseInt(process.env.TRIAL_DAYS || "9")
    const now = Date.now()

    const companies = (rows as any[]).map((r) => {
      const createdAt = new Date(r.created_at)
      const daysSinceCreation = Math.floor((now - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const trialDaysLeft = Math.max(0, trialDays - daysSinceCreation)

      return {
        id: r.id,
        name: r.name,
        billingStatus: String(r.billing_status || r.status || "trial"),
        subscriptionStatus: r.subscription_status ?? null,
        planName: r.plan_name || r.plan_id || null,
        trialDaysLeft,
        cancelAtCycleEnd: Boolean(r.cancel_at_cycle_end),
        nextBillingTime: r.next_billing_time ?? null,
        walletBalance: parseFloat(String(r.wallet_balance ?? "0")),
        monthSpent: parseFloat(String(r.month_spent ?? "0")),
        totalSpent: parseFloat(String(r.total_spent ?? "0")),
        userCount: Number(r.user_count ?? 0),
        jobCount: Number(r.job_count ?? 0),
        createdAt: r.created_at,
        aiRevenue: parseFloat(String(r.ai_revenue ?? "0")),
        estimatedOpenaiCost: parseFloat(String(r.estimated_openai_cost ?? "0")),
        actualOpenaiCost: parseFloat(String(r.actual_openai_cost ?? "0")),
        tokenEstimatedCost: parseFloat(String(r.token_estimated_cost ?? "0")),
        // Source priority: actual (Costs API) → token estimate (Usage API) → formula (70%)
        openaiCostSource: parseFloat(String(r.actual_openai_cost ?? "0")) > 0
          ? "actual"
          : parseFloat(String(r.token_estimated_cost ?? "0")) > 0
          ? "usage_estimate"
          : parseFloat(String(r.estimated_openai_cost ?? "0")) > 0
          ? "formula_estimate"
          : "none",
      }
    })

    return NextResponse.json({ ok: true, companies })
  } catch (error: any) {
    console.error("Companies list error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

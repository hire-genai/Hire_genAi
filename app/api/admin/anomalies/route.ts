import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    let alerts: any[] = []

    try {
      const rows = await DatabaseService.query(
        `SELECT id, alert_type, severity, title, description, company_id, status, metadata, created_at, resolved_at
         FROM admin_alerts
         WHERE status = 'active'
         ORDER BY
           CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
           created_at DESC
         LIMIT 50`
      )
      alerts = (rows as any[]).map((r) => ({
        id: r.id,
        alertType: r.alert_type,
        severity: r.severity,
        title: r.title,
        description: r.description,
        companyId: r.company_id,
        status: r.status,
        metadata: r.metadata,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      }))
    } catch {
      // admin_alerts table may not exist yet - return empty
    }

    // Auto-detect anomalies from existing data
    const autoAlerts: any[] = []

    // Check for companies with low wallet balance
    try {
      const lowBalanceRows = await DatabaseService.query(
        `SELECT c.id, c.name, cb.wallet_balance
         FROM company_billing cb
         JOIN companies c ON c.id = cb.company_id
         WHERE cb.wallet_balance < 5 AND cb.wallet_balance >= 0 AND cb.total_spent > 0
         ORDER BY cb.wallet_balance ASC
         LIMIT 10`
      )
      for (const r of lowBalanceRows as any[]) {
        autoAlerts.push({
          id: `auto-low-balance-${r.id}`,
          alertType: "low_balance",
          severity: parseFloat(r.wallet_balance) <= 0 ? "high" : "medium",
          title: `Low wallet balance: ${r.name}`,
          description: `Wallet balance is $${parseFloat(r.wallet_balance).toFixed(2)}`,
          companyId: r.id,
          status: "active",
          metadata: {},
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        })
      }
    } catch { /* ignore */ }

    // Check for usage spikes (companies spending 3x their average in the last 24h)
    try {
      const spikeRows = await DatabaseService.query(
        `WITH daily_spend AS (
          SELECT company_id, SUM(cost) as today_spend
          FROM (
            SELECT company_id, cost FROM cv_parsing_usage WHERE created_at >= NOW() - INTERVAL '24 hours'
            UNION ALL
            SELECT company_id, cost FROM question_generation_usage WHERE created_at >= NOW() - INTERVAL '24 hours'
            UNION ALL
            SELECT company_id, cost FROM video_interview_usage WHERE created_at >= NOW() - INTERVAL '24 hours'
          ) recent
          GROUP BY company_id
        ),
        avg_spend AS (
          SELECT company_id, COALESCE(AVG(daily_total), 0) as avg_daily
          FROM (
            SELECT company_id, created_at::date as day, SUM(cost) as daily_total
            FROM (
              SELECT company_id, cost, created_at FROM cv_parsing_usage WHERE created_at >= NOW() - INTERVAL '30 days'
              UNION ALL
              SELECT company_id, cost, created_at FROM question_generation_usage WHERE created_at >= NOW() - INTERVAL '30 days'
              UNION ALL
              SELECT company_id, cost, created_at FROM video_interview_usage WHERE created_at >= NOW() - INTERVAL '30 days'
            ) monthly
            GROUP BY company_id, created_at::date
          ) daily_totals
          GROUP BY company_id
        )
        SELECT ds.company_id, c.name, ds.today_spend, avs.avg_daily
        FROM daily_spend ds
        JOIN avg_spend avs ON avs.company_id = ds.company_id
        JOIN companies c ON c.id = ds.company_id
        WHERE avs.avg_daily > 0 AND ds.today_spend > avs.avg_daily * 3
        LIMIT 5`
      )
      for (const r of spikeRows as any[]) {
        autoAlerts.push({
          id: `auto-spike-${r.company_id}`,
          alertType: "usage_spike",
          severity: "high",
          title: `Usage spike: ${r.name}`,
          description: `Today's spend ($${parseFloat(r.today_spend).toFixed(2)}) is ${(parseFloat(r.today_spend) / parseFloat(r.avg_daily)).toFixed(1)}x the daily average ($${parseFloat(r.avg_daily).toFixed(2)})`,
          companyId: r.company_id,
          status: "active",
          metadata: {},
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        })
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      alerts: [...alerts, ...autoAlerts],
    })
  } catch (error: any) {
    console.error("Anomalies error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

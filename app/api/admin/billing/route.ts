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
    const page = parseInt(url.searchParams.get("page") || "1")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    // CV Parsing summary
    const cvRows = await DatabaseService.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens
       FROM cv_parsing_usage
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    )
    const cvSummary = cvRows[0] as any

    // Question Generation summary
    const qgRows = await DatabaseService.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(total_tokens), 0) as total_tokens
       FROM question_generation_usage
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    )
    const qgSummary = qgRows[0] as any

    // Video Interview summary
    const viRows = await DatabaseService.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM video_interview_usage
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    )
    const viSummary = viRows[0] as any

    // Usage ledger with company and job names
    const ledgerRows = await DatabaseService.query(
      `SELECT
        ul.id,
        ul.entry_type,
        ul.description,
        ul.quantity,
        ul.unit_price,
        ul.amount,
        ul.balance_before,
        ul.balance_after,
        ul.created_at,
        c.name as company_name,
        jp.title as job_title
       FROM usage_ledger ul
       LEFT JOIN companies c ON c.id = ul.company_id
       LEFT JOIN job_postings jp ON jp.id = ul.job_id
       WHERE ul.created_at >= $1 AND ul.created_at <= $2
       ORDER BY ul.created_at DESC
       LIMIT $3 OFFSET $4`,
      [startDate, endDate, limit, offset]
    )

    const ledgerCountRows = await DatabaseService.query(
      `SELECT COUNT(*) as total FROM usage_ledger WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    )

    const ledger = (ledgerRows as any[]).map((r) => ({
      id: r.id,
      entryType: r.entry_type,
      description: r.description,
      quantity: r.quantity,
      unitPrice: parseFloat(r.unit_price || "0"),
      amount: parseFloat(r.amount || "0"),
      balanceBefore: r.balance_before ? parseFloat(r.balance_before) : null,
      balanceAfter: r.balance_after ? parseFloat(r.balance_after) : null,
      companyName: r.company_name || "Unknown",
      jobTitle: r.job_title || "-",
      createdAt: r.created_at,
    }))

    return NextResponse.json({
      ok: true,
      summary: {
        cvParsing: {
          count: parseInt(cvSummary.count || "0"),
          totalCost: parseFloat(cvSummary.total_cost || "0"),
          totalTokens: parseInt(cvSummary.total_tokens || "0"),
        },
        questionGeneration: {
          count: parseInt(qgSummary.count || "0"),
          totalCost: parseFloat(qgSummary.total_cost || "0"),
          totalTokens: parseInt(qgSummary.total_tokens || "0"),
        },
        videoInterview: {
          count: parseInt(viSummary.count || "0"),
          totalCost: parseFloat(viSummary.total_cost || "0"),
          totalMinutes: parseInt(viSummary.total_minutes || "0"),
        },
      },
      ledger,
      pagination: {
        page,
        limit,
        total: parseInt((ledgerCountRows[0] as any)?.total || "0"),
      },
    })
  } catch (error: any) {
    console.error("Billing error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

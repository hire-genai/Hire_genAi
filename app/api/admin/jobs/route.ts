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
    const companyId = url.searchParams.get("companyId") || "all"
    const format = url.searchParams.get("format") || "json"
    const startDate = url.searchParams.get("startDate") || ""
    const endDate = url.searchParams.get("endDate") || ""

    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIdx = 1

    if (search) {
      whereClause += ` AND (LOWER(jp.title) LIKE $${paramIdx} OR LOWER(c.name) LIKE $${paramIdx})`
      params.push(`%${search.toLowerCase()}%`)
      paramIdx++
    }

    if (companyId !== "all") {
      whereClause += ` AND jp.company_id = $${paramIdx}::uuid`
      params.push(companyId)
      paramIdx++
    }

    if (startDate) {
      whereClause += ` AND jp.created_at >= $${paramIdx}::timestamptz` 
      params.push(startDate + " 00:00:00")
      paramIdx++
    }

    if (endDate) {
      whereClause += ` AND jp.created_at <= $${paramIdx}::timestamptz` 
      params.push(endDate + " 23:59:59")
      paramIdx++
    }

    const rows = await DatabaseService.query(
      `SELECT
        jp.id,
        jp.title,
        jp.status,
        jp.created_at,
        c.id as company_id,
        c.name as company_name,
        COALESCE(app_counts.interview_count, 0) as interview_count,
        COALESCE(all_apps.application_count, 0) as application_count,
        COALESCE(cv_cnt.cv_count, 0) as cv_parsed_count,
        COALESCE(cv_costs.total, 0) as cv_cost,
        COALESCE(qg_costs.total, 0) as questions_cost,
        COALESCE(vi_costs.total, 0) as video_cost
       FROM job_postings jp
       LEFT JOIN companies c ON c.id = jp.company_id
       LEFT JOIN (
        SELECT job_id, COUNT(*) as interview_count
        FROM video_interview_usage
        GROUP BY job_id
       ) app_counts ON app_counts.job_id = jp.id
       LEFT JOIN (
        SELECT job_id, COUNT(*) as application_count
        FROM applications
        GROUP BY job_id
       ) all_apps ON all_apps.job_id = jp.id
       LEFT JOIN (
        SELECT job_id, COUNT(*) as cv_count
        FROM cv_parsing_usage
        GROUP BY job_id
       ) cv_cnt ON cv_cnt.job_id = jp.id
       LEFT JOIN (
        SELECT job_id, SUM(cost) as total FROM cv_parsing_usage GROUP BY job_id
       ) cv_costs ON cv_costs.job_id = jp.id
       LEFT JOIN (
        SELECT job_id, SUM(cost) as total FROM question_generation_usage GROUP BY job_id
       ) qg_costs ON qg_costs.job_id = jp.id
       LEFT JOIN (
        SELECT job_id, SUM(cost) as total FROM video_interview_usage GROUP BY job_id
       ) vi_costs ON vi_costs.job_id = jp.id
       ${whereClause}
       ORDER BY jp.created_at DESC`,
      params
    )

    const jobs = (rows as any[]).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      companyId: r.company_id,
      companyName: r.company_name || "Unknown",
      interviewCount: Number(r.interview_count ?? 0),
      applicationCount: Number(r.application_count ?? 0),
      cvParsedCount: Number(r.cv_parsed_count ?? 0),
      cvCost: parseFloat(r.cv_cost || "0"),
      questionsCost: parseFloat(r.questions_cost || "0"),
      videoCost: parseFloat(r.video_cost || "0"),
      totalCost: parseFloat(r.cv_cost || "0") + parseFloat(r.questions_cost || "0") + parseFloat(r.video_cost || "0"),
      createdAt: r.created_at,
    }))

    // CSV export
    if (format === "csv") {
      const headers = ["Job ID", "Title", "Company", "Status", "Interviews", "CV Cost", "Questions Cost", "Video Cost", "Total Cost"]
      const csvRows = jobs.map((j) => [
        j.id, j.title, j.companyName, j.status, j.interviewCount,
        j.cvCost.toFixed(4), j.questionsCost.toFixed(4), j.videoCost.toFixed(4), j.totalCost.toFixed(4),
      ])
      const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n")
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=jobs-${new Date().toISOString().split("T")[0]}.csv`,
        },
      })
    }

    // Company list for filter dropdown
    const companyRows = await DatabaseService.query(
      `SELECT DISTINCT c.id, c.name
       FROM companies c
       JOIN job_postings jp ON jp.company_id = c.id
       ORDER BY c.name`
    )

    return NextResponse.json({
      ok: true,
      jobs,
      companies: (companyRows as any[]).map((r) => ({ id: r.id, name: r.name })),
    })
  } catch (error: any) {
    console.error("Jobs list error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

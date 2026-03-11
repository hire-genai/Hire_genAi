import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "all"
    const limit = parseInt(searchParams.get("limit") || "100")

    // Updated query to work with recruitment_assessments schema
    let sql = `
      SELECT 
        id,
        name,
        email,
        company,
        phone,
        answers,
        efficiency_score,
        created_at,
        ip_address,
        user_agent
      FROM assessments
      WHERE name IS NOT NULL AND email IS NOT NULL
    `
    const params: any[] = []

    sql += ` ORDER BY created_at DESC LIMIT $1`
    params.push(limit)

    const assessments = await DatabaseService.query(sql, params)

    // Get stats (simplified for recruitment_assessments schema)
    const statsResult = await DatabaseService.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE efficiency_score IS NOT NULL) as completed,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as completed_today
      FROM assessments
      WHERE name IS NOT NULL AND email IS NOT NULL
    `)
    const stats = statsResult[0] as any

    return NextResponse.json({
      success: true,
      assessments: (assessments as any[]).map(a => ({
        id: a.id,
        contactName: a.name,
        contactEmail: a.email,
        contactCompany: a.company,
        contactPhone: a.phone,
        answers: a.answers,
        score: a.efficiency_score,
        createdAt: a.created_at,
        ipAddress: a.ip_address,
        userAgent: a.user_agent,
        // Add status field for UI compatibility (derive from whether score exists)
        status: a.efficiency_score !== null ? 'completed' : 'partial'
      })),
      stats: {
        total: parseInt(stats.total || "0"),
        completed: parseInt(stats.completed || "0"),
        partial: parseInt(stats.total || "0") - parseInt(stats.completed || "0"),
        completedToday: parseInt(stats.completed_today || "0")
      }
    })
  } catch (error: any) {
    console.error("Admin assessments error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

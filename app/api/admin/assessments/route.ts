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

    // Updated query to work with assessments schema
    let sql = `
      SELECT 
        id,
        contact_name,
        contact_email,
        contact_company,
        contact_phone,
        answers,
        score,
        created_at,
        updated_at
      FROM assessments
      WHERE contact_name IS NOT NULL AND contact_email IS NOT NULL
    `
    const params: any[] = []

    sql += ` ORDER BY created_at DESC LIMIT $1`
    params.push(limit)

    const assessments = await DatabaseService.query(sql, params)

    // Get stats (simplified for assessments schema)
    const statsResult = await DatabaseService.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE score IS NOT NULL) as completed,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as completed_today
      FROM assessments
      WHERE contact_name IS NOT NULL AND contact_email IS NOT NULL
    `)
    const stats = statsResult[0] as any

    return NextResponse.json({
      success: true,
      assessments: (assessments as any[]).map(a => ({
        id: a.id,
        contactName: a.contact_name,
        contactEmail: a.contact_email,
        contactCompany: a.contact_company,
        contactPhone: a.contact_phone,
        answers: a.answers,
        score: a.score,
        createdAt: a.created_at,
        // Add status field for UI compatibility (derive from whether score exists)
        status: a.score !== null ? 'completed' : 'partial'
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

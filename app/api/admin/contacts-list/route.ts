import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    let contacts: any[] = []
    let assessments: any[] = []

    // Contact leads (from contact form) - table may not exist
    try {
      const contactRows = await DatabaseService.query(
        `SELECT id, company_name, contact_person, mobile, email, company_size,
                industry, pain_points, budget, timeline, created_at
         FROM contact_leads
         ORDER BY created_at DESC
         LIMIT 50`
      )
      contacts = (contactRows as any[]).map((r) => ({
        id: r.id,
        companyName: r.company_name,
        contactPerson: r.contact_person,
        mobile: r.mobile,
        email: r.email,
        companySize: r.company_size,
        industry: r.industry,
        painPoints: r.pain_points,
        budget: r.budget,
        timeline: r.timeline,
        createdAt: r.created_at,
      }))
    } catch (err) {
      console.log("contact_leads table not found or empty")
    }

    // Recruitment assessments (from questionnaire) - table may not exist
    try {
      const assessmentRows = await DatabaseService.query(
        `SELECT id, name, email, company, phone, efficiency_score, created_at
         FROM recruitment_assessments
         ORDER BY created_at DESC
         LIMIT 50`
      )
      assessments = (assessmentRows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        company: r.company,
        phone: r.phone,
        efficiencyScore: r.efficiency_score,
        createdAt: r.created_at,
      }))
    } catch (err) {
      console.log("recruitment_assessments table not found or empty")
    }

    return NextResponse.json({
      ok: true,
      contacts,
      assessments,
    })
  } catch (error: any) {
    console.error("Contacts list error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, company, phone, answers, efficiencyScore } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!company || !company.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Get IP address and user agent from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || null
    const userAgent = req.headers.get('user-agent') || null

    // Insert into recruitment_assessments table
    const insertQuery = `
      INSERT INTO recruitment_assessments (name, email, company, phone, answers, efficiency_score, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::inet, $8)
      RETURNING id
    `

    const result = await DatabaseService.query(insertQuery, [
      name.trim(),
      email.trim().toLowerCase(),
      company.trim(),
      phone || null,
      JSON.stringify(answers || {}),
      efficiencyScore || null,
      ipAddress,
      userAgent,
    ]) as any[]

    if (result.length === 0) {
      throw new Error('Failed to save assessment')
    }

    console.log(`✅ Assessment saved: ${result[0].id} for ${email}`)

    return NextResponse.json({
      ok: true,
      assessmentId: result[0].id,
      message: 'Assessment saved successfully',
    })
  } catch (error: any) {
    console.error('Error saving assessment:', error)
    return NextResponse.json({
      error: error?.message || 'Failed to save assessment',
    }, { status: 500 })
  }
}

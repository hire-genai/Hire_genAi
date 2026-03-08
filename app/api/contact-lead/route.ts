import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyName,
      contactPerson,
      mobile,
      email,
      companySize,
      industry,
      tools,
      painPoints,
      budget,
      timeline,
    } = body

    // Validate required fields
    if (!companyName || !contactPerson || !mobile || !email || !companySize || !industry) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Ensure table exists
    await DatabaseService.query(`
      CREATE TABLE IF NOT EXISTS contact_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company_size VARCHAR(50) NOT NULL,
        industry VARCHAR(100) NOT NULL,
        tools TEXT[],
        pain_points TEXT,
        budget VARCHAR(100),
        timeline VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, [])

    const result = await DatabaseService.query(
      `INSERT INTO contact_leads
        (company_name, contact_person, mobile, email, company_size, industry, tools, pain_points, budget, timeline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        companyName,
        contactPerson,
        mobile,
        email,
        companySize,
        industry,
        tools && tools.length > 0 ? tools : null,
        painPoints || null,
        budget || null,
        timeline || null,
      ]
    )

    console.log('[ContactLead] Saved lead:', result[0]?.id)

    return NextResponse.json(
      { ok: true, message: 'Lead submitted successfully', id: result[0]?.id },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[ContactLead] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

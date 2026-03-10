import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { calculateLeadScore } from '@/lib/lead-scoring'

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
      monthlyHires,
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

    // Calculate lead score
    const leadScoreResult = calculateLeadScore({
      companySize,
      monthlyHires,
      budget,
      timeline,
    })

    // Ensure table exists with scoring columns
    await DatabaseService.query(`
      CREATE TABLE IF NOT EXISTS contact_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company_size VARCHAR(50) NOT NULL,
        industry VARCHAR(100) NOT NULL,
        monthly_hires VARCHAR(50),
        tools TEXT[],
        pain_points TEXT,
        budget VARCHAR(100),
        timeline VARCHAR(100),
        lead_score INT,
        lead_status VARCHAR(10),
        lead_source VARCHAR(50) DEFAULT 'contact_form',
        score_breakdown JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, [])

    const result = await DatabaseService.query(
      `INSERT INTO contact_leads
        (company_name, contact_person, mobile, email, company_size, industry, monthly_hires, tools, pain_points, budget, timeline, lead_score, lead_status, lead_source, score_breakdown)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        companyName,
        contactPerson,
        mobile,
        email,
        companySize,
        industry,
        monthlyHires || null,
        tools && tools.length > 0 ? tools : null,
        painPoints || null,
        budget || null,
        timeline || null,
        leadScoreResult.score,
        leadScoreResult.status,
        'contact_form',
        JSON.stringify(leadScoreResult.breakdown),
      ]
    )

    console.log('[ContactLead] Saved lead:', result[0]?.id, 'Score:', leadScoreResult.score, 'Status:', leadScoreResult.status)

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

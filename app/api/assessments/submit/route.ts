import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      name,
      email,
      company,
      phone,
      answers,
      efficiencyScore,
    } = body || {}

    // Validate required fields (matching parent project validation)
    if (!name || !email || !company) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, email, and company are required' 
      }, { status: 400 })
    }

    
    // Insert assessment data into database (matching actual assessments schema)
    const insertQuery = `
      INSERT INTO assessments (
        contact_name,
        contact_email,
        contact_company,
        contact_phone,
        answers,
        score,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
      RETURNING id, created_at
    `

    const values = [
      String(name).trim(),
      String(email).toLowerCase().trim(),
      String(company).trim(),
      phone ? String(phone).trim() : null,
      JSON.stringify(answers || {}), // Store answers exactly as received from frontend
      efficiencyScore ? Number(efficiencyScore) : null,
    ]

    const result = await DatabaseService.query(insertQuery, values) as any[]

    const assessmentId = result?.[0]?.id
    const createdAt = result?.[0]?.created_at

    if (!assessmentId) {
      return NextResponse.json({ 
        error: 'Failed to store assessment data' 
      }, { status: 500 })
    }

    console.log(`✅ Assessment submitted: id=${assessmentId}, email=${email}, company=${company}`)

    // Return response matching parent project format
    return NextResponse.json({ 
      ok: true, 
      assessmentId,
      createdAt,
      message: 'Assessment submitted successfully'
    })
  } catch (err: any) {
    console.error('❌ Assessment submit error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Failed to submit assessment' 
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Fetch monthly hiring targets for a company
export async function GET(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    let companyId = searchParams.get('companyId')

    // Fallback to session cookie
    if (!companyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          companyId = session.companyId || session.company?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const result = await DatabaseService.query(
      `SELECT hiring_per_month, team_capacity_per_month
      FROM monthly_hiring_targets 
      WHERE company_id = $1::uuid`,
      [companyId]
    )

    if (result.length === 0) {
      return NextResponse.json({
        targets: {
          hiringPerMonth: '07',
          teamCapacityPerMonth: '07',
        }
      })
    }

    return NextResponse.json({
      targets: {
        hiringPerMonth: result[0].hiring_per_month?.toString().padStart(2, '0') || '07',
        teamCapacityPerMonth: result[0].team_capacity_per_month?.toString().padStart(2, '0') || '07',
      }
    })
  } catch (error: any) {
    console.error('Monthly targets GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch monthly targets' },
      { status: 500 }
    )
  }
}

// POST - Save monthly hiring targets for a company
export async function POST(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json()
    let { companyId, hiringPerMonth, teamCapacityPerMonth } = body

    // Fallback to session cookie
    if (!companyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          companyId = session.companyId || session.company?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Upsert monthly targets
    await DatabaseService.query(
      `INSERT INTO monthly_hiring_targets (
        company_id, hiring_per_month, team_capacity_per_month, updated_at
      ) VALUES ($1::uuid, $2, $3, NOW())
      ON CONFLICT (company_id) 
      DO UPDATE SET 
        hiring_per_month = EXCLUDED.hiring_per_month,
        team_capacity_per_month = EXCLUDED.team_capacity_per_month,
        updated_at = NOW()`,
      [
        companyId,
        hiringPerMonth ? parseInt(hiringPerMonth) : 7,
        teamCapacityPerMonth ? parseInt(teamCapacityPerMonth) : 7,
      ]
    )

    return NextResponse.json({ success: true, message: 'Monthly targets saved successfully' })
  } catch (error: any) {
    console.error('Monthly targets POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save monthly targets' },
      { status: 500 }
    )
  }
}

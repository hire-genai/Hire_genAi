import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Fetch performance settings for a company
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
      `SELECT 
        target_offer_acceptance_rate,
        interview_schedule_sla,
        cost_per_hire_budget,
        job_board_costs,
        cost_currency
      FROM performance_settings 
      WHERE company_id = $1::uuid`,
      [companyId]
    )

    if (result.length === 0) {
      // Return empty settings if none exist
      return NextResponse.json({
        settings: {
          targetOfferAcceptanceRate: '',
          interviewScheduleSLA: '',
          costPerHireBudget: '',
          jobBoardCosts: '',
          costCurrency: 'USD',
        }
      })
    }

    const settings = result[0]
    return NextResponse.json({
      settings: {
        targetOfferAcceptanceRate: settings.target_offer_acceptance_rate?.toString() || '',
        interviewScheduleSLA: settings.interview_schedule_sla?.toString() || '',
        costPerHireBudget: settings.cost_per_hire_budget?.toString() || '',
        jobBoardCosts: settings.job_board_costs?.toString() || '',
        costCurrency: settings.cost_currency || 'USD',
      }
    })
  } catch (error: any) {
    console.error('Performance settings GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch performance settings' },
      { status: 500 }
    )
  }
}

// POST - Save performance settings for a company
export async function POST(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json()
    let { companyId, targetOfferAcceptanceRate, interviewScheduleSLA, costPerHireBudget, jobBoardCosts, costCurrency } = body

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

    // Upsert performance settings
    await DatabaseService.query(
      `INSERT INTO performance_settings (
        company_id, target_offer_acceptance_rate, interview_schedule_sla, 
        cost_per_hire_budget, job_board_costs, cost_currency, updated_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (company_id) 
      DO UPDATE SET 
        target_offer_acceptance_rate = EXCLUDED.target_offer_acceptance_rate,
        interview_schedule_sla = EXCLUDED.interview_schedule_sla,
        cost_per_hire_budget = EXCLUDED.cost_per_hire_budget,
        job_board_costs = EXCLUDED.job_board_costs,
        cost_currency = EXCLUDED.cost_currency,
        updated_at = NOW()`,
      [
        companyId,
        targetOfferAcceptanceRate ? parseFloat(targetOfferAcceptanceRate) : null,
        interviewScheduleSLA ? parseInt(interviewScheduleSLA) : null,
        costPerHireBudget ? parseFloat(costPerHireBudget) : null,
        jobBoardCosts ? parseFloat(jobBoardCosts) : null,
        costCurrency || 'USD',
      ]
    )

    return NextResponse.json({ success: true, message: 'Performance settings saved successfully' })
  } catch (error: any) {
    console.error('Performance settings POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save performance settings' },
      { status: 500 }
    )
  }
}

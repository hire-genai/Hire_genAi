import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company, user } = body

    if (!company?.id || !company?.name) {
      return NextResponse.json({ error: 'Company data required' }, { status: 400 })
    }

    const slug = company.slug || company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // Ensure company exists in database
    try {
      await DatabaseService.query(
        `INSERT INTO companies (id, name, slug, status, verified, created_at)
         VALUES ($1::uuid, $2, $3, 'active', false, NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [company.id, company.name, slug]
      )
      console.log('✅ Company synced to database:', company.name, company.id)
    } catch (companyError: any) {
      // If slug conflict, try without slug
      if (companyError.message?.includes('slug')) {
        try {
          await DatabaseService.query(
            `INSERT INTO companies (id, name, status, verified, created_at)
             VALUES ($1::uuid, $2, 'active', false, NOW())
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
            [company.id, company.name]
          )
        } catch (retryError: any) {
          console.error('Failed to sync company (retry):', retryError.message)
          return NextResponse.json({ error: 'Failed to sync company' }, { status: 500 })
        }
      } else {
        console.error('Failed to sync company:', companyError.message)
        return NextResponse.json({ error: 'Failed to sync company' }, { status: 500 })
      }
    }

    // Ensure user exists in database (if user data provided)
    if (user?.id && user?.email) {
      try {
        await DatabaseService.query(
          `INSERT INTO users (id, company_id, email, full_name, status, created_at)
           VALUES ($1::uuid, $2::uuid, $3, $4, 'active', NOW())
           ON CONFLICT (id) DO UPDATE SET 
             email = EXCLUDED.email, 
             full_name = EXCLUDED.full_name`,
          [user.id, company.id, user.email, user.name || user.email]
        )
        console.log('✅ User synced to database:', user.email, user.id)
      } catch (userError: any) {
        // If email unique conflict, update by email instead
        if (userError.message?.includes('email') || userError.message?.includes('unique')) {
          try {
            await DatabaseService.query(
              `UPDATE users SET id = $1::uuid, company_id = $2::uuid, full_name = $3 WHERE email = $4`,
              [user.id, company.id, user.name || user.email, user.email]
            )
          } catch (retryError: any) {
            console.error('Failed to sync user (retry):', retryError.message)
          }
        } else {
          console.error('Failed to sync user:', userError.message)
          return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
        }
      }
    }

    // Ensure company_billing exists
    try {
      await DatabaseService.query(
        `INSERT INTO company_billing (company_id, wallet_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold, monthly_budget_cap, current_month_spent, total_spent, created_at, updated_at)
         VALUES ($1::uuid, 100.00, true, 50.00, 10.00, 500.00, 0, 0, NOW(), NOW())
         ON CONFLICT (company_id) DO NOTHING`,
        [company.id]
      )
    } catch (billingError: any) {
      console.warn('Billing init warning:', billingError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Sync company error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

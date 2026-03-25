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
      let syncedUserId: string = user.id
      try {
        // Use email as the conflict target — never change an existing user's id
        const userRows = await DatabaseService.query(
          `INSERT INTO users (id, company_id, email, full_name, status, created_at)
           VALUES ($1::uuid, $2::uuid, $3, $4, 'active', NOW())
           ON CONFLICT (email) DO UPDATE SET
             company_id = EXCLUDED.company_id,
             full_name = EXCLUDED.full_name,
             status = 'active'
           RETURNING id`,
          [user.id, company.id, user.email, user.name || user.email]
        ) as any[]
        syncedUserId = userRows[0]?.id || user.id
        console.log('✅ User synced to database:', user.email, syncedUserId)

        // Also sync user role into user_roles table
        if (user.role) {
          try {
            await DatabaseService.query(
              `INSERT INTO user_roles (user_id, role, granted_at)
               VALUES ($1::uuid, $2, NOW())
               ON CONFLICT (user_id, role) DO NOTHING`,
              [syncedUserId, user.role]
            )
            console.log('✅ User role synced:', user.role, 'for user:', syncedUserId)
          } catch (roleError: any) {
            console.warn('⚠️ Could not sync user role (non-critical):', roleError.message)
          }
        }
      } catch (userError: any) {
        console.error('Failed to sync user:', userError.message)
      }
    }

    // Ensure company_billing exists (wallet starts at 0 - only updated after real payment)
    try {
      await DatabaseService.query(
        `INSERT INTO company_billing (company_id, wallet_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold, current_month_spent, total_spent, status, created_at, updated_at)
         VALUES ($1::uuid, 0.00, false, 0.00, 0.00, 0, 0, 'trial', NOW(), NOW())
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

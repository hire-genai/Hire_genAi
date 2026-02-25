import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Fetch agency/client connections for a company
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

    // Fetch agency/client connections
    const connections = await DatabaseService.query(
      `SELECT 
        id, connection_type, name, contact_person, email, rate_type, rate, role, status
      FROM agency_client_connections 
      WHERE company_id = $1::uuid AND status = 'active'
      ORDER BY created_at DESC`,
      [companyId]
    )

    // Fetch monthly hiring targets
    const targets = await DatabaseService.query(
      `SELECT hiring_per_month, team_capacity_per_month
      FROM monthly_hiring_targets 
      WHERE company_id = $1::uuid`,
      [companyId]
    )

    return NextResponse.json({
      connections: connections.map((c: any) => ({
        id: c.id,
        type: c.connection_type,
        name: c.name,
        contact: c.email || c.contact_person,
        rate: c.rate_type === '%' ? `${c.rate}%` : `$${c.rate}`,
        role: c.role || 'Manager',
      })),
      monthlyTargets: targets.length > 0 ? {
        hiringPerMonth: targets[0].hiring_per_month?.toString().padStart(2, '0') || '07',
        teamCapacityPerMonth: targets[0].team_capacity_per_month?.toString().padStart(2, '0') || '07',
      } : {
        hiringPerMonth: '07',
        teamCapacityPerMonth: '07',
      }
    })
  } catch (error: any) {
    console.error('Agency/Client GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch agency/client data' },
      { status: 500 }
    )
  }
}

// POST - Add new agency/client connection
export async function POST(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json()
    let { companyId, type, name, contactPerson, email, rateType, rate, role } = body

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

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const result = await DatabaseService.query(
      `INSERT INTO agency_client_connections (
        company_id, connection_type, name, contact_person, email, rate_type, rate, role
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [companyId, type, name, contactPerson || null, email || null, rateType || 'Fixed', rate || null, role || 'Manager']
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Connection added successfully',
      id: result[0].id
    })
  } catch (error: any) {
    console.error('Agency/Client POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add connection' },
      { status: 500 }
    )
  }
}

// DELETE - Remove agency/client connection
export async function DELETE(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    await DatabaseService.query(
      `UPDATE agency_client_connections SET status = 'inactive', updated_at = NOW() WHERE id = $1::uuid`,
      [connectionId]
    )

    return NextResponse.json({ success: true, message: 'Connection removed successfully' })
  } catch (error: any) {
    console.error('Agency/Client DELETE error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to remove connection' },
      { status: 500 }
    )
  }
}

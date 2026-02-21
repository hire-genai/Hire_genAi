import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { MockAuthService } from "@/lib/mock-auth"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, demo } = await req.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()
    const isDemoMode = Boolean(demo)

    // Check if database is configured
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, using MockAuthService for login verification')
      
      // Use MockAuthService as fallback
      const users = MockAuthService.getUsers()
      const user = users.find(u => u.email === normEmail)
      
      if (!user) {
        return NextResponse.json({ error: 'User does not exist. Please sign up first before trying to login.' }, { status: 400 })
      }

      // For mock service, accept any 6-digit OTP in development
      if (process.env.NODE_ENV === 'development' && !/^\d{6}$/.test(otp)) {
        return NextResponse.json({ error: 'Invalid OTP format. Please enter a 6-digit code.' }, { status: 400 })
      }

      // Create mock session using MockAuthService
      const session = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        company: user.company,
      }

      MockAuthService.setSessionFromServer(session.user, session.company)

      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.name,
          status: 'active',
          role: user.role,
        },
        company: {
          id: user.company.id,
          name: user.company.name,
          status: 'active',
          verified: false,
        },
        debug: {
          usingMockService: true
        }
      })
    }

    // Use database service
    await DatabaseService.verifyOtpChallenge(normEmail, otp, 'login')

    if (isDemoMode) {
      // Demo mode: Add user to demo company
      const { user, company, isNewUser } = await DatabaseService.addUserToDemoCompany(normEmail)

      // Create session for demo user
      const { session, refreshToken } = await DatabaseService.createSession('user', user.id)

      // Fetch role for demo user
      let demoUserRole: string | undefined
      try {
        const roleRows = await DatabaseService.query(
          `SELECT role FROM user_roles WHERE user_id = $1::uuid ORDER BY granted_at DESC LIMIT 1`,
          [user.id]
        ) as any[]
        demoUserRole = roleRows[0]?.role
      } catch (e) {
        console.log('Could not fetch demo user role:', e)
      }

      console.log(`🎯 Demo login successful for ${normEmail} - ${isNewUser ? 'New' : 'Existing'} user in demo company`)

      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          status: user.status,
          role: demoUserRole,
        },
        company: {
          id: company.id,
          name: company.name,
          status: company.status,
          verified: company.verified,
        },
        session: {
          id: session.id,
          refreshToken,
          expiresAt: session.expires_at,
        },
        debug: {
          isDemoMode: true,
          isNewUser,
          demoCompany: company.name
        }
      })
    } else {
      // Regular login mode - user must be registered under the company matching their email domain
      const user = await DatabaseService.findUserByEmailAndCompanyDomain(normEmail)
      if (!user) {
        return NextResponse.json({ error: 'User does not exist. Please sign up first before trying to login.' }, { status: 400 })
      }

      // Fetch user role from user_roles table
      let userRole: string | undefined
      try {
        const roleRows = await DatabaseService.query(
          `SELECT role FROM user_roles WHERE user_id = $1::uuid ORDER BY granted_at DESC LIMIT 1`,
          [user.id]
        ) as any[]
        userRole = roleRows[0]?.role
      } catch (e) {
        console.log('Could not fetch user role:', e)
      }

      // Create session
      const { session, refreshToken } = await DatabaseService.createSession('user', user.id)

      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          status: user.status,
          role: userRole,
        },
        company: {
          id: user.companies.id,
          name: user.companies.name,
          status: user.companies.status,
          verified: user.companies.verified,
        },
        session: {
          id: session.id,
          refreshToken,
          expiresAt: session.expires_at,
        },
        debug: {
          isDemoMode: false
        }
      })
    }
  } catch (error: any) {
    console.error('Error verifying login OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to verify login OTP' 
    }, { status: 500 })
  }
}

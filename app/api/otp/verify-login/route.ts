import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { MockAuthService } from "@/lib/mock-auth"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()

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
      // Regular login mode - try to find user by email domain first, then fallback to direct email lookup
      let user = await DatabaseService.findUserByEmailAndCompanyDomain(normEmail)
      
      // Fallback: If domain-based lookup fails, try finding user directly by email
      if (!user) {
        try {
          const directUserQuery = `
            SELECT u.*, c.*, ur.role
            FROM users u
            JOIN companies c ON u.company_id = c.id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.email = $1 AND u.status = 'active'
            LIMIT 1
          `
          const directUsers = await DatabaseService.query(directUserQuery, [normEmail.toLowerCase()]) as any[]
          
          if (directUsers.length > 0) {
            user = {
              ...directUsers[0],
              companies: {
                id: directUsers[0].id,
                name: directUsers[0].name,
                status: directUsers[0].status,
                verified: directUsers[0].verified
              }
            }
            console.log(`✅ Found user by direct email lookup for verification: ${normEmail}`)
          }
        } catch (directError) {
          console.error('Direct user lookup failed during verification:', directError)
        }
      }
      
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
      })
  } catch (error: any) {
    console.error('Error verifying login OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to verify login OTP' 
    }, { status: 500 })
  }
}

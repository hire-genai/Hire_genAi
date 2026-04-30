import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { MockAuthService } from "@/lib/mock-auth"
import { OtpEmailService } from "@/lib/otp-email-service"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()

    // Check if database is configured
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, using MockAuthService for login OTP')
      
      // Use MockAuthService as fallback
      const users = MockAuthService.getUsers()
      const user = users.find(u => u.email === normEmail)
      
      if (!user) {
        return NextResponse.json({ error: 'User does not exist. Please sign up first before trying to login.' }, { status: 400 })
      }

      // Generate a mock OTP for development
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Send OTP via email (mock service fallback)
      try {
        await OtpEmailService.sendLoginOtp({
          email: normEmail,
          otp,
        });
        console.log(`✅ Mock login OTP sent via email to: ${normEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send mock OTP email:', emailError);
        // Fallback to console log
        console.log('\n' + '='.repeat(50))
        console.log('🔐 MOCK OTP GENERATED FOR LOGIN')
        console.log('='.repeat(50))
        console.log(`📧 Email: ${normEmail}`)
        console.log(`🔢 OTP: ${otp}`)
        console.log('🎯 Purpose: login')
        console.log('='.repeat(50) + '\n')
      }

      return NextResponse.json({ 
        ok: true, 
        message: 'Login OTP sent successfully (using mock service)',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        debug: { 
          usingMockService: true, 
          email: normEmail, 
          purpose: 'login',
          userId: user.id
        }
      })
    }

    // Use database service
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
            console.log(`✅ Found user by direct email lookup: ${normEmail}`)
          }
        } catch (directError) {
          console.error('Direct user lookup failed:', directError)
        }
      }
      
      if (!user) {
        return NextResponse.json({ error: 'User does not exist. Please sign up first before trying to login.' }, { status: 400 })
      }

      // Clean up any existing challenges for this email to prevent conflicts
      try {
        await DatabaseService.cleanupExpiredChallenges(normEmail);
      } catch (cleanupError) {
        console.log("Note: Could not cleanup old challenges, continuing...");
      }

      // Create OTP challenge for regular login
      const { challenge, code } = await DatabaseService.createOtpChallenge(
        normEmail, 
        'login', 
        'user', 
        user.id
      )

      // Send OTP via email for regular login
      try {
        await OtpEmailService.sendLoginOtp({
          email: normEmail,
          otp: code,
        });
        console.log(`✅ Regular login OTP sent via email to: ${normEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send login OTP email:', emailError);
        // Continue with response even if email fails (fallback to console log)
        console.log('\n' + '='.repeat(50))
        console.log('🔐 REGULAR LOGIN OTP (EMAIL FAILED - CONSOLE FALLBACK)')
        console.log('='.repeat(50))
        console.log(`📧 Email: ${normEmail}`)
        console.log(`🔢 OTP: ${code}`)
        console.log(`🎯 Purpose: login`)
        console.log('='.repeat(50) + '\n')
      }

      return NextResponse.json({ 
        ok: true, 
        message: 'Login OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? code : undefined,
        debug: { 
          usingDatabase: true, 
          email: normEmail, 
          purpose: 'login',
          challengeId: challenge.id,
          userId: user.id
        }
      })
  } catch (error: any) {
    console.error('Error sending login OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to send login OTP' 
    }, { status: 500 })
  }
}

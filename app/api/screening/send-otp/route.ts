import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { OtpEmailService } from '@/lib/otp-email-service'

export const dynamic = 'force-dynamic'

// POST - Send OTP for candidate email verification during screening
export async function POST(request: NextRequest) {
  try {
    const { email, candidateName, jobTitle } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    if (!candidateName || !candidateName.trim()) {
      return NextResponse.json(
        { error: 'Candidate name is required' },
        { status: 400 }
      )
    }

    const normEmail = String(email).trim().toLowerCase()

    // Clean up any expired challenges for this email
    try {
      await DatabaseService.cleanupExpiredChallenges(normEmail)
    } catch (cleanupError) {
      console.log('Note: Could not cleanup old challenges, continuing...')
    }

    // Create OTP challenge using existing infrastructure
    // Using 'email_verification' purpose from otp_purpose enum
    const { challenge, code } = await DatabaseService.createOtpChallenge(
      normEmail,
      'email_verification',
      'user',
      undefined
    )

    // Send OTP via email
    try {
      await OtpEmailService.sendScreeningOtp({
        email: normEmail,
        candidateName: candidateName.trim(),
        otp: code,
        jobTitle: jobTitle || undefined,
      })
      console.log(`✅ Screening OTP sent via email to: ${normEmail}`)
    } catch (emailError) {
      console.error('❌ Failed to send screening OTP email:', emailError)
      // Fallback to console log in development
      console.log('\n' + '='.repeat(50))
      console.log('🔐 SCREENING OTP (EMAIL FAILED - CONSOLE FALLBACK)')
      console.log('='.repeat(50))
      console.log(`📧 Email: ${normEmail}`)
      console.log(`🔢 OTP: ${code}`)
      console.log(`👤 Name: ${candidateName}`)
      console.log('='.repeat(50) + '\n')
    }

    return NextResponse.json({
      ok: true,
      message: 'Verification code sent to your email',
      otp: process.env.NODE_ENV === 'development' ? code : undefined,
      debug: {
        email: normEmail,
        purpose: 'email_verification',
        challengeId: challenge.id,
      }
    })
  } catch (error: any) {
    console.error('Error sending screening OTP:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send verification code' },
      { status: 500 }
    )
  }
}

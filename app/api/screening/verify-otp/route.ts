import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST - Verify OTP for candidate email during screening
export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    const normEmail = String(email).trim().toLowerCase()
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex')

    // Find valid OTP challenge for email_verification purpose
    const checkOtpQuery = `
      SELECT * FROM otp_challenges 
      WHERE email = $1 
        AND code_hash = $2 
        AND purpose = 'email_verification'
        AND expires_at > NOW()
        AND consumed_at IS NULL
        AND tries_used < max_tries
      LIMIT 1
    `
    const otpCheck = await DatabaseService.query(checkOtpQuery, [normEmail, codeHash]) as any[]

    if (otpCheck.length === 0) {
      // Increment tries for failed attempts
      const incrementTriesQuery = `
        UPDATE otp_challenges 
        SET tries_used = tries_used + 1 
        WHERE email = $1 
          AND purpose = 'email_verification'
          AND consumed_at IS NULL
          AND expires_at > NOW()
      `
      await DatabaseService.query(incrementTriesQuery, [normEmail])

      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark OTP as consumed
    const consumeOtpQuery = `
      UPDATE otp_challenges 
      SET consumed_at = NOW() 
      WHERE id = $1::uuid
    `
    await DatabaseService.query(consumeOtpQuery, [otpCheck[0].id])

    return NextResponse.json({
      ok: true,
      verified: true,
      message: 'Email verified successfully'
    })
  } catch (error: any) {
    console.error('Error verifying screening OTP:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to verify code' },
      { status: 500 }
    )
  }
}

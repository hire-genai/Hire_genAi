import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, purpose } = await req.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex')
    const otpPurpose = purpose || 'signup'

    // Check if OTP exists and is valid (don't consume it yet)
    const checkOtpQuery = `
      SELECT * FROM otp_challenges 
      WHERE email = $1 
        AND code_hash = $2 
        AND purpose = $3
        AND expires_at > NOW()
        AND consumed_at IS NULL
        AND tries_used < max_tries
      LIMIT 1
    `
    const otpCheck = await DatabaseService.query(checkOtpQuery, [normEmail, codeHash, otpPurpose]) as any[]
    
    if (otpCheck.length === 0) {
      // Check why OTP failed - is it expired, wrong code, or too many tries?
      const checkExistingQuery = `
        SELECT *, 
          CASE WHEN expires_at <= NOW() THEN true ELSE false END as is_expired,
          CASE WHEN tries_used >= max_tries THEN true ELSE false END as max_tries_exceeded
        FROM otp_challenges 
        WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      `
      const existingOtp = await DatabaseService.query(checkExistingQuery, [normEmail, otpPurpose]) as any[]
      
      if (existingOtp.length === 0) {
        return NextResponse.json({ 
          error: 'No OTP found. Please request a new verification code.' 
        }, { status: 400 })
      }
      
      const otpRecord = existingOtp[0]
      
      if (otpRecord.is_expired) {
        return NextResponse.json({ 
          error: 'OTP has expired. Please request a new verification code.' 
        }, { status: 400 })
      }
      
      if (otpRecord.max_tries_exceeded) {
        return NextResponse.json({ 
          error: 'Too many incorrect attempts. Please request a new verification code.' 
        }, { status: 400 })
      }
      
      // It's an incorrect OTP - increment tries
      const incrementTriesQuery = `
        UPDATE otp_challenges 
        SET tries_used = tries_used + 1 
        WHERE id = $1::uuid
        RETURNING tries_used, max_tries
      `
      const updatedOtp = await DatabaseService.query(incrementTriesQuery, [otpRecord.id]) as any[]
      const remainingTries = updatedOtp[0].max_tries - updatedOtp[0].tries_used
      
      if (remainingTries <= 0) {
        return NextResponse.json({ 
          error: 'Incorrect OTP. No attempts remaining. Please request a new code.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: `Incorrect OTP. ${remainingTries} attempt${remainingTries === 1 ? '' : 's'} remaining.` 
      }, { status: 400 })
    }

    // OTP is valid - return success (don't consume yet, that happens in signup/complete)
    return NextResponse.json({
      ok: true,
      message: 'OTP verified successfully',
      valid: true
    })
  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to verify OTP' 
    }, { status: 500 })
  }
}

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
      // Increment tries for failed attempts
      const incrementTriesQuery = `
        UPDATE otp_challenges 
        SET tries_used = tries_used + 1 
        WHERE email = $1 
          AND purpose = $2
          AND consumed_at IS NULL
          AND expires_at > NOW()
      `
      await DatabaseService.query(incrementTriesQuery, [normEmail, otpPurpose])
      
      return NextResponse.json({ 
        error: 'Invalid or expired OTP code' 
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

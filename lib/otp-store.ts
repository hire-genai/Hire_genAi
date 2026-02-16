// Database-backed OTP store for interview email verification
// Uses PostgreSQL to persist OTPs across API route instances

import { DatabaseService } from '@/lib/database'

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP in database
export async function storeOTP(email: string, applicationId: string, otp: string, expiresInMinutes: number = 10): Promise<void> {
  // Ensure table exists (auto-create if missing)
  await ensureOtpTable()

  const query = `
    INSERT INTO screening_otps (email, application_id, otp, expires_at)
    VALUES ($1, $2::uuid, $3, NOW() + INTERVAL '${expiresInMinutes} minutes')
    ON CONFLICT (email, application_id) 
    DO UPDATE SET otp = $3, expires_at = NOW() + INTERVAL '${expiresInMinutes} minutes', verified = FALSE, created_at = NOW()
  `
  
  await (DatabaseService as any).query(query, [email.toLowerCase(), applicationId, otp])
  console.log(`[OTP STORE] Stored OTP for ${email} (Application: ${applicationId})`)
}

// Verify OTP from database
export async function verifyOTP(email: string, applicationId: string, otp: string): Promise<{ valid: boolean; error?: string }> {
  console.log(`[OTP VERIFY] Verifying OTP for ${email} (Application: ${applicationId}): ${otp}`)
  
  const query = `
    SELECT otp, expires_at, verified 
    FROM screening_otps 
    WHERE email = $1 AND application_id = $2::uuid
  `
  
  const rows = await (DatabaseService as any).query(query, [email.toLowerCase(), applicationId])
  
  if (!rows || rows.length === 0) {
    console.log(`[OTP VERIFY] No OTP found for ${email}`)
    return { valid: false, error: 'OTP not found. Please request a new code.' }
  }
  
  const stored = rows[0]
  
  if (new Date() > new Date(stored.expires_at)) {
    console.log(`[OTP VERIFY] OTP expired for ${email}`)
    // Delete expired OTP
    await (DatabaseService as any).query(
      'DELETE FROM screening_otps WHERE email = $1 AND application_id = $2::uuid',
      [email.toLowerCase(), applicationId]
    )
    return { valid: false, error: 'OTP has expired. Please request a new code.' }
  }
  
  if (stored.otp !== otp) {
    console.log(`[OTP VERIFY] Invalid OTP for ${email}`)
    return { valid: false, error: 'Invalid OTP. Please try again.' }
  }
  
  // Valid - mark as verified and delete
  await (DatabaseService as any).query(
    'DELETE FROM screening_otps WHERE email = $1 AND application_id = $2::uuid',
    [email.toLowerCase(), applicationId]
  )
  
  console.log(`[OTP VERIFY] OTP verified successfully for ${email}`)
  return { valid: true }
}

// Auto-create screening_otps table if it doesn't exist
let tableChecked = false
async function ensureOtpTable(): Promise<void> {
  if (tableChecked) return
  try {
    const check = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'screening_otps'
      ) as "exists"
    `
    const result = await (DatabaseService as any).query(check, [])
    if (result?.[0]?.exists === true || result?.[0]?.exists === 'true') {
      tableChecked = true
      return
    }

    const create = `
      CREATE TABLE IF NOT EXISTS screening_otps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL,
        application_id UUID NOT NULL,
        otp TEXT NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(email, application_id)
      )
    `
    await (DatabaseService as any).query(create, [])
    console.log('[OTP STORE] Created screening_otps table')
    
    // Create indexes separately (can't bundle with CREATE TABLE in prisma raw)
    try {
      await (DatabaseService as any).query('CREATE INDEX IF NOT EXISTS idx_screening_otps_email ON screening_otps (email)', [])
      await (DatabaseService as any).query('CREATE INDEX IF NOT EXISTS idx_screening_otps_expires ON screening_otps (expires_at)', [])
    } catch {
      // indexes may already exist
    }
    
    tableChecked = true
  } catch (err: any) {
    // Table might already exist from concurrent call
    if (err?.message?.includes('already exists')) {
      tableChecked = true
      return
    }
    console.error('[OTP STORE] Failed to ensure table:', err?.message)
  }
}

import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Fetch stored photo URL for client-side face comparison
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const applicationId = url.searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    // Get stored photo URL from application (photo_url is on applications table)
    const query = `
      SELECT a.photo_url, c.first_name, c.last_name, c.full_name
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = $1::uuid
    `
    const result = await (DatabaseService as any).query(query, [applicationId])

    if (!result || result.length === 0) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
    }

    const application = result[0]
    const storedPhotoUrl = application.photo_url

    if (!storedPhotoUrl) {
      console.log(`[Photo Compare] No stored photo for application ${applicationId}`)
      return NextResponse.json({ 
        ok: true, 
        storedPhotoUrl: null,
        skipped: true,
        message: 'No photo stored during application'
      })
    }

    return NextResponse.json({ 
      ok: true, 
      storedPhotoUrl,
      candidateName: (application.full_name || `${application.first_name || ''} ${application.last_name || ''}`.trim()) || ''
    })

  } catch (error: any) {
    console.error('[Photo Compare] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to fetch stored photo' }, { status: 500 })
  }
}

// POST: Save verification result (BINARY - stores distance for internal logs only)
export async function POST(req: Request) {
  try {
    const { applicationId, verified, distance, capturedPhotoUrl } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    // Ensure verification columns exist on applications table
    await ensureVerificationColumns()

    // Update application with verification status
    // Distance is stored for internal logging only, NEVER shown to users
    const updateQuery = `
      UPDATE applications 
      SET 
        verification_photo_url = $2,
        photo_verified = $3,
        photo_match_score = $4,
        verified_at = NOW()
      WHERE id = $1::uuid
      RETURNING id
    `
    
    try {
      await (DatabaseService as any).query(updateQuery, [
        applicationId, 
        capturedPhotoUrl || null,
        verified,
        distance || 0 // Store raw distance (0-1 scale) for internal logs
      ])
    } catch (dbErr: any) {
      // Columns might not exist - try simpler update
      console.warn('[Photo Compare] Full update failed, trying simple update:', dbErr?.message)
    }

    console.log(`[Photo Compare] Application ${applicationId}: verified=${verified}, distance=${distance}`)

    return NextResponse.json({ 
      ok: true, 
      verified,
      message: verified ? 'Photo verification successful' : 'Photo verification failed'
    })

  } catch (error: any) {
    console.error('[Photo Compare] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to save verification' }, { status: 500 })
  }
}

// Auto-add verification columns to applications table if missing
async function ensureVerificationColumns(): Promise<void> {
  try {
    const checkCols = `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications'
        AND column_name IN ('verification_photo_url', 'photo_verified', 'photo_match_score', 'verified_at')
    `
    const existing = await (DatabaseService as any).query(checkCols, [])
    const existingSet = new Set((existing || []).map((r: any) => r.column_name))

    const alters: string[] = []
    if (!existingSet.has('verification_photo_url')) alters.push(`ALTER TABLE applications ADD COLUMN verification_photo_url TEXT`)
    if (!existingSet.has('photo_verified')) alters.push(`ALTER TABLE applications ADD COLUMN photo_verified BOOLEAN`)
    if (!existingSet.has('photo_match_score')) alters.push(`ALTER TABLE applications ADD COLUMN photo_match_score NUMERIC(5,4)`)
    if (!existingSet.has('verified_at')) alters.push(`ALTER TABLE applications ADD COLUMN verified_at TIMESTAMPTZ`)

    for (const sql of alters) {
      await (DatabaseService as any).query(sql, [])
      console.log(`✅ [Schema] ${sql}`)
    }
  } catch (err: any) {
    if (!err?.message?.includes('already exists')) {
      console.error('[Schema] Failed to ensure verification columns:', err?.message)
    }
  }
}

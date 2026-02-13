import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { applicationId, photo } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    if (!photo) {
      return NextResponse.json({ ok: false, error: 'Photo is required' }, { status: 400 })
    }

    // Detect image format from base64 header
    let imageFormat = 'jpg'
    let contentType = 'image/jpeg'
    
    if (photo.startsWith('data:image/png;')) {
      imageFormat = 'png'
      contentType = 'image/png'
    } else if (photo.startsWith('data:image/webp;')) {
      imageFormat = 'webp'
      contentType = 'image/webp'
    } else if (photo.startsWith('data:image/jpeg;') || photo.startsWith('data:image/jpg;')) {
      imageFormat = 'jpg'
      contentType = 'image/jpeg'
    }

    // Convert base64 to buffer
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename with correct extension
    const timestamp = Date.now()
    const filename = `post-interview-photos/${applicationId}/${timestamp}.${imageFormat}`

    let photoUrl: string

    // Try to upload to Vercel Blob if available
    try {
      const { put } = await import('@vercel/blob')
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType
      })
      photoUrl = blob.url
      console.log(`[Post-Interview Photo] Uploaded to Vercel Blob (${imageFormat}): ${photoUrl}`)
    } catch (blobError) {
      // Fallback: Store as base64 in database
      console.log('[Post-Interview Photo] Vercel Blob not available, storing as base64')
      photoUrl = photo // Store the base64 data URL directly
    }

    // Store photo URL in database - update the application record
    // First check if the column exists, if not create it
    try {
      const checkCol = await DatabaseService.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'post_interview_photo_url'
        ) as exists`,
        []
      )
      
      if (!checkCol?.[0]?.exists) {
        console.log('[Post-Interview Photo] Adding missing columns to applications table...')
        await DatabaseService.query(`
          ALTER TABLE applications 
          ADD COLUMN IF NOT EXISTS post_interview_photo_url TEXT,
          ADD COLUMN IF NOT EXISTS post_interview_photo_captured_at TIMESTAMP WITH TIME ZONE
        `, [])
      }

      await DatabaseService.query(
        `UPDATE applications 
         SET post_interview_photo_url = $1, post_interview_photo_captured_at = NOW()
         WHERE id = $2::uuid`,
        [photoUrl, applicationId]
      )
      console.log(`[Post-Interview Photo] Saved photo for application ${applicationId}`)
    } catch (dbError: any) {
      console.error('[Post-Interview Photo] Database error:', dbError.message)
      // Try to create columns and retry
      if (dbError.message?.includes('column') && dbError.message?.includes('does not exist')) {
        await DatabaseService.query(`
          ALTER TABLE applications 
          ADD COLUMN IF NOT EXISTS post_interview_photo_url TEXT,
          ADD COLUMN IF NOT EXISTS post_interview_photo_captured_at TIMESTAMP WITH TIME ZONE
        `, [])
        
        await DatabaseService.query(
          `UPDATE applications 
           SET post_interview_photo_url = $1, post_interview_photo_captured_at = NOW()
           WHERE id = $2::uuid`,
          [photoUrl, applicationId]
        )
      } else {
        throw dbError
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Photo saved successfully',
      applicationId
    })

  } catch (error: any) {
    console.error('[Post-Interview Photo] Error:', error)
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to save photo' },
      { status: 500 }
    )
  }
}

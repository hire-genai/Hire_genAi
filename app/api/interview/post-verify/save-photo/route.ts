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
    
    console.log(`[Post-Interview Photo] Photo size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`)

    // Generate unique filename with correct extension
    const timestamp = Date.now()
    const filename = `post-interview-photos/${applicationId}/${timestamp}.${imageFormat}`

    let photoUrl: string
    let uploadedToBlob = false

    // Try to upload to Vercel Blob if available
    try {
      const { put } = await import('@vercel/blob')
      console.log(`[Post-Interview Photo] Attempting to upload to Vercel Blob: ${filename}`)
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType
      })
      photoUrl = blob.url
      uploadedToBlob = true
      console.log(`[Post-Interview Photo] ✅ Successfully uploaded to Vercel Blob: ${photoUrl}`)
    } catch (blobError: any) {
      // Fallback: Store as base64 in database
      console.error('[Post-Interview Photo] ❌ Vercel Blob upload failed:', {
        message: blobError?.message,
        code: blobError?.code,
        status: blobError?.status,
        details: blobError?.toString()
      })
      console.log('[Post-Interview Photo] Falling back to database storage')
      
      // Store a reference instead of full base64 to avoid size issues
      // We'll store the base64 in a separate table or use a different approach
      photoUrl = `data:${contentType};base64,${base64Data.substring(0, 100)}...` // Truncated for DB storage
    }

    // Store photo URL in database - update the interviews record
    try {
      // If not uploaded to blob, store in separate table
      if (!uploadedToBlob) {
        console.log('[Post-Interview Photo] Creating photo_storage table for base64 storage...')
        try {
          await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS photo_storage (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              application_id UUID NOT NULL,
              photo_data BYTEA NOT NULL,
              content_type VARCHAR(50),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `, [])
        } catch (e) {
          console.log('[Post-Interview Photo] photo_storage table already exists')
        }

        // Store the binary data instead of base64
        const photoId = await DatabaseService.query(
          `INSERT INTO photo_storage (application_id, photo_data, content_type)
           VALUES ($1::uuid, $2, $3)
           RETURNING id`,
          [applicationId, buffer, contentType]
        ) as any[]

        if (photoId && photoId.length > 0) {
          photoUrl = `db://photo_storage/${photoId[0].id}`
          console.log(`[Post-Interview Photo] Stored photo in database with ID: ${photoId[0].id}`)
        }
      }

      // Ensure interview record exists, then save photo reference
      await DatabaseService.ensureInterviewRecord(applicationId)
      await DatabaseService.query(
        `UPDATE interviews 
         SET post_interview_photo_url = $1, post_interview_photo_captured_at = NOW()
         WHERE application_id = $2::uuid`,
        [photoUrl, applicationId]
      )
      console.log(`[Post-Interview Photo] ✅ Saved photo reference for application ${applicationId}`)
    } catch (dbError: any) {
      console.error('[Post-Interview Photo] Database error:', dbError.message)
      throw dbError
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Photo saved successfully',
      applicationId,
      uploadedToBlob
    })

  } catch (error: any) {
    console.error('[Post-Interview Photo] Error:', error)
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to save photo' },
      { status: 500 }
    )
  }
}

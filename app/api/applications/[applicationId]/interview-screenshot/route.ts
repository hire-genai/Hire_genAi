import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params
    const { screenshot } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    if (!screenshot) {
      return NextResponse.json({ ok: false, error: 'Screenshot is required' }, { status: 400 })
    }

    console.log(`[Interview Screenshot] Saving during_interview screenshot for application ${applicationId}`)

    // Detect image format from base64 header
    let imageFormat = 'jpg'
    let contentType = 'image/jpeg'
    
    if (screenshot.startsWith('data:image/png;')) {
      imageFormat = 'png'
      contentType = 'image/png'
    } else if (screenshot.startsWith('data:image/webp;')) {
      imageFormat = 'webp'
      contentType = 'image/webp'
    } else if (screenshot.startsWith('data:image/jpeg;') || screenshot.startsWith('data:image/jpg;')) {
      imageFormat = 'jpg'
      contentType = 'image/jpeg'
    }

    // Convert base64 to buffer
    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename with correct extension
    const timestamp = Date.now()
    const filename = `interview-screenshots/${applicationId}/during-${timestamp}.${imageFormat}`

    let screenshotUrl: string

    // Try to upload to Vercel Blob if available
    try {
      const { put } = await import('@vercel/blob')
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType
      })
      screenshotUrl = blob.url
      console.log(`[Interview Screenshot] Uploaded to Vercel Blob (${imageFormat}): ${screenshotUrl}`)
    } catch (blobError) {
      // Fallback: Store as base64 in database
      console.log('[Interview Screenshot] Vercel Blob not available, storing as base64')
      screenshotUrl = screenshot
    }

    // First ensure the columns exist
    try {
      const checkCol = await DatabaseService.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'during_interview_screenshot'
        ) as exists`,
        []
      )
      
      if (!checkCol?.[0]?.exists) {
        console.log('[Interview Screenshot] Adding missing columns to applications table...')
        await DatabaseService.query(`
          ALTER TABLE applications 
          ADD COLUMN IF NOT EXISTS during_interview_screenshot TEXT,
          ADD COLUMN IF NOT EXISTS during_interview_screenshot_captured_at TIMESTAMP WITH TIME ZONE
        `, [])
      }
    } catch (colErr) {
      console.warn('[Interview Screenshot] Column check failed:', colErr)
    }

    // Update the application with the screenshot
    try {
      await DatabaseService.query(
        `UPDATE applications 
         SET during_interview_screenshot = $1, during_interview_screenshot_captured_at = NOW()
         WHERE id = $2::uuid`,
        [screenshotUrl, applicationId]
      )
      console.log(`[Interview Screenshot] Saved during_interview screenshot for application ${applicationId}`)
    } catch (dbError: any) {
      console.error('[Interview Screenshot] Database error:', dbError.message)
      
      // Try to create columns and retry
      if (dbError.message?.includes('column') && dbError.message?.includes('does not exist')) {
        await DatabaseService.query(`
          ALTER TABLE applications 
          ADD COLUMN IF NOT EXISTS during_interview_screenshot TEXT,
          ADD COLUMN IF NOT EXISTS during_interview_screenshot_captured_at TIMESTAMP WITH TIME ZONE
        `, [])
        
        await DatabaseService.query(
          `UPDATE applications 
           SET during_interview_screenshot = $1, during_interview_screenshot_captured_at = NOW()
           WHERE id = $2::uuid`,
          [screenshotUrl, applicationId]
        )
      } else {
        throw dbError
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Screenshot saved successfully',
      applicationId,
      type: 'during_interview'
    })

  } catch (error: any) {
    console.error('[Interview Screenshot] Error:', error)
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to save screenshot' },
      { status: 500 }
    )
  }
}

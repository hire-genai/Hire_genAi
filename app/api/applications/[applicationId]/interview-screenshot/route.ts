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

    // Ensure interview record exists, then save screenshot
    await DatabaseService.ensureInterviewRecord(applicationId)
    await DatabaseService.query(
      `UPDATE interviews 
       SET during_interview_screenshot = $1, during_interview_screenshot_captured_at = NOW()
       WHERE application_id = $2::uuid`,
      [screenshotUrl, applicationId]
    )
    console.log(`[Interview Screenshot] Saved during_interview screenshot for application ${applicationId}`)

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

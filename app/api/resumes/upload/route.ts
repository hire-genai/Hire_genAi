import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const candidateId = formData.get('candidateId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `resumes/${candidateId || 'candidate'}-${timestamp}-${randomStr}-${safeName}`

    let fileUrl: string

    // Upload to Vercel Blob if BLOB_READ_WRITE_TOKEN is configured
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    if (!hasBlobToken) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.' },
        { status: 500 }
      )
    }

    // Upload to Vercel Blob (no fallback)
    try {
      const { put } = await import('@vercel/blob')
      const blob = await put(fileName, file, {
        access: 'public',
        addRandomSuffix: false,
      })
      fileUrl = blob.url
      console.log(`📄 [Resume Upload] Uploaded to Vercel Blob: ${fileUrl}`)
    } catch (blobErr: any) {
      console.error('[Resume Upload] Blob upload failed:', blobErr.message)
      return NextResponse.json(
        { error: `Failed to upload to blob storage: ${blobErr.message}` },
        { status: 500 }
      )
    }

    // Save file metadata to database (files table)
    let fileId: string | null = null
    try {
      if (typeof DatabaseService.createFile === 'function') {
        const fileRow = await DatabaseService.createFile({
          storage_key: fileUrl,
          content_type: file.type,
          size_bytes: BigInt(file.size),
        })
        fileId = fileRow.id
      }
    } catch (dbError) {
      console.warn('Failed to save file metadata to database:', dbError)
    }

    // Update candidate.resume_url in database
    if (candidateId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(candidateId)) {
        try {
          await DatabaseService.query(
            `UPDATE candidates SET resume_url = $1, updated_at = NOW() WHERE id = $2::uuid`,
            [fileUrl, candidateId]
          )
          console.log(`📄 [Resume Upload] Updated candidates.resume_url for ${candidateId}`)
        } catch (updateErr) {
          console.warn('Failed to update candidate resume_url:', updateErr)
        }

        // Link file to candidate_documents if fileId exists
        if (fileId) {
          try {
            await DatabaseService.query(
              `INSERT INTO candidate_documents (candidate_id, file_id, doc_type, title, created_at)
               VALUES ($1::uuid, $2::uuid, 'resume', $3, NOW())
               ON CONFLICT DO NOTHING`,
              [candidateId, fileId, file.name]
            )
          } catch (linkError) {
            console.warn('Failed to link file to candidate:', linkError)
          }
        }
      }
    }

    console.log(`📄 [Resume Upload] Done: ${fileUrl} (${Math.round(file.size / 1024)} KB)`)

    return NextResponse.json({
      success: true,
      fileId,
      fileUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      candidateId: candidateId || undefined,
    })
  } catch (error: any) {
    console.error('Resume upload error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload resume' },
      { status: 500 }
    )
  }
}

/** Save file to local public/uploads/ directory as fallback */
async function saveLocally(file: File, fileName: string): Promise<string> {
  const localName = fileName.replace('resumes/', '')
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
  await mkdir(uploadsDir, { recursive: true })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filePath = path.join(uploadsDir, localName)
  await writeFile(filePath, buffer)

  const fileUrl = `/uploads/resumes/${localName}`
  console.log(`📄 [Resume Upload] Saved locally: ${fileUrl}`)
  return fileUrl
}

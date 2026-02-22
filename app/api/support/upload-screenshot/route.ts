import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('screenshot') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'png'
    const fileName = `support-screenshots/${timestamp}-${randomStr}.${extension}`

    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    console.log('Screenshot uploaded to Vercel Blob:', blob.url)

    return NextResponse.json({
      success: true,
      url: blob.url
    })
  } catch (error: any) {
    console.error('Error uploading screenshot:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload screenshot' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/smtp'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_BASE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')

  const host = req.headers.get('host') || 'localhost:3000'
  const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, candidateName, position, interviewId, preview } = body || {}

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    const baseUrl = getBaseUrl(req)
    const link = `${baseUrl}/interview/${interviewId || ''}/start`

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || ''
    if (!from) {
      return NextResponse.json({ error: 'EMAIL_FROM is not configured' }, { status: 500 })
    }

    const subject = `Invitation: AI Interview${position ? ` for ${position}` : ''}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color:#111">Hi ${candidateName || 'Candidate'},</h2>
        <p style="color:#333; line-height:1.6;">
          We would like to invite you to complete your AI interview${position ? ` for the ${position} role` : ''}.
        </p>
        <div style="margin:24px 0;">
          <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Start AI Interview</a>
        </div>
        <p style="color:#333; line-height:1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${link}" style="color:#2563eb;">${link}</a>
        </p>
        <p style="color:#333; line-height:1.6;">Best regards,<br/>HireGenAI Team</p>
      </div>
    `

    if (!preview) {
      await sendMail({ to, from, subject, html, text: undefined })

      // Update interview_status to Scheduled
      try {
        await DatabaseService.query(
          `UPDATE applications SET interview_status = 'Scheduled' WHERE id = $1::uuid`,
          [interviewId]
        )
      } catch (e) {
        console.warn('Failed to update interview_status to Scheduled:', e)
      }
    }

    return NextResponse.json({ ok: true, link, from, preview: !!preview })
  } catch (err: any) {
    console.error('❌ Send interview email error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to send interview email' }, { status: 500 })
  }
}

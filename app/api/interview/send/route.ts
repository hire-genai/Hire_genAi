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
    const { to, candidateName, position, interviewId, preview, cc, customBody, subject } = body || {}

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    const baseUrl = getBaseUrl(req)
    const link = `${baseUrl}/interview/${interviewId || ''}/start`

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || ''
    if (!from) {
      return NextResponse.json({ error: 'EMAIL_FROM is not configured' }, { status: 500 })
    }

    // Fetch company name from database using interviewId (applicationId)
    let companyName = 'our organization'
    try {
      if (interviewId) {
        const companyQuery = `
          SELECT c.name as company_name
          FROM applications a
          JOIN job_postings j ON a.job_id = j.id
          JOIN companies c ON j.company_id = c.id
          WHERE a.id = $1::uuid
          LIMIT 1
        `
        const companyRows = await DatabaseService.query(companyQuery, [interviewId]) as any[]
        if (companyRows && companyRows.length > 0 && companyRows[0].company_name) {
          companyName = companyRows[0].company_name
        }
      }
    } catch (e) {
      console.warn('Failed to fetch company name:', e)
    }

    const emailSubject = subject || `Invitation: AI Interview${position ? ` for ${position}` : ''}`

    // Use custom body if provided, otherwise use default template
    const plainBody = customBody || `Dear ${candidateName || 'Candidate'},

Thank you for your interest in the ${position || 'role'} position at ${companyName}. We have carefully reviewed your application and are impressed by your qualifications and experience.

Your profile demonstrates strong alignment with our requirements, and we would like to invite you to the next stage of our selection process - an AI-powered interview assessment.

NEXT STEPS:
Please click the link below to access your personalized interview:
${link}

IMPORTANT DETAILS:
• Time Commitment: Approximately 30-45 minutes
• Deadline: Please complete within 48 hours
• Technical Requirements: Stable internet connection, webcam, and microphone
• Link Expiry: The interview link will expire after 48 hours

This AI interview will help us better understand your skills, experience, and fit for the role. The assessment is designed to be conversational and will cover technical competencies and behavioral aspects relevant to the position.

Should you have any questions or require any accommodations, please don't hesitate to reach out to us.

We look forward to learning more about you through this interview.

Best regards,
Talent Acquisition Team`

    // Generate HTML content for candidate emails
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color:#111;">
        <p style="margin:0 0 16px 0;">Dear ${candidateName || 'Candidate'},</p>
        <p style="margin:0 0 16px 0;">Thank you for your interest in the ${position || 'role'} position at ${companyName}. We have carefully reviewed your application and are impressed by your qualifications and experience.</p>
        <p style="margin:0 0 16px 0;">Your profile demonstrates strong alignment with our requirements, and we would like to invite you to the next stage of our selection process - an AI-powered interview assessment.</p>
        <p style="margin:0 0 12px 0; font-weight:600;">NEXT STEPS:</p>
        <p style="margin:0 0 16px 0;">Please click the link below to access your personalized interview:</p>
        <div style="margin:20px 0;">
          <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Start AI Interview</a>
        </div>
        <p style="margin:0 0 16px 0;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${link}" style="color:#2563eb;">${link}</a></p>
        <p style="margin:0 0 12px 0; font-weight:600;">IMPORTANT DETAILS:</p>
        <ul style="margin:0 0 16px 20px; padding:0; line-height:1.6;">
          <li>Time Commitment: Approximately 30-45 minutes</li>
          <li>Deadline: Please complete within 48 hours</li>
          <li>Technical Requirements: Stable internet connection, webcam, and microphone</li>
          <li>Link Expiry: The interview link will expire after 48 hours</li>
        </ul>
        <p style="margin:0 0 16px 0;">This AI interview will help us better understand your skills, experience, and fit for the role. The assessment is designed to be conversational and will cover technical competencies and behavioral aspects relevant to the position.</p>
        <p style="margin:0 0 16px 0;">Should you have any questions or require any accommodations, please don't hesitate to reach out to us.</p>
        <p style="margin:0 0 16px 0;">We look forward to learning more about you through this interview.</p>
        <p style="margin:0;">Best regards,<br/>Talent Acquisition Team</p>
      </div>
    `;

    if (!preview) {
      // Send email with CC support
      const emailOptions: any = { to, from, subject: emailSubject, html, text: plainBody }
      if (cc && cc.trim()) {
        emailOptions.cc = cc
      }
      
      await sendMail(emailOptions)

      // Update interview status when email is sent
      if (interviewId) {
        try {
          await DatabaseService.ensureInterviewRecord(interviewId)
          await DatabaseService.query(
            `UPDATE interviews SET interview_status = 'Scheduled', interview_sent_at = NOW() WHERE application_id = $1::uuid`,
            [interviewId]
          )
        } catch (e) {
          console.warn('Failed to update interview_status to Scheduled:', e)
        }
      }
    }

    return NextResponse.json({ ok: true, link, from, preview: !!preview, companyName, emailSent: !preview })
  } catch (err: any) {
    console.error('❌ Send interview email error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to send interview email' }, { status: 500 })
  }
}

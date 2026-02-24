import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { EmailService } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get request body
    const body = await request.json()
    const { 
      recipients, // Array of email addresses
      subject,
      emailContent,
      jobId, // Optional, if sending a JD
      emailType, // 'jd', 'newsletter', 'greeting', etc.
      companyId: requestCompanyId // Get companyId from request body
    } = body
    
    // Get companyId from request body or session cookie
    let companyId: string | null = requestCompanyId || null
    let userId: string | null = null

    // If companyId not in request body, try to get from session
    if (!companyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          companyId = session.companyId || session.company?.id || null
          userId = session.userId || session.user?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie for talent-pool email')
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required. Please refresh the page or try again.' }, { status: 400 })
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients are required' }, { status: 400 })
    }

    if (!subject || !emailContent) {
      return NextResponse.json({ error: 'Subject and email content are required' }, { status: 400 })
    }

    // In a real implementation, this would connect to an email service
    // For now, we'll simulate sending emails and update the database

    // 1. Record email sending in the database
    const timestamp = new Date().toISOString()
    
    // Get company name for personalization
    let companyName = "";
    try {
      const companyResult = await DatabaseService.query(
        `SELECT name FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      );
      if (companyResult.length > 0) {
        companyName = companyResult[0].name;
      }
    } catch (err) {
      console.error('Failed to fetch company name:', err);
    }

    // Get sender name (user) for personalization
    let senderName = "";
    if (userId) {
      try {
        const userResult = await DatabaseService.query(
          `SELECT full_name FROM users WHERE id = $1::uuid LIMIT 1`,
          [userId]
        );
        if (userResult.length > 0) {
          senderName = userResult[0].full_name;
        }
      } catch (err) {
        console.error('Failed to fetch user name:', err);
      }
    }

    // For each recipient, send email and update contact history
    for (const email of recipients) {
      try {
        // Get candidate name for personalization
        let candidateName = "Candidate";
        try {
          const candidateResult = await DatabaseService.query(
            `SELECT full_name FROM candidates WHERE email = $1 LIMIT 1`,
            [email]
          );
          if (candidateResult.length > 0) {
            candidateName = candidateResult[0].full_name;
          }
        } catch (err) {
          console.error(`Failed to fetch candidate name for ${email}:`, err);
        }

        // Send actual email using EmailService
        await EmailService.sendTalentPoolEmail({
          to: email,
          subject,
          emailContent,
          candidateName,
          companyName,
          senderName,
          emailType
        });

        // Update last_contacted for this candidate in talent_pool_entries
        await DatabaseService.query(
          `UPDATE talent_pool_entries 
           SET last_contacted = $1
           WHERE candidate_id = (SELECT id FROM candidates WHERE email = $3 LIMIT 1) AND company_id = $2::uuid`,
          [
            timestamp,
            companyId,
            email
          ]
        );
      } catch (err) {
        console.error(`Failed to process email for ${email}:`, err);
        // Continue with other recipients even if one fails
      }
    }

    console.log(`✅ Successfully sent ${emailType} emails to ${recipients.length} recipients:`, {
      subject,
      firstRecipient: recipients[0],
      totalRecipients: recipients.length,
      jobId: jobId || 'N/A'
    })

    return NextResponse.json({
      success: true,
      message: `Email sent to ${recipients.length} recipient(s)`,
      sentTo: recipients.length
    })
  } catch (error: any) {
    console.error('Error sending emails:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send emails' },
      { status: 500 }
    )
  }
}

import { sendMail, sendContactMail } from "./smtp";

// Get support email from SMTP_USER_CONTACT (already in .env) - NO FALLBACK
const SUPPORT_EMAIL = process.env.SMTP_USER_CONTACT;

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Send admin reply email to contact/customer
   */
  static async sendAdminReply({
    recipientName,
    recipientEmail,
    subject,
    message,
  }: {
    recipientName: string;
    recipientEmail: string;
    subject: string;
    message: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Hire<span style="color: #a7f3d0;">GenAI</span></h1>
                    <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Response from HireGenAI Team</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                    <!-- Greeting -->
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${recipientName}! 👋</h2>
                    
                    <!-- Subject -->
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 15px 0; font-weight: 600; text-transform: uppercase;">Re: ${subject}</p>
                    
                    <!-- Message -->
                    <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-wrap;">
                        ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
                      </p>
                    </div>
                    
                    <!-- Closing -->
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 25px 0 0 0;">
                      If you have any further questions or need additional assistance, please don't hesitate to reach out.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
                      Questions? Contact us at:
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      <a href="mailto:support@hire-genai.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@hire-genai.com</a>
                    </p>
                    
                    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                      © ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const text = `
Hello ${recipientName}!

Re: ${subject}

${message}

---

If you have any further questions or need additional assistance, please don't hesitate to reach out.

Questions? Contact us at: support@hire-genai.com

© ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
    `;

    return await sendContactMail({
      to: recipientEmail,
      subject: `Re: ${subject}`,
      html,
      text,
      from: process.env.EMAIL_FROM_CONTACT || 'HireGenAI Support <support@hire-genai.com>',
    });
  }

  /**
   * Send talent pool emails (JD, newsletter, greeting) to candidates
   */
  static async sendTalentPoolEmail({
    to,
    subject,
    emailContent,
    candidateName,
    companyName,
    senderName,
    emailType,
  }: {
    to: string;
    subject: string;
    emailContent: string;
    candidateName?: string;
    companyName?: string;
    senderName?: string;
    emailType: string;
  }) {
    // Replace placeholders with actual values
    let personalizedContent = emailContent;
    
    if (candidateName) {
      personalizedContent = personalizedContent.replace(/\[Candidate Name\]/g, candidateName);
    }
    
    if (companyName) {
      personalizedContent = personalizedContent.replace(/\[Company Name\]/g, companyName);
    }
    
    if (senderName) {
      personalizedContent = personalizedContent.replace(/\[Your Name\]/g, senderName);
    }
    
    // Process Apply Link for HTML version
    let processedContent = personalizedContent;
    
    // Replace Apply Link with styled button
    if (processedContent.includes('👉 **Apply Here:** [Apply Link]')) {
      const applyLinkRegex = /👉 \*\*Apply Here:\*\* \[(.*?)\]/g;
      processedContent = processedContent.replace(applyLinkRegex, (match, url) => {
        return `<div style="text-align: center; margin: 25px 0;">
          <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
            👉 Apply Now
          </a>
        </div>`;  
      });
    }
    
    // Create HTML version with enhanced styling
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white; }
          .content { background: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .apply-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }
          .job-title { font-size: 22px; font-weight: bold; color: #111827; margin-top: 20px; }
          .job-details { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .section-title { font-weight: bold; color: #111827; margin-top: 20px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa;">
        <div class="container">
          <div class="header">
            <h1>HireGenAI</h1>
          </div>
          <div class="content">
            ${processedContent.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} HireGenAI. All rights reserved.</p>
            <p>This email was sent by HireGenAI on behalf of ${companyName || 'your company'}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const text = personalizedContent;

    // Send the email
    return await sendMail({
      to,
      subject,
      html,
      text,
      from: process.env.EMAIL_FROM || 'HireGenAI <no-reply@hire-genai.com>',
      replyTo: process.env.EMAIL_REPLY_TO,
    });
  }

  /**
   * Send contact form confirmation email to user
   */
  static async sendContactFormConfirmation({
    fullName,
    workEmail,
    companyName,
    subject,
  }: {
    fullName: string;
    workEmail: string;
    companyName: string;
    subject: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Hire<span style="color: #a7f3d0;">GenAI</span></h1>
                    <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">AI-Powered Recruitment Platform</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                    <!-- Greeting -->
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${fullName}! 👋</h2>
                    
                    <!-- Thank You Message -->
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 25px 0;">
                      Thank you for reaching out to us! We've received your message and our team is already on it.
                    </p>
                    
                    <!-- Message Summary Box -->
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                      <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📋 Your Message Summary</h3>
                      <table style="width: 100%;">
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Subject:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${subject}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Company:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${companyName}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Response Time -->
                    <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                      <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">⏱️ Expected Response Time</p>
                      <p style="color: #3b82f6; font-size: 24px; font-weight: 700; margin: 0;">Within 24 Hours</p>
                      <p style="color: #6b7280; font-size: 13px; margin: 10px 0 0 0;">Usually much faster during business hours</p>
                    </div>
                    
                    <!-- What to Expect -->
                    <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">What happens next?</h3>
                    <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 10px;">Our team will review your inquiry</li>
                      <li style="margin-bottom: 10px;">We'll prepare a personalized response for you</li>
                      <li style="margin-bottom: 10px;">You'll receive a detailed reply at <strong>${workEmail}</strong></li>
                    </ul>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="https://hire-genai.com" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">Explore HireGenAI</a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
                      Need immediate assistance? Reply to this email or contact us at:
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      <a href="mailto:support@hire-genai.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@hire-genai.com</a>
                    </p>
                    
                    <!-- Social Links -->
                    <div style="margin: 20px 0;">
                      <a href="https://www.linkedin.com/company/hire-genai" style="display: inline-block; margin: 0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/24/3536/3536505.png" alt="LinkedIn" style="width: 24px; height: 24px;">
                      </a>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                      © ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const text = `
Hello ${fullName}!

Thank you for reaching out to us! We've received your message and our team is already on it.

Your Message Summary:
- Subject: ${subject}
- Company: ${companyName}

Expected Response Time: Within 24 Hours
(Usually much faster during business hours)

What happens next?
1. Our team will review your inquiry
2. We'll prepare a personalized response for you
3. You'll receive a detailed reply at ${workEmail}

Need immediate assistance? Contact us at: support@hire-genai.com

---
© ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
    `;

    return await sendContactMail({
      to: workEmail,
      subject: `We've received your message - HireGenAI`,
      html,
      text,
      from: process.env.EMAIL_FROM_CONTACT || 'HireGenAI Support <support@hire-genai.com>',
    });
  }

  /**
   * Send a contact form submission email
   */
  static async sendContactForm({
    name,
    email,
    message,
    to,
  }: {
    name: string;
    email: string;
    message: string;
    to?: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Contact Details</h3>
            <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #667eea;">${email}</a></p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Message</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
              ${message.replace(/\n/g, "<br/>")}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:${email}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reply to ${name}</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This email was sent from your website contact form.</p>
        </div>
      </div>`;

    const text = `
New Contact Form Submission

Name: ${name}
Email: ${email}

Message:
${message}

---
This email was sent from your website contact form.
Reply directly to this email to respond to ${name}.
    `;

    return await sendMail({
      to,
      subject: `New Contact: ${name}`,
      html,
      text,
      replyTo: email,
    });
  }

  /**
   * Send interview invitation email
   */
  static async sendInterviewInvitation({
    candidateName,
    candidateEmail,
    jobTitle,
    interviewDate,
    interviewTime,
    interviewLink,
    companyName,
  }: {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    interviewDate: string;
    interviewTime: string;
    interviewLink: string;
    companyName: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Interview Invitation</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${candidateName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Congratulations! We're pleased to invite you for an interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.
            </p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Interview Details</h3>
            <p style="margin: 10px 0;"><strong>Position:</strong> ${jobTitle}</p>
            <p style="margin: 10px 0;"><strong>Date:</strong> ${interviewDate}</p>
            <p style="margin: 10px 0;"><strong>Time:</strong> ${interviewTime}</p>
            <p style="margin: 10px 0;"><strong>Company:</strong> ${companyName}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Join Interview</a>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              <strong>Important:</strong> Please join the interview 5 minutes early. Make sure you have a stable internet connection and a quiet environment.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>Good luck with your interview!</p>
        </div>
      </div>`;

    const text = `
Interview Invitation

Hello ${candidateName}!

Congratulations! We're pleased to invite you for an interview for the ${jobTitle} position at ${companyName}.

Interview Details:
- Position: ${jobTitle}
- Date: ${interviewDate}
- Time: ${interviewTime}
- Company: ${companyName}

Interview Link: ${interviewLink}

Important: Please join the interview 5 minutes early. Make sure you have a stable internet connection and a quiet environment.

Good luck with your interview!
    `;

    return await sendMail({
      to: candidateEmail,
      subject: `Interview Invitation - ${jobTitle} at ${companyName}`,
      html,
      text,
      from: 'HireGenAI <no-reply@hire-genai.com>',
    });
  }

  /**
   * Send application confirmation email
   */
  static async sendApplicationConfirmation({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
  }: {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    companyName: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Application Received</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Thank you, ${candidateName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              We've successfully received your application for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.
            </p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
              <li>Our team will review your application within 2-3 business days</li>
              <li>If your profile matches our requirements, we'll contact you for the next steps</li>
              <li>You'll receive updates via email at ${candidateEmail}</li>
            </ul>
          </div>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Tip:</strong> Keep an eye on your email (including spam folder) for updates on your application status.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>Thank you for your interest in joining our team!</p>
        </div>
      </div>`;

    const text = `
Application Received

Thank you, ${candidateName}!

We've successfully received your application for the ${jobTitle} position at ${companyName}.

What's Next?
- Our team will review your application within 2-3 business days
- If your profile matches our requirements, we'll contact you for the next steps
- You'll receive updates via email at ${candidateEmail}

Tip: Keep an eye on your email (including spam folder) for updates on your application status.

Thank you for your interest in joining our team!
    `;

    return await sendMail({
      to: candidateEmail,
      subject: `Application Received - ${jobTitle} at ${companyName}`,
      html,
      text,
      from: 'HireGenAI <no-reply@hire-genai.com>',
    });
  }

  /**
   * Send meeting booking confirmation to candidate
   */
  static async sendMeetingBookingConfirmation({
    fullName,
    workEmail,
    companyName,
    meetingDate,
    meetingTime,
    meetingEndTime,
    meetingLink,
    timezone,
  }: {
    fullName: string;
    workEmail: string;
    companyName: string;
    meetingDate: string;
    meetingTime: string;
    meetingEndTime: string;
    meetingLink: string;
    timezone: string;
  }) {
    const formattedDate = new Date(meetingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Hire<span style="color: #a7f3d0;">GenAI</span></h1>
                    <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Meeting Confirmed! ✓</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                    <!-- Greeting -->
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${fullName}! 👋</h2>
                    
                    <!-- Confirmation Message -->
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 25px 0;">
                      Your meeting with HireGenAI has been successfully scheduled. We're looking forward to speaking with you!
                    </p>
                    
                    <!-- Meeting Details Box -->
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                      <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📅 Meeting Details</h3>
                      <table style="width: 100%;">
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top; width: 100px;">Date:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 8px 0; font-weight: 500;">${formattedDate}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top;">Time:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 8px 0; font-weight: 500;">${meetingTime} - ${meetingEndTime}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top;">Timezone:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 8px 0; font-weight: 500;">${timezone}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top;">Company:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 8px 0; font-weight: 500;">${companyName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top;">Duration:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 8px 0; font-weight: 500;">30 minutes</td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Google Meet Link -->
                    <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                      <p style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">🎥 Join via Google Meet</p>
                      <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">Join Meeting</a>
                      <p style="color: #6b7280; font-size: 12px; margin: 12px 0 0 0; word-break: break-all;">${meetingLink}</p>
                    </div>
                    
                    <!-- Tips -->
                    <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 25px 0;">
                      <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">💡 Tips for your meeting</h3>
                      <ul style="color: #78350f; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Join 5 minutes early to test your audio/video</li>
                        <li>Ensure you have a stable internet connection</li>
                        <li>Find a quiet place with good lighting</li>
                      </ul>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
                      Need to reschedule? Contact us at:
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      <a href="mailto:${SUPPORT_EMAIL}" style="color: #10b981; text-decoration: none; font-weight: 500;">${SUPPORT_EMAIL}</a>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                      © ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const text = `
Hello ${fullName}!

Your meeting with HireGenAI has been successfully scheduled.

Meeting Details:
- Date: ${formattedDate}
- Time: ${meetingTime} - ${meetingEndTime}
- Timezone: ${timezone}
- Company: ${companyName}
- Duration: 30 minutes

Join via Google Meet: ${meetingLink}

Tips for your meeting:
- Join 5 minutes early to test your audio/video
- Ensure you have a stable internet connection
- Find a quiet place with good lighting

Need to reschedule? Contact us at: ${SUPPORT_EMAIL}

---
© ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
    `;

    // Use contact transporter (support@hire-genai.com) like contact page
    return await sendContactMail({
      to: workEmail,
      subject: `Meeting Confirmed - ${formattedDate} at ${meetingTime}`,
      html,
      text,
    });
  }

  /**
   * Send meeting booking notification to support team
   */
  static async sendMeetingBookingNotification({
    fullName,
    workEmail,
    companyName,
    phoneNumber,
    meetingDate,
    meetingTime,
    meetingEndTime,
    meetingLink,
    timezone,
    notes,
    bookingId,
  }: {
    fullName: string;
    workEmail: string;
    companyName: string;
    phoneNumber?: string;
    meetingDate: string;
    meetingTime: string;
    meetingEndTime: string;
    meetingLink: string;
    timezone: string;
    notes?: string;
    bookingId: string;
  }) {
    const formattedDate = new Date(meetingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🗓️ New Meeting Booked!</h1>
                    <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Booking ID: ${bookingId}</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                    <!-- Contact Info -->
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 25px; margin: 0 0 25px 0;">
                      <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">👤 Contact Information</h3>
                      <table style="width: 100%;">
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0; width: 120px;">Name:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${fullName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Email:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0;"><a href="mailto:${workEmail}" style="color: #2563eb;">${workEmail}</a></td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Company:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${companyName}</td>
                        </tr>
                        ${phoneNumber ? `
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Phone:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${phoneNumber}</td>
                        </tr>
                        ` : ''}
                      </table>
                    </div>
                    
                    <!-- Meeting Details -->
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 0 0 25px 0;">
                      <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📅 Meeting Details</h3>
                      <table style="width: 100%;">
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0; width: 120px;">Date:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${formattedDate}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Time:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${meetingTime} - ${meetingEndTime}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Timezone:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${timezone}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Duration:</td>
                          <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">30 minutes</td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Google Meet Link -->
                    <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; text-align: center;">
                      <p style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">🎥 Google Meet Link</p>
                      <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Join Meeting</a>
                      <p style="color: #6b7280; font-size: 12px; margin: 12px 0 0 0; word-break: break-all;">${meetingLink}</p>
                    </div>
                    
                    ${notes ? `
                    <!-- Notes -->
                    <div style="background: #fef3c7; border-radius: 12px; padding: 20px;">
                      <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">📝 Additional Notes</h3>
                      <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">${notes}</p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 20px 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      This is an automated notification from HireGenAI booking system.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const text = `
New Meeting Booked!
Booking ID: ${bookingId}

Contact Information:
- Name: ${fullName}
- Email: ${workEmail}
- Company: ${companyName}
${phoneNumber ? `- Phone: ${phoneNumber}` : ''}

Meeting Details:
- Date: ${formattedDate}
- Time: ${meetingTime} - ${meetingEndTime}
- Timezone: ${timezone}
- Duration: 30 minutes

Google Meet Link: ${meetingLink}

${notes ? `Additional Notes:\n${notes}` : ''}

---
This is an automated notification from HireGenAI booking system.
    `;

    // Only send if SUPPORT_EMAIL is configured in .env
    if (!SUPPORT_EMAIL) {
      console.warn('⚠️ [EMAIL] SUPPORT_EMAIL not configured in .env - skipping support notification');
      return null;
    }

    // Use contact transporter (support@hire-genai.com) like contact page
    return await sendContactMail({
      to: SUPPORT_EMAIL,
      subject: `New Meeting Booking - ${fullName} from ${companyName}`,
      html,
      text,
      replyTo: workEmail,
    });
  }

  /**
   * Send custom message to candidate (Interview or New Job)
   */
  static async sendCustomMessage({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    messageContent,
    category,
  }: {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    companyName: string;
    messageContent: string;
    category: 'interview' | 'new_job';
  }) {
    // Extract subject from message if it starts with "Subject:"
    let subject = category === 'interview' 
      ? `Interview Invitation - ${jobTitle} at ${companyName}`
      : `New Opportunity - ${jobTitle} at ${companyName}`;
    
    let bodyContent = messageContent;
    
    // Check if message has a subject line
    const subjectMatch = messageContent.match(/^Subject:\s*(.+?)(?:\n|$)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      bodyContent = messageContent.replace(/^Subject:\s*.+?(?:\n|$)/i, '').trim();
    }

    const gradientColor = category === 'interview' 
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${gradientColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 12px; opacity: 0.9;">This interview is organised by HireGenAI</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 25px; border-radius: 8px; line-height: 1.6; color: #333;">
            ${bodyContent.replace(/\n/g, "<br/>")}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p style="margin: 5px 0;">This email was sent by ${companyName}</p>
        </div>
      </div>`;

    const text = `${bodyContent}\n\n---\nThis interview is organised by HireGenAI\nThis email was sent by ${companyName}`;

    return await sendMail({
      to: candidateEmail,
      subject,
      html,
      text,
      from: 'HireGenAI <no-reply@hire-genai.com>',
    });
  }

  /**
   * Send delegation notification email to the assigned recruiter
   */
  static async sendDelegationNotification({
    to,
    recruiterName,
    delegatorName,
    companyName,
    delegationType,
    itemName,
    startDate,
    endDate,
    reason,
  }: {
    to: string;
    recruiterName: string;
    delegatorName: string;
    companyName: string;
    delegationType: string;
    itemName: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    const subject = `Delegation Assigned: ${itemName} — ${companyName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 30px;border-radius:16px 16px 0 0;text-align:center;">
                    <h1 style="color:white;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Hire<span style="color:#a7f3d0;">GenAI</span></h1>
                    <p style="color:#d1fae5;margin:8px 0 0 0;font-size:14px;">Delegation Management</p>
                  </td>
                </tr>
                <!-- Main Content -->
                <tr>
                  <td style="background:white;padding:40px 30px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
                    <h2 style="color:#1f2937;margin:0 0 8px 0;font-size:22px;font-weight:600;">Hello ${recruiterName},</h2>
                    <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 25px 0;">
                      A new task has been delegated to you by <strong>${delegatorName}</strong> at <strong>${companyName}</strong>. Please review the details below.
                    </p>

                    <!-- Delegation Details Box -->
                    <div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1px solid #bbf7d0;border-radius:12px;padding:25px;margin:0 0 25px 0;">
                      <h3 style="color:#166534;margin:0 0 16px 0;font-size:15px;font-weight:600;">📋 Delegation Details</h3>
                      <table style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding:7px 0;width:130px;vertical-align:top;">Type:</td>
                          <td style="color:#1f2937;font-size:14px;padding:7px 0;font-weight:500;">${delegationType}</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding:7px 0;vertical-align:top;">Item:</td>
                          <td style="color:#1f2937;font-size:14px;padding:7px 0;font-weight:600;">${itemName}</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding:7px 0;vertical-align:top;">Delegated By:</td>
                          <td style="color:#1f2937;font-size:14px;padding:7px 0;font-weight:500;">${delegatorName}</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding:7px 0;vertical-align:top;">Start Date:</td>
                          <td style="color:#1f2937;font-size:14px;padding:7px 0;font-weight:500;">${startDate}</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding:7px 0;vertical-align:top;">End Date:</td>
                          <td style="color:#1f2937;font-size:14px;padding:7px 0;font-weight:500;">${endDate}</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding:7px 0;vertical-align:top;">Reason:</td>
                          <td style="color:#1f2937;font-size:14px;padding:7px 0;">${reason}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- Info Note -->
                    <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;padding:16px 20px;margin:0 0 25px 0;">
                      <p style="color:#1e40af;font-size:14px;margin:0;line-height:1.6;">
                        <strong>What this means:</strong> You now have access to the above ${delegationType.toLowerCase()} during the delegation period. Please log in to HireGenAI to view and manage your delegated tasks.
                      </p>
                    </div>

                    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
                      If you have any questions regarding this delegation, please reach out to <strong>${delegatorName}</strong> directly.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:25px 30px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">
                      © ${new Date().getFullYear()} HireGenAI. All rights reserved.<br>
                      This notification was sent on behalf of ${companyName}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const text = `
Hello ${recruiterName},

A new task has been delegated to you by ${delegatorName} at ${companyName}.

Delegation Details:
- Type: ${delegationType}
- Item: ${itemName}
- Delegated By: ${delegatorName}
- Start Date: ${startDate}
- End Date: ${endDate}
- Reason: ${reason}

Please log in to HireGenAI to view and manage your delegated tasks.

If you have any questions, please reach out to ${delegatorName} directly.

---
© ${new Date().getFullYear()} HireGenAI. All rights reserved.
    `;

    return await sendMail({
      to,
      subject,
      html,
      text,
      from: process.env.EMAIL_FROM || 'HireGenAI <no-reply@hire-genai.com>',
    });
  }
}

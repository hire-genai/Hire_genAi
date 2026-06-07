import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from "node:crypto"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []
const SUPPORT_EMAILS = process.env.SUPPORT_EMAILS
  ? process.env.SUPPORT_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []

const ALLOWED_EMAILS = [...ADMIN_EMAILS, ...SUPPORT_EMAILS]

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
})

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (ALLOWED_EMAILS.length === 0) {
      console.error("❌ ADMIN_EMAILS and SUPPORT_EMAILS not configured in .env.local")
      return NextResponse.json(
        { error: "Admin access not configured. Please set ADMIN_EMAILS or SUPPORT_EMAILS in .env.local" },
        { status: 500 }
      )
    }

    let isTeamMember = false
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      // Check team members table
      try {
        const teamRows = await DatabaseService.query(
          `SELECT email FROM admin_team_members WHERE email = $1`,
          [normalizedEmail]
        ) as any[]
        isTeamMember = teamRows.length > 0
      } catch { /* table may not exist yet */ }

      if (!isTeamMember) {
        return NextResponse.json({ error: "Access restricted", restricted: true }, { status: 403 })
      }
    }

    const userType = ADMIN_EMAILS.includes(normalizedEmail) ? "ADMIN" : isTeamMember ? "TEAM" : "SUPPORT"
    console.log(`✅ ${userType} user attempting login: ${normalizedEmail}`)

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const codeHash = crypto.createHash("sha256").update(code).digest("hex")

    await DatabaseService.query(
      `DELETE FROM otp_challenges WHERE email = $1 AND purpose = 'admin_login'`,
      [normalizedEmail]
    )

    await DatabaseService.query(
      `INSERT INTO otp_challenges (email, principal_type, purpose, code_hash, max_tries, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [normalizedEmail, "user", "admin_login", codeHash, 5, expiresAt.toISOString()]
    )

    console.log(`✅ OTP generated for ${normalizedEmail}`)

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hire-genai.com",
        to: normalizedEmail,
        subject: "HireGenAI Admin Login - OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">HireGenAI Admin Login</h2>
            <p>Your one-time password (OTP) for admin access:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; margin: 0;">${code}</p>
            </div>
            <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      })
      console.log(`✅ OTP email sent to ${normalizedEmail}`)
    } catch (emailError) {
      console.error("Email send error:", emailError)
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`\n${"=".repeat(60)}`)
      console.log(`🔐 DEVELOPMENT MODE - OTP FOR TESTING`)
      console.log(`${"=".repeat(60)}`)
      console.log(`Email: ${normalizedEmail}`)
      console.log(`OTP Code: ${code}`)
      console.log(`Expires in: 10 minutes`)
      console.log(`${"=".repeat(60)}\n`)
    }

    return NextResponse.json({ ok: true, message: "OTP sent to email" })
  } catch (err: any) {
    console.error("Send OTP error:", err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}

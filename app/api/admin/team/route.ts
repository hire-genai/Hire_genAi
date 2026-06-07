import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []

async function ensureTable() {
  await DatabaseService.query(`
    CREATE TABLE IF NOT EXISTS admin_team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      assigned_tabs TEXT[] NOT NULL DEFAULT '{}',
      assigned_support_tiers TEXT[] DEFAULT NULL,
      invited_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  // Add column if it doesn't exist (safe migration)
  await DatabaseService.query(`
    ALTER TABLE admin_team_members ADD COLUMN IF NOT EXISTS assigned_support_tiers TEXT[] DEFAULT NULL
  `)
}

const TAB_LABELS: Record<string, string> = {
  overview: "Overview", companies: "Companies", jobs: "Company Usage",
  anomalies: "Anomalies", "customer-interaction": "Customer Interaction",
  "support-centre": "Support Centre", "product-feedback": "Product Feedback",
}

async function sendInviteEmail(
  toEmail: string,
  name: string,
  assignedTabs: string[],
  assignedSupportTiers: string[] | null,
  loginUrl: string
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
      },
    })

    const tabNames = assignedTabs.map(t => TAB_LABELS[t] || t).join(", ")
    const tierInfo = assignedSupportTiers?.length
      ? `<p style="margin:8px 0;"><strong>Support tiers assigned:</strong> ${assignedSupportTiers.join(", ")}</p>`
      : ""

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hire-genai.com",
      to: toEmail,
      subject: "You've been added to HireGenAI Admin",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#0f172a;padding:20px 24px;border-radius:8px;margin-bottom:24px;">
            <h2 style="color:#10b981;margin:0;font-size:20px;">HireGenAI Admin Portal</h2>
          </div>
          <p style="font-size:16px;color:#1e293b;">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;">You have been added as a support team member for <strong>HireGenAI</strong>. Here's what you have access to:</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:8px 0;color:#1e293b;"><strong>Assigned sections:</strong> ${tabNames}</p>
            ${tierInfo}
          </div>
          <p style="color:#475569;">To log in, click the button below. You'll receive a one-time verification code at this email address.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${loginUrl}" style="background:#10b981;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Access Admin Portal →
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;">Use your email <strong>${toEmail}</strong> to log in. If you didn't expect this invitation, please ignore this email.</p>
        </div>
      `,
    })
  } catch (e) {
    console.error("Invite email error:", e)
  }
}

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ ok: false, error: "Owner only" }, { status: 403 })

  try {
    await ensureTable()
    const rows = await DatabaseService.query(
      `SELECT id, email, name, assigned_tabs, assigned_support_tiers, invited_by, created_at
       FROM admin_team_members ORDER BY created_at DESC`
    ) as any[]
    return NextResponse.json({ ok: true, members: rows })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ ok: false, error: "Owner only" }, { status: 403 })

  try {
    await ensureTable()
    const body = await req.json()
    const { email, name, assignedTabs, assignedSupportTiers } = body

    if (!email || !name || !Array.isArray(assignedTabs)) {
      return NextResponse.json({ ok: false, error: "email, name, and assignedTabs required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json({ ok: false, error: "This email is already an owner" }, { status: 400 })
    }

    const supportTiers = Array.isArray(assignedSupportTiers) && assignedSupportTiers.length > 0
      ? assignedSupportTiers
      : null

    await DatabaseService.query(
      `INSERT INTO admin_team_members (email, name, assigned_tabs, assigned_support_tiers, invited_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = $2, assigned_tabs = $3, assigned_support_tiers = $4`,
      [normalizedEmail, name.trim(), assignedTabs, supportTiers, user.email]
    )

    // Build login URL from request origin
    const origin = req.headers.get("origin") || req.headers.get("x-forwarded-proto")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`
      : "http://localhost:3000"
    const loginUrl = `${origin}/owner-login`

    await sendInviteEmail(normalizedEmail, name.trim(), assignedTabs, supportTiers, loginUrl)

    return NextResponse.json({ ok: true, message: "Team member added and invited" })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ ok: false, error: "Owner only" }, { status: 403 })

  try {
    const { email, assignedTabs, assignedSupportTiers, name } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 })

    const updates: string[] = []; const params: any[] = []; let idx = 1
    if (Array.isArray(assignedTabs)) { updates.push(`assigned_tabs = $${idx++}`); params.push(assignedTabs) }
    if (name) { updates.push(`name = $${idx++}`); params.push(name.trim()) }
    const supportTiers = Array.isArray(assignedSupportTiers) && assignedSupportTiers.length > 0 ? assignedSupportTiers : null
    updates.push(`assigned_support_tiers = $${idx++}`); params.push(supportTiers)

    params.push(email.toLowerCase().trim())
    await DatabaseService.query(
      `UPDATE admin_team_members SET ${updates.join(", ")} WHERE email = $${idx}`,
      params
    )
    return NextResponse.json({ ok: true, message: "Updated" })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ ok: false, error: "Owner only" }, { status: 403 })

  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 })
    await DatabaseService.query(`DELETE FROM admin_team_members WHERE email = $1`, [email.toLowerCase().trim()])
    return NextResponse.json({ ok: true, message: "Member removed" })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

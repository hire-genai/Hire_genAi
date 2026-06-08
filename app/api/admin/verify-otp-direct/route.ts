import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from "node:crypto"

export const dynamic = "force-dynamic"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []
const SUPPORT_EMAILS = process.env.SUPPORT_EMAILS
  ? process.env.SUPPORT_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []

const ALLOWED_EMAILS = [...ADMIN_EMAILS, ...SUPPORT_EMAILS]
const SESSION_DURATION = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { email, code } = (await req.json()) as { email: string; code: string }

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)
    const isSupport = SUPPORT_EMAILS.includes(normalizedEmail)
    const userType = isAdmin ? "ADMIN" : isSupport ? "SUPPORT" : null

    console.log(`🔍 Verifying OTP for: ${normalizedEmail}, Code: ${code}`)
    console.log(`🔍 User type: ${userType || "UNAUTHORIZED"}`)

    if (ALLOWED_EMAILS.length === 0) {
      return NextResponse.json(
        { error: "Admin access not configured" },
        { status: 500 }
      )
    }

    let isTeamMember = false
    let teamAssignedTabs: string[] = []
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      try {
        const teamRows = await DatabaseService.query(
          `SELECT assigned_tabs FROM admin_team_members WHERE email = $1`,
          [normalizedEmail]
        ) as any[]
        if (teamRows.length > 0) {
          isTeamMember = true
          teamAssignedTabs = teamRows[0].assigned_tabs || []
        }
      } catch { /* table may not exist yet */ }

      if (!isTeamMember) {
        return NextResponse.json({ error: "Access restricted", restricted: true }, { status: 403 })
      }
    }

    const challengeRows = await DatabaseService.query(
      `SELECT id, code_hash, expires_at, tries_used, max_tries
       FROM otp_challenges
       WHERE email = $1 AND purpose = 'admin_login'
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail]
    )

    if (!challengeRows || challengeRows.length === 0) {
      return NextResponse.json(
        { error: "No OTP found for this email" },
        { status: 400 }
      )
    }

    const record = challengeRows[0] as any

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ error: "Code expired" }, { status: 400 })
    }

    if (record.tries_used >= record.max_tries) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 400 }
      )
    }

    const codeHash = crypto.createHash("sha256").update(String(code)).digest("hex")

    if (record.code_hash !== codeHash) {
      await DatabaseService.query(
        `UPDATE otp_challenges SET tries_used = tries_used + 1 WHERE id = $1`,
        [record.id]
      )
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    const sessionToken = crypto.randomBytes(32).toString("hex")
    const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex")
    const expiresAt = new Date(Date.now() + SESSION_DURATION)

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const userAgent = req.headers.get("user-agent") || undefined

    await DatabaseService.query(
      `INSERT INTO admin_sessions (owner_email, session_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedEmail, sessionTokenHash, ip, userAgent, expiresAt.toISOString()]
    )

    await DatabaseService.query(`DELETE FROM otp_challenges WHERE id = $1`, [record.id])

    // Determine where to redirect after login
    let redirect = "/admin-hiregenai/overview"
    if (isTeamMember && teamAssignedTabs.length > 0) {
      redirect = `/admin-hiregenai/${teamAssignedTabs[0]}`
    } else if (SUPPORT_EMAILS.includes(normalizedEmail)) {
      redirect = "/admin-hiregenai/support-centre"
    }

    const response = NextResponse.json({
      ok: true,
      message: "Login successful",
      sessionToken,
      redirect,
    })

    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION / 1000,
      path: "/",
    })

    return response
  } catch (err: any) {
    console.error("Verify OTP error:", err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}

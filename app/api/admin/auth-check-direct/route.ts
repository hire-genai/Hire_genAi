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

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("admin_session")?.value
    if (!sessionToken) return NextResponse.json({ ok: false, error: "No session token" }, { status: 401 })

    const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex")
    const rows = await DatabaseService.query(
      `SELECT id, owner_email, expires_at, revoked_at FROM admin_sessions WHERE session_token_hash = $1`,
      [sessionTokenHash]
    )

    if (!rows || rows.length === 0) return NextResponse.json({ ok: false, error: "Session not found" }, { status: 401 })

    const session = rows[0] as any
    if (session.revoked_at) return NextResponse.json({ ok: false, error: "Session revoked" }, { status: 401 })
    if (new Date() > new Date(session.expires_at)) return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 })

    await DatabaseService.query(`UPDATE admin_sessions SET last_activity_at = NOW() WHERE id = $1`, [session.id])

    const normalizedEmail = session.owner_email.toLowerCase().trim()
    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)
    const isSupport = SUPPORT_EMAILS.includes(normalizedEmail)

    if (isAdmin) {
      return NextResponse.json({
        ok: true,
        user: { id: session.id, email: normalizedEmail, role: "admin", assignedTabs: null },
      })
    }

    if (isSupport) {
      return NextResponse.json({
        ok: true,
        user: { id: session.id, email: normalizedEmail, role: "support", assignedTabs: ["support-centre", "product-feedback"] },
      })
    }

    // Check team members table
    try {
      const teamRows = await DatabaseService.query(
        `SELECT name, assigned_tabs, assigned_support_tiers FROM admin_team_members WHERE email = $1`,
        [normalizedEmail]
      ) as any[]

      if (teamRows.length > 0) {
        return NextResponse.json({
          ok: true,
          user: {
            id: session.id,
            email: normalizedEmail,
            role: "team",
            name: teamRows[0].name,
            assignedTabs: teamRows[0].assigned_tabs || [],
            assignedSupportTiers: teamRows[0].assigned_support_tiers || null,
          },
        })
      }
    } catch {
      // Table may not exist yet — fall through to unauthorized
    }

    return NextResponse.json({ ok: false, error: "Access not granted" }, { status: 403 })
  } catch (error: any) {
    console.error("Auth-check error:", error)
    return NextResponse.json({ ok: false, error: "Authentication failed" }, { status: 500 })
  }
}

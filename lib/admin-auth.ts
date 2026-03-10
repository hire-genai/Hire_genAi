import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from "node:crypto"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []
const SUPPORT_EMAILS = process.env.SUPPORT_EMAILS
  ? process.env.SUPPORT_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []

export interface AdminUser {
  id: string
  email: string
  role: "admin" | "support" | "unknown"
}

export async function verifyAdminSession(req: NextRequest): Promise<AdminUser | null> {
  try {
    const sessionToken = req.cookies.get("admin_session")?.value
    if (!sessionToken) return null

    const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex")

    const rows = await DatabaseService.query(
      `SELECT id, owner_email, expires_at, revoked_at
       FROM admin_sessions
       WHERE session_token_hash = $1`,
      [sessionTokenHash]
    )

    if (!rows || rows.length === 0) return null

    const session = rows[0] as any
    if (session.revoked_at) return null
    if (new Date() > new Date(session.expires_at)) return null

    const email = session.owner_email.toLowerCase().trim()
    const isAdmin = ADMIN_EMAILS.includes(email)
    const isSupport = SUPPORT_EMAILS.includes(email)
    const role = isAdmin ? "admin" : isSupport ? "support" : "unknown"

    return { id: session.id, email, role }
  } catch (error) {
    console.error("Admin auth verification error:", error)
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
}

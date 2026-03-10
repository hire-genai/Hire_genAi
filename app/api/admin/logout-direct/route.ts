import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from "node:crypto"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("admin_session")?.value

    if (!sessionToken) {
      const response = NextResponse.json({ ok: true, message: "Logged out" })
      response.cookies.delete("admin_session")
      return response
    }

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex")

    const result = await DatabaseService.query(
      `UPDATE admin_sessions
       SET revoked_at = NOW()
       WHERE session_token_hash = $1
       RETURNING id, owner_email`,
      [sessionTokenHash]
    )

    if (result && result.length > 0) {
      console.log(`✅ Logout: Session revoked for ${(result[0] as any).owner_email}`)
    }

    const response = NextResponse.json({ ok: true, message: "Logged out successfully" })
    response.cookies.delete("admin_session")
    return response
  } catch (error: any) {
    console.error("Logout error:", error)
    const response = NextResponse.json(
      { ok: false, error: "Logout failed" },
      { status: 500 }
    )
    response.cookies.delete("admin_session")
    return response
  }
}

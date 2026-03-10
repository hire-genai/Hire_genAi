import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  try {
    // Get all admin settings
    let settings: Record<string, string> = {}
    try {
      const rows = await DatabaseService.query(`SELECT key, value FROM admin_settings`)
      for (const r of rows as any[]) {
        settings[r.key] = r.value
      }
    } catch {
      settings = {
        profit_margin: "20",
        anomaly_detection: "true",
        realtime_alerts: "true",
      }
    }

    // OpenAI API key status
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    let openaiKeyValid = false
    if (hasOpenAIKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        })
        openaiKeyValid = response.ok
      } catch {
        openaiKeyValid = false
      }
    }

    // Support ticket stats
    let supportStats = { open: 0, inProgress: 0, resolvedToday: 0, total: 0 }
    try {
      const ticketRows = await DatabaseService.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed') AND resolved_at >= CURRENT_DATE) as resolved_today,
          COUNT(*) as total
         FROM support_tickets`
      )
      const stats = ticketRows[0] as any
      supportStats = {
        open: parseInt(stats.open_count || "0"),
        inProgress: parseInt(stats.in_progress_count || "0"),
        resolvedToday: parseInt(stats.resolved_today || "0"),
        total: parseInt(stats.total || "0"),
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      settings,
      openai: {
        configured: hasOpenAIKey,
        valid: openaiKeyValid,
      },
      supportStats,
    })
  } catch (error: any) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ ok: false, error: "key and value required" }, { status: 400 })
    }

    const allowedKeys = ["profit_margin", "anomaly_detection", "realtime_alerts"]
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ ok: false, error: "Invalid setting key" }, { status: 400 })
    }

    await DatabaseService.query(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, String(value)]
    )

    return NextResponse.json({ ok: true, message: "Setting updated" })
  } catch (error: any) {
    console.error("Settings PUT error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

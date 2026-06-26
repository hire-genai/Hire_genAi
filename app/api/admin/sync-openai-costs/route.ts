import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"
import { syncOpenAICosts, getLastSuccessfulSync } from "@/lib/openai-costs-api"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Trigger OpenAI Costs API sync.
 *
 * Auth:
 *   - Admin session cookie (manual trigger from dashboard), OR
 *   - Bearer CRON_SECRET header (Vercel Cron / external scheduler)
 *
 * Query params:
 *   - lookbackDays (default 7) — how far back to refetch (idempotent upsert)
 */
async function runSync(req: NextRequest) {
  const url = new URL(req.url)
  const lookbackDays = parseInt(url.searchParams.get("lookbackDays") || "7", 10)
  const result = await syncOpenAICosts(Number.isFinite(lookbackDays) && lookbackDays > 0 ? lookbackDays : 7)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (isCronAuthorized(req)) return runSync(req)
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()
  return runSync(req)
}

// Vercel Cron uses GET by default
export async function GET(req: NextRequest) {
  if (isCronAuthorized(req)) return runSync(req)
  const user = await verifyAdminSession(req)
  if (!user) return unauthorizedResponse()

  // Manual GET without sync trigger — return last sync info
  const last = await getLastSuccessfulSync()
  return NextResponse.json({
    ok: true,
    lastSyncedAt: last?.toISOString() || null,
    hint: "POST to this endpoint (or GET with cron Bearer token) to trigger a fresh sync.",
  })
}

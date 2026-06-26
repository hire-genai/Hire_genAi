/**
 * Resilient diagnostic endpoint for OpenAI project ID mapping.
 *
 * Tests the Costs API across three windows (7d / 30d / 90d) in parallel,
 * runs the Usage API as fallback, probes each service key for runtime project,
 * identifies the org the admin key belongs to, and surfaces all errors explicitly.
 *
 * Auth: Admin session cookie OR Bearer CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"
import { fetchOpenAICosts, fetchOpenAIUsage } from "@/lib/openai-costs-api"
import { DatabaseService } from "@/lib/database"
import { decrypt } from "@/lib/encryption"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 180

const OPENAI_BASE = "https://api.openai.com/v1"

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get("authorization") === `Bearer ${secret}`
}

/**
 * Identify the org the admin key belongs to.
 * Also returns the admin key type (sk-admin vs sk-proj vs sk-svcacct).
 */
async function identifyAdminKey(adminKey: string): Promise<{
  orgId: string | null
  orgName: string | null
  keyType: string
  error: string | null
  rawOrgResponse: any
}> {
  const keyType = adminKey.startsWith("sk-admin-")
    ? "admin (correct)"
    : adminKey.startsWith("sk-proj-")
    ? "project key (WRONG — needs sk-admin-... for Costs API)"
    : adminKey.startsWith("sk-svcacct-")
    ? "service account (WRONG — needs sk-admin-... for Costs API)"
    : "unknown format"

  try {
    // GET /organization returns org info for admin keys
    const res = await fetch(`${OPENAI_BASE}/organization`, {
      headers: { Authorization: `Bearer ${adminKey}` },
    })
    const requestId = res.headers.get("x-request-id") ?? "unknown"
    const orgId = res.headers.get("openai-organization") ?? null

    if (!res.ok) {
      const text = await res.text()
      return {
        orgId,
        orgName: null,
        keyType,
        error: `GET /organization → HTTP ${res.status} (req-id: ${requestId}): ${text.slice(0, 300)}`,
        rawOrgResponse: null,
      }
    }
    const json = await res.json()
    return {
      orgId: json.id ?? orgId,
      orgName: json.name ?? null,
      keyType,
      error: null,
      rawOrgResponse: json,
    }
  } catch (err: any) {
    return { orgId: null, orgName: null, keyType, error: err.message, rawOrgResponse: null }
  }
}

/**
 * Probe a service key: call GET /models and read openai-project + openai-organization
 * response headers. Returns full HTTP status and body on failure.
 */
async function probeKeyProject(serviceKey: string): Promise<{
  runtimeProjectId: string | null
  runtimeOrgId: string | null
  httpStatus: number | null
  keyPrefix: string
  keyType: string
  error: string | null
  errorBody: string | null
}> {
  const keyPrefix = serviceKey.slice(0, 24) + "..."
  const keyType = serviceKey.startsWith("sk-admin-")
    ? "admin"
    : serviceKey.startsWith("sk-proj-")
    ? "project"
    : serviceKey.startsWith("sk-svcacct-")
    ? "service_account"
    : "unknown"

  try {
    const res = await fetch(`${OPENAI_BASE}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${serviceKey}` },
    })
    const runtimeProjectId = res.headers.get("openai-project") ?? null
    const runtimeOrgId = res.headers.get("openai-organization") ?? null

    if (!res.ok) {
      const body = await res.text()
      return {
        runtimeProjectId,
        runtimeOrgId,
        httpStatus: res.status,
        keyPrefix,
        keyType,
        error: `HTTP ${res.status}`,
        errorBody: body.slice(0, 400),
      }
    }
    return { runtimeProjectId, runtimeOrgId, httpStatus: res.status, keyPrefix, keyType, error: null, errorBody: null }
  } catch (err: any) {
    return {
      runtimeProjectId: null,
      runtimeOrgId: null,
      httpStatus: null,
      keyPrefix,
      keyType,
      error: err.message,
      errorBody: null,
    }
  }
}

function extractServiceKey(raw: string): { key: string | null; extractError: string | null; format: string } {
  try {
    const plain = decrypt(raw).trim()
    if (plain.startsWith("{")) {
      const obj = JSON.parse(plain)
      const key = obj.value || obj.apiKey || obj.api_key || obj.key || null
      return {
        key,
        extractError: key ? null : `JSON parsed (keys: ${Object.keys(obj).join(",")}) — no known key field`,
        format: "json",
      }
    }
    return { key: plain, extractError: null, format: "plain" }
  } catch (err: any) {
    if (raw.startsWith("sk-")) return { key: raw, extractError: null, format: "plain_unencrypted" }
    return { key: null, extractError: `Decrypt failed: ${err.message}`, format: "unknown" }
  }
}

async function tryCosts(adminKey: string, startUnix: number, endUnix: number, label: string) {
  try {
    const buckets = await fetchOpenAICosts({ startTimeUnix: startUnix, endTimeUnix: endUnix, adminKey })
    const m = new Map<string, number>()
    for (const b of buckets) {
      for (const r of b.results ?? []) {
        if (!r.project_id) continue
        m.set(r.project_id, (m.get(r.project_id) ?? 0) + (Number(r.amount?.value) || 0))
      }
    }
    return { projectSpend: m, error: null }
  } catch (err: any) {
    return { projectSpend: new Map<string, number>(), error: err.message as string }
  }
}

async function tryUsage(adminKey: string, startUnix: number, endUnix: number, label: string) {
  try {
    const rows = await fetchOpenAIUsage({ startTimeUnix: startUnix, endTimeUnix: endUnix, adminKey })
    const m = new Map<string, { input: number; output: number; requests: number }>()
    for (const r of rows) {
      if (!r.project_id) continue
      m.set(r.project_id, { input: r.input_tokens, output: r.output_tokens, requests: r.num_model_requests })
    }
    return { usageMap: m, error: null }
  } catch (err: any) {
    return { usageMap: new Map<string, { input: number; output: number; requests: number }>(), error: err.message as string }
  }
}

async function listOrgProjects(adminKey: string) {
  try {
    const res = await fetch(`${OPENAI_BASE}/organization/projects?limit=100`, {
      headers: { Authorization: `Bearer ${adminKey}` },
    })
    const requestId = res.headers.get("x-request-id") ?? "unknown"
    if (!res.ok) {
      const text = await res.text()
      return { projects: [] as Array<{ id: string; name: string; status: string }>, error: `HTTP ${res.status} (req-id: ${requestId}): ${text.slice(0, 300)}` }
    }
    const json = await res.json()
    return { projects: (json.data ?? []) as Array<{ id: string; name: string; status: string }>, error: null }
  } catch (err: any) {
    return { projects: [] as Array<{ id: string; name: string; status: string }>, error: err.message as string }
  }
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    const user = await verifyAdminSession(req)
    if (!user) return unauthorizedResponse()
  }

  const adminKey = process.env.OPENAI_ADMIN_KEY
  if (!adminKey) {
    return NextResponse.json({ ok: false, error: "OPENAI_ADMIN_KEY not set" }, { status: 500 })
  }

  const nowUnix = Math.floor(Date.now() / 1000)
  const windows = {
    "7d":  { start: nowUnix - 7  * 86400, end: nowUnix },
    "30d": { start: nowUnix - 30 * 86400, end: nowUnix },
    "90d": { start: nowUnix - 90 * 86400, end: nowUnix },
  }

  // Run everything in parallel
  const [
    adminKeyInfo,
    orgProjectsResult,
    costs7d, costs30d, costs90d,
    usage7d, usage30d, usage90d,
    companyRows,
  ] = await Promise.all([
    identifyAdminKey(adminKey),
    listOrgProjects(adminKey),
    tryCosts(adminKey, windows["7d"].start,  windows["7d"].end,  "7d"),
    tryCosts(adminKey, windows["30d"].start, windows["30d"].end, "30d"),
    tryCosts(adminKey, windows["90d"].start, windows["90d"].end, "90d"),
    tryUsage(adminKey, windows["7d"].start,  windows["7d"].end,  "7d"),
    tryUsage(adminKey, windows["30d"].start, windows["30d"].end, "30d"),
    tryUsage(adminKey, windows["90d"].start, windows["90d"].end, "90d"),
    DatabaseService.query(
      `SELECT id, name, openai_project_id, openai_service_account_key FROM companies ORDER BY name`
    ) as Promise<Array<{ id: string; name: string; openai_project_id: string | null; openai_service_account_key: string | null }>>,
  ])

  // Per-company: decrypt IDs + probe service keys
  const companies = await Promise.all(
    companyRows.map(async (row) => {
      // Decrypt project ID
      let dbProjectId: string | null = null
      let dbDecryptStatus = "not_set"
      if (row.openai_project_id) {
        try {
          dbProjectId = decrypt(row.openai_project_id)
          dbDecryptStatus = "ok"
        } catch {
          const raw = row.openai_project_id
          dbProjectId = /^proj_[A-Za-z0-9_-]+$/.test(raw) ? raw : null
          dbDecryptStatus = dbProjectId ? "plain_text_fallback" : "failed"
        }
      }

      // Extract + probe service key
      let probeResult: Awaited<ReturnType<typeof probeKeyProject>> | null = null
      let extractError: string | null = null
      let keyFormat = "none"

      if (row.openai_service_account_key) {
        const { key, extractError: xe, format } = extractServiceKey(row.openai_service_account_key)
        keyFormat = format
        if (key) {
          probeResult = await probeKeyProject(key)
        } else {
          extractError = xe
        }
      }

      const runtimeProjectId = probeResult?.runtimeProjectId ?? null
      const runtimeOrgId = probeResult?.runtimeOrgId ?? null

      const effectivePid = runtimeProjectId ?? dbProjectId

      const costs = {
        "7d":  costs7d.projectSpend.get(effectivePid ?? "")  ?? 0,
        "30d": costs30d.projectSpend.get(effectivePid ?? "") ?? 0,
        "90d": costs90d.projectSpend.get(effectivePid ?? "") ?? 0,
      }
      const usageEntry90d = usage90d.usageMap.get(effectivePid ?? "")

      const orgProject = orgProjectsResult.projects.find((p) => p.id === (runtimeProjectId ?? dbProjectId))
      const dbMatchesRuntime = dbProjectId && runtimeProjectId ? dbProjectId === runtimeProjectId : null

      // Determine verdict
      let verdict = "UNKNOWN"
      if (!dbProjectId) {
        verdict = "NO_PROJECT_ID"
      } else if (probeResult?.httpStatus === 401) {
        verdict = "SERVICE_KEY_EXPIRED — key returned 401, needs rotation"
      } else if (probeResult?.httpStatus === 403) {
        verdict = "SERVICE_KEY_FORBIDDEN — key returned 403"
      } else if (dbMatchesRuntime === false) {
        verdict = "DB_MISMATCH — API calls go to different project than stored in DB"
      } else if (runtimeOrgId && adminKeyInfo.orgId && runtimeOrgId !== adminKeyInfo.orgId) {
        verdict = "CROSS_ORG — service key belongs to different org than admin key"
      } else if (costs["90d"] === 0 && !usageEntry90d) {
        verdict = "ZERO_ACTIVITY_90D — no cost or usage in 90 days"
      } else if (costs["90d"] === 0 && usageEntry90d) {
        verdict = "USAGE_BUT_NO_COST — tokens used but Costs API omitting project"
      } else if (costs["90d"] > 0) {
        verdict = "OK — cost tracked"
      }

      return {
        companyName: row.name,
        companyId: row.id,
        dbProjectId: dbProjectId ?? "(none)",
        dbDecryptStatus,
        keyFormat,
        extractError,
        probe: probeResult
          ? {
              runtimeProjectId: probeResult.runtimeProjectId,
              runtimeOrgId: probeResult.runtimeOrgId,
              httpStatus: probeResult.httpStatus,
              keyType: probeResult.keyType,
              keyPrefix: probeResult.keyPrefix,
              error: probeResult.error,
              errorBody: probeResult.errorBody,
            }
          : null,
        runtimeProjectId: runtimeProjectId ?? null,
        runtimeOrgId: runtimeOrgId ?? null,
        dbMatchesRuntime,
        orgProjectName: orgProject?.name ?? null,
        orgProjectStatus: orgProject?.status ?? null,
        inOrgList: !!orgProject,
        sameOrgAsAdminKey: runtimeOrgId && adminKeyInfo.orgId ? runtimeOrgId === adminKeyInfo.orgId : null,
        costs,
        usage90d: usageEntry90d
          ? { ...usageEntry90d, totalTokens: usageEntry90d.input + usageEntry90d.output }
          : null,
        verdict,
      }
    })
  )

  // Build project matrix
  const allProjectIds = new Set<string>([
    ...orgProjectsResult.projects.map((p) => p.id),
    ...costs90d.projectSpend.keys(),
    ...usage90d.usageMap.keys(),
  ])
  const dbProjectIds = new Set(companies.map((c) => c.dbProjectId).filter((p) => p !== "(none)"))

  const projectMatrix = Array.from(allProjectIds).map((pid) => {
    const orgP = orgProjectsResult.projects.find((p) => p.id === pid)
    const company = companies.find((c) => c.dbProjectId === pid || c.runtimeProjectId === pid)
    const u90 = usage90d.usageMap.get(pid)
    return {
      projectId: pid,
      projectName: orgP?.name ?? "(not in org list)",
      orgStatus: orgP?.status ?? "not_listed",
      inDb: dbProjectIds.has(pid),
      companyName: company?.companyName ?? null,
      costUsd: {
        "7d":  costs7d.projectSpend.get(pid)  ?? 0,
        "30d": costs30d.projectSpend.get(pid) ?? 0,
        "90d": costs90d.projectSpend.get(pid) ?? 0,
      },
      usageFound: {
        "7d":  usage7d.usageMap.has(pid),
        "30d": usage30d.usageMap.has(pid),
        "90d": usage90d.usageMap.has(pid),
      },
      usageTokens90d: u90 ? u90.input + u90.output : 0,
      lastCostSync: null as string | null,
    }
  }).sort((a, b) => b.costUsd["90d"] - a.costUsd["90d"])

  try {
    const syncRows = (await DatabaseService.query(
      `SELECT openai_project_id, MAX(synced_at) AS last_synced FROM openai_cost_sync GROUP BY openai_project_id`
    )) as Array<{ openai_project_id: string; last_synced: string }>
    const syncMap = new Map(syncRows.map((r) => [r.openai_project_id, r.last_synced]))
    for (const p of projectMatrix) p.lastCostSync = syncMap.get(p.projectId) ?? null
  } catch { /* table may not exist */ }

  const apiErrors = {
    adminKeyOrg: adminKeyInfo.error,
    orgProjects:  orgProjectsResult.error,
    costs7d:   costs7d.error,
    costs30d:  costs30d.error,
    costs90d:  costs90d.error,
    usage7d:   usage7d.error,
    usage30d:  usage30d.error,
    usage90d:  usage90d.error,
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),

    // Admin key identity — critical for org-mismatch diagnosis
    adminKey: {
      keyType:  adminKeyInfo.keyType,
      orgId:    adminKeyInfo.orgId,
      orgName:  adminKeyInfo.orgName,
      error:    adminKeyInfo.error,
      rawOrgResponse: adminKeyInfo.rawOrgResponse,
    },

    apiErrors,

    summary: {
      orgProjectsVisible:  orgProjectsResult.projects.length,
      costsApiProjects7d:  costs7d.projectSpend.size,
      costsApiProjects30d: costs30d.projectSpend.size,
      costsApiProjects90d: costs90d.projectSpend.size,
      usageApiProjects7d:  usage7d.usageMap.size,
      usageApiProjects30d: usage30d.usageMap.size,
      usageApiProjects90d: usage90d.usageMap.size,
      dbCompanies:         companies.length,
    },

    projectMatrix,
    companies,
    orgProjects: orgProjectsResult.projects,
  })
}

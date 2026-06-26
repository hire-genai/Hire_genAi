/**
 * Deep probe: calls OpenAI Costs API, Usage API (multiple param formats),
 * org projects list, and service account key probes for specific companies.
 *
 * GET /api/admin/openai-usage-probe?days=90
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession, unauthorizedResponse } from "@/lib/admin-auth"
import { DatabaseService } from "@/lib/database"
import { decrypt } from "@/lib/encryption"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get("authorization") === `Bearer ${secret}`
}

async function rawFetch(url: string, adminKey: string): Promise<{
  url: string
  status: number
  requestId: string | null
  body: any
  rawText: string
}> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${adminKey}` } })
    const requestId = res.headers.get("x-request-id") ?? null
    const rawText = await res.text()
    let body: any = rawText
    try { body = JSON.parse(rawText) } catch { /* keep as string */ }
    return { url, status: res.status, requestId, body, rawText: rawText.slice(0, 800) }
  } catch (err: any) {
    return { url, status: 0, requestId: null, body: null, rawText: err.message }
  }
}

function aggregateCosts(data: any[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const bucket of data ?? []) {
    for (const r of bucket.results ?? []) {
      if (!r.project_id) continue
      m.set(r.project_id, (m.get(r.project_id) ?? 0) + (Number(r.amount?.value) || 0))
    }
  }
  return m
}

function aggregateUsage(data: any[]): Map<string, { input: number; output: number; requests: number }> {
  const m = new Map<string, { input: number; output: number; requests: number }>()
  for (const bucket of data ?? []) {
    for (const r of bucket.results ?? []) {
      if (!r.project_id) continue
      const cur = m.get(r.project_id) ?? { input: 0, output: 0, requests: 0 }
      m.set(r.project_id, {
        input:    cur.input    + (r.input_tokens       || 0),
        output:   cur.output   + (r.output_tokens      || 0),
        requests: cur.requests + (r.num_model_requests || 0),
      })
    }
  }
  return m
}

function extractKey(raw: string): string | null {
  try {
    const plain = decrypt(raw).trim()
    if (plain.startsWith("{")) {
      const obj = JSON.parse(plain)
      return obj.value || obj.apiKey || obj.api_key || obj.key || null
    }
    return plain
  } catch {
    return raw.startsWith("sk-") ? raw : null
  }
}

async function probeServiceKey(key: string): Promise<{
  httpStatus: number
  runtimeProject: string | null
  runtimeOrg: string | null
  keyType: string
  error: string | null
  errorBody: string | null
}> {
  const keyType = key.startsWith("sk-admin-") ? "admin"
    : key.startsWith("sk-proj-") ? "project"
    : key.startsWith("sk-svcacct-") ? "service_account"
    : "unknown"
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    })
    const runtimeProject = res.headers.get("openai-project") ?? null
    const runtimeOrg     = res.headers.get("openai-organization") ?? null
    if (!res.ok) {
      const body = await res.text()
      return { httpStatus: res.status, runtimeProject, runtimeOrg, keyType, error: `HTTP ${res.status}`, errorBody: body.slice(0, 400) }
    }
    return { httpStatus: res.status, runtimeProject, runtimeOrg, keyType, error: null, errorBody: null }
  } catch (err: any) {
    return { httpStatus: 0, runtimeProject: null, runtimeOrg: null, keyType, error: err.message, errorBody: null }
  }
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    const user = await verifyAdminSession(req)
    if (!user) return unauthorizedResponse()
  }

  const adminKey = process.env.OPENAI_ADMIN_KEY
  if (!adminKey) return NextResponse.json({ ok: false, error: "OPENAI_ADMIN_KEY not set" }, { status: 500 })

  const urlObj = new URL(req.url)
  const days   = Math.max(1, parseInt(urlObj.searchParams.get("days") || "90", 10))
  const nowUnix   = Math.floor(Date.now() / 1000)
  const startUnix = nowUnix - days * 86400

  const BASE   = "https://api.openai.com/v1"
  const orgUrl = `${BASE}/organization/projects?limit=100`

  // ── Crawl ALL pages of Costs API, keeping raw text for search ─────────────
  const TARGET_PROJECT = "proj_UEp6BSOr4RXlzwkOq2BVMhqL" // Applied Intelligence
  async function crawlCostsRaw(): Promise<{
    httpStatus: number
    requestId: string | null
    errorBody: string | null
    pages: number
    totalBuckets: number
    totalResultRows: number
    nullProjectIdRows: number
    nullProjectIdCostUsd: number
    targetFoundInRaw: boolean        // searched raw text for TARGET_PROJECT
    targetFoundInParsed: boolean     // found after iterating results[]
    allProjectIds: string[]          // every distinct project_id seen (incl. null→"NULL")
    rawFirstPageSample: string       // first 3KB of page 1 to inspect structure
    perPageSummary: Array<{ page: number; httpStatus: number; buckets: number; rows: number; hasMore: boolean }>
  }> {
    let pageNum = 0
    let cursor: string | null = null
    let safety = 0
    let firstStatus = 0
    let firstRequestId: string | null = null
    let firstErrorBody: string | null = null
    let rawFirstPageSample = ""
    let totalBuckets = 0
    let totalResultRows = 0
    let nullRows = 0
    let nullCost = 0
    let targetInRaw = false
    let targetInParsed = false
    const projectIdSet = new Set<string>()
    const perPageSummary: Array<{ page: number; httpStatus: number; buckets: number; rows: number; hasMore: boolean }> = []

    while (safety++ < 50) {
      pageNum++
      const p = new URLSearchParams({
        start_time: String(startUnix),
        end_time:   String(nowUnix),
        bucket_width: "1d",
        limit: "180",
      })
      p.append("group_by[]", "project_id")
      if (cursor) p.set("page", cursor)

      const r = await rawFetch(`${BASE}/organization/costs?${p.toString()}`, adminKey as string)

      if (pageNum === 1) {
        firstStatus    = r.status
        firstRequestId = r.requestId
        firstErrorBody = r.status !== 200 ? r.rawText : null
        rawFirstPageSample = r.rawText.slice(0, 3000)
      }

      // Search raw text for target project ID
      if (r.rawText.includes(TARGET_PROJECT)) targetInRaw = true

      if (r.status !== 200) break

      const data: any[] = r.body?.data ?? []
      totalBuckets += data.length
      let pageRows = 0
      for (const bucket of data) {
        for (const result of bucket.results ?? []) {
          totalResultRows++
          pageRows++
          const pid: string | null = result.project_id ?? null
          if (!pid) {
            nullRows++
            nullCost += Number(result.amount?.value) || 0
          } else {
            projectIdSet.add(pid)
            if (pid === TARGET_PROJECT) targetInParsed = true
          }
        }
      }

      perPageSummary.push({
        page: pageNum,
        httpStatus: r.status,
        buckets: data.length,
        rows: pageRows,
        hasMore: !!r.body?.has_more,
      })

      if (!r.body?.has_more || !r.body?.next_page) break
      cursor = r.body.next_page
    }

    return {
      httpStatus: firstStatus,
      requestId:  firstRequestId,
      errorBody:  firstErrorBody,
      pages: pageNum,
      totalBuckets,
      totalResultRows,
      nullProjectIdRows: nullRows,
      nullProjectIdCostUsd: nullCost,
      targetFoundInRaw:    targetInRaw,
      targetFoundInParsed: targetInParsed,
      allProjectIds: Array.from(projectIdSet),
      rawFirstPageSample,
      perPageSummary,
    }
  }

  // ── Usage API with correct limit (max 31 per page for bucket_width=1d) ────
  async function fetchUsagePaginated(): Promise<{
    allData: any[]
    pages: number
    firstStatus: number
    firstErrorBody: string | null
    firstRequestId: string | null
  }> {
    const allData: any[] = []
    let page: string | null = null
    let safety = 0
    let firstStatus = 0
    let firstErrorBody: string | null = null
    let firstRequestId: string | null = null

    while (safety++ < 20) {
      const p = new URLSearchParams({
        start_time: String(startUnix),
        end_time:   String(nowUnix),
        bucket_width: "1d",
        limit: "31",
      })
      p.append("group_by[]", "project_id")
      if (page) p.set("page", page)

      const r = await rawFetch(`${BASE}/organization/usage/completions?${p.toString()}`, adminKey as string)
      if (safety === 1) {
        firstStatus      = r.status
        firstRequestId   = r.requestId
        firstErrorBody   = r.status !== 200 ? r.rawText : null
      }
      if (r.status !== 200) break

      const data = r.body?.data ?? []
      allData.push(...data)
      if (!r.body?.has_more || !r.body?.next_page) break
      page = r.body.next_page
    }

    return { allData, pages: safety, firstStatus, firstErrorBody, firstRequestId }
  }

  // ── Fire all in parallel ──────────────────────────────────────────────────
  const [costsRaw, usageFetched, orgResult, companyRows] = await Promise.all([
    crawlCostsRaw(),
    fetchUsagePaginated(),
    rawFetch(orgUrl, adminKey as string),
    DatabaseService.query(
      `SELECT id, name, openai_project_id, openai_service_account_key FROM companies ORDER BY name`
    ) as Promise<Array<{ id: string; name: string; openai_project_id: string | null; openai_service_account_key: string | null }>>,
  ])

  // ── Aggregate ─────────────────────────────────────────────────────────────
  // Re-fetch aggregated costs from a fresh crawl would double the API calls;
  // rebuild the map from what we already crawled by re-running aggregation
  // but we don't have structured data from crawlCostsRaw — do a second lighter call
  // for the per-company section only if needed. For now use costsRaw.allProjectIds for matching.
  const costsMap = new Map<string, number>()
  {
    // We need amounts per project — crawlCostsRaw parsed them already into projectIdSet
    // but not amounts. Do a quick non-raw aggregation pass from a second fetch is wasteful.
    // Instead, let's fetch page 1 again with short window and build map from costsRaw.
    // Actually, the simplest approach: crawlCostsRaw already has all data; add cost accumulation.
    // But we stripped structured data. Let me do it here with a lightweight re-parse.
    // Since we have rawFirstPageSample only, rebuild via a dedicated small helper:
    // Just do a fresh paginated fetch for amounts (we need per-company profit calc).
    // NOTE: this is a diagnostic endpoint so double-fetching is acceptable.
    const p = new URLSearchParams({
      start_time: String(startUnix), end_time: String(nowUnix),
      bucket_width: "1d", limit: "180",
    })
    p.append("group_by[]", "project_id")
    let s2 = 0
    while (s2++ < 50) {
      const r2 = await rawFetch(`${BASE}/organization/costs?${p.toString()}`, adminKey as string)
      if (r2.status !== 200) break
      for (const b of r2.body?.data ?? []) {
        for (const r of b.results ?? []) {
          if (!r.project_id) continue
          costsMap.set(r.project_id, (costsMap.get(r.project_id) ?? 0) + (Number(r.amount?.value) || 0))
        }
      }
      if (!r2.body?.has_more || !r2.body?.next_page) break
      p.set("page", r2.body.next_page)
    }
  }
  const usageMap = usageFetched.firstStatus === 200
    ? aggregateUsage(usageFetched.allData)
    : new Map<string, { input: number; output: number; requests: number }>()
  const orgProjects: Array<{ id: string; name: string; status: string }> = orgResult.status === 200 ? (orgResult.body?.data ?? []) : []

  // ── Probe service keys for each company ───────────────────────────────────
  const companyProbes = await Promise.all(
    companyRows.map(async (row) => {
      let dbProjectId: string | null = null
      try { dbProjectId = row.openai_project_id ? decrypt(row.openai_project_id) : null } catch { dbProjectId = null }

      let probeResult: Awaited<ReturnType<typeof probeServiceKey>> | null = null
      let keyExtractError: string | null = null
      if (row.openai_service_account_key) {
        const key = extractKey(row.openai_service_account_key)
        if (key) {
          probeResult = await probeServiceKey(key)
        } else {
          keyExtractError = "Could not extract key from stored value"
        }
      }

      const orgProject = orgProjects.find(p => p.id === dbProjectId)
      const costUsd    = costsMap.get(dbProjectId ?? "") ?? 0
      const usage      = usageMap.get(dbProjectId ?? "")

      return {
        companyName:    row.name,
        dbProjectId:    dbProjectId ?? "(none)",
        orgProjectName: orgProject?.name ?? "(not in org list)",
        inOrgList:      !!orgProject,
        keyExtractError,
        probe: probeResult,
        // Does runtime key match stored project ID?
        runtimeMatchesDb: probeResult?.runtimeProject && dbProjectId
          ? probeResult.runtimeProject === dbProjectId
          : null,
        costUsd,
        inCostsApi: costsMap.has(dbProjectId ?? ""),
        inUsageApi: usageMap.has(dbProjectId ?? ""),
        usageTokens: usage ? usage.input + usage.output : 0,
        usageRequests: usage?.requests ?? 0,
        verdict: !probeResult
          ? "KEY_UNREADABLE"
          : probeResult.httpStatus === 401
          ? "KEY_EXPIRED — 401 returned, key needs rotation"
          : probeResult.httpStatus === 403
          ? "KEY_FORBIDDEN — 403 returned"
          : probeResult.runtimeProject && dbProjectId && probeResult.runtimeProject !== dbProjectId
          ? `KEY_WRONG_PROJECT — key routes to ${probeResult.runtimeProject}, DB has ${dbProjectId}`
          : costUsd > 0
          ? "ACTIVE — cost data found"
          : (usage && usage.input + usage.output > 0)
          ? "USAGE_NO_COST — tokens found, not in Costs API"
          : "SILENT — key valid but zero activity in window",
      }
    })
  )

  // ── Comparison across all sources ─────────────────────────────────────────
  const allIds = new Set([
    ...costsMap.keys(),
    ...usageMap.keys(),
    ...orgProjects.map(p => p.id),
  ])
  const comparison = Array.from(allIds).map(pid => {
    const org   = orgProjects.find(p => p.id === pid)
    const u     = usageMap.get(pid)
    const company = companyRows.find(r => {
      try { return r.openai_project_id ? decrypt(r.openai_project_id) === pid : false } catch { return false }
    })
    return {
      projectId:   pid,
      projectName: org?.name ?? "(not in org list)",
      orgStatus:   org?.status ?? "not_listed",
      companyName: company?.name ?? null,
      inCostsApi:  costsMap.has(pid),
      inUsageApi:  usageMap.has(pid),
      inOrgList:   !!org,
      inDb:        !!company,
      costUsd:     costsMap.get(pid) ?? 0,
      totalTokens: u ? u.input + u.output : 0,
      requests:    u?.requests ?? 0,
      verdict: costsMap.has(pid) && usageMap.has(pid) ? "BOTH"
             : costsMap.has(pid)                      ? "COSTS_ONLY"
             : usageMap.has(pid)                      ? "USAGE_ONLY — Costs API lag confirmed"
             : "NEITHER — no API traffic detected",
    }
  }).sort((a, b) => b.costUsd - a.costUsd || b.totalTokens - a.totalTokens)

  return NextResponse.json({
    ok: true,
    windowDays: days,
    startIso: new Date(startUnix * 1000).toISOString(),
    endIso:   new Date(nowUnix   * 1000).toISOString(),

    // ── Admin key type ────────────────────────────────────────────────────
    adminKeyType: adminKey.startsWith("sk-admin-") ? "admin (correct)"
                : adminKey.startsWith("sk-proj-")  ? "PROJECT KEY — wrong, needs sk-admin-..."
                : "unknown format",

    // ── Costs API raw crawl ───────────────────────────────────────────────
    costsApi: {
      httpStatus:            costsRaw.httpStatus,
      requestId:             costsRaw.requestId,
      errorBody:             costsRaw.errorBody,
      pagesFetched:          costsRaw.pages,
      totalBuckets:          costsRaw.totalBuckets,
      totalResultRows:       costsRaw.totalResultRows,
      nullProjectIdRows:     costsRaw.nullProjectIdRows,
      nullProjectIdCostUsd:  costsRaw.nullProjectIdCostUsd,
      targetFoundInRaw:      costsRaw.targetFoundInRaw,
      targetFoundInParsed:   costsRaw.targetFoundInParsed,
      allProjectIds:         costsRaw.allProjectIds,
      rawFirstPageSample:    costsRaw.rawFirstPageSample,
      perPageSummary:        costsRaw.perPageSummary,
      projectCount: costsMap.size,
      projects: Array.from(costsMap.entries()).map(([id, usd]) => ({ projectId: id, costUsd: usd })),
    },

    // ── Usage API ─────────────────────────────────────────────────────────
    usageApi: {
      httpStatus:   usageFetched.firstStatus,
      requestId:    usageFetched.firstRequestId,
      errorBody:    usageFetched.firstErrorBody,
      pagesFetched: usageFetched.pages,
      projectCount: usageMap.size,
      projects: Array.from(usageMap.entries()).map(([id, u]) => ({
        projectId:   id,
        inputTokens: u.input,
        outputTokens: u.output,
        totalTokens:  u.input + u.output,
        requests:     u.requests,
      })),
    },

    // ── Org project list ──────────────────────────────────────────────────
    orgProjects: {
      httpStatus: orgResult.status,
      errorBody:  orgResult.status !== 200 ? orgResult.rawText : null,
      count:      orgProjects.length,
      projects:   orgProjects,
    },

    // ── Per-company service key probe + traffic check ─────────────────────
    companyProbes,

    // ── Cross-source comparison ───────────────────────────────────────────
    comparison,
  })
}

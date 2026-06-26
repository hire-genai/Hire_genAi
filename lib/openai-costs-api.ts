/**
 * OpenAI Costs API client + sync.
 *
 * Endpoint:
 *   GET https://api.openai.com/v1/organization/costs
 *   ?start_time=<unix_seconds>
 *   &end_time=<unix_seconds>
 *   &bucket_width=1d
 *   &group_by[]=project_id
 *   &limit=180
 *   &page=<cursor>
 *
 * Auth: Bearer OPENAI_ADMIN_KEY (sk-admin-...). Project keys cannot access this.
 *
 * Storage: results upserted into `openai_cost_sync` (the only table this writes).
 * Status of the most recent sync is derived from MAX(synced_at) on that table.
 */

import { DatabaseService } from "./database"

const COSTS_URL  = "https://api.openai.com/v1/organization/costs"
const USAGE_URL  = "https://api.openai.com/v1/organization/usage/completions"
const MAX_RETRIES = 3

// GPT-4o pricing used for usage-based estimates (matches openai_model_pricing table)
const GPT4O_INPUT_PER_1M  = 2.50
const GPT4O_OUTPUT_PER_1M = 10.00

export interface OpenAICostBucket {
  start_time: number
  end_time: number
  results: Array<{
    amount: { value: number; currency: string }
    project_id: string | null
    line_item: string | null
  }>
}

export interface SyncResult {
  ok: boolean
  bucketsFetched: number
  rowsUpserted: number
  projectsMatched: number
  projectsUnmatched: number
  totalCostUsd: number
  startTimeParam: string
  endTimeParam: string
  error?: string
  unmatchedProjects?: string[]
  // Usage-estimate fallback stats
  usageEstimateRowsUpserted: number
  usageEstimateProjectsWritten: number
  usageEstimateStaleRowsDeleted: number
  tokenMetadataRowsUpdated: number
}

/**
 * Fetch a URL with exponential backoff retry on 5xx errors.
 * Logs OpenAI request-id from error responses for support escalation.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string
): Promise<Response> {
  let lastErr: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init)

    if (res.ok) return res

    // Capture OpenAI request-id for debugging
    const requestId = res.headers.get("x-request-id") ?? res.headers.get("request-id") ?? "unknown"
    let errBody = ""
    try { errBody = await res.text() } catch { /* ignore */ }

    console.error(
      `[openai-fetch] ${label} attempt ${attempt}/${MAX_RETRIES} failed` +
      ` — HTTP ${res.status} | openai-request-id: ${requestId}` +
      ` | body: ${errBody.slice(0, 400)}`
    )

    // Don't retry 4xx (auth/bad request) — only 5xx
    if (res.status < 500) {
      throw new Error(`OpenAI ${label} HTTP ${res.status} (request-id: ${requestId}): ${errBody.slice(0, 300)}`)
    }

    lastErr = new Error(`OpenAI ${label} HTTP ${res.status} (request-id: ${requestId}): ${errBody.slice(0, 300)}`)

    if (attempt < MAX_RETRIES) {
      const delayMs = 1000 * 2 ** (attempt - 1) // 1s, 2s, 4s
      console.warn(`[openai-fetch] ${label} retrying in ${delayMs}ms…`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  throw lastErr ?? new Error(`${label} failed after ${MAX_RETRIES} attempts`)
}

export async function fetchOpenAICosts(opts: {
  startTimeUnix: number
  endTimeUnix: number
  adminKey: string
}): Promise<OpenAICostBucket[]> {
  const { startTimeUnix, endTimeUnix, adminKey } = opts
  const buckets: OpenAICostBucket[] = []
  let page: string | null = null
  let safety = 0

  const startIso = new Date(startTimeUnix * 1000).toISOString()
  const endIso = new Date(endTimeUnix * 1000).toISOString()

  console.log(
    `[openai-costs] fetchOpenAICosts params:` +
    ` start_time=${startTimeUnix} (${startIso})` +
    ` end_time=${endTimeUnix} (${endIso})` +
    ` group_by[]=project_id bucket_width=1d`
  )

  while (safety++ < 50) {
    const params = new URLSearchParams()
    params.set("start_time", String(startTimeUnix))
    params.set("end_time", String(endTimeUnix))
    params.set("bucket_width", "1d")
    params.append("group_by[]", "project_id")
    params.set("limit", "180")
    if (page) params.set("page", page)

    const fullUrl = `${COSTS_URL}?${params.toString()}`
    console.log(`[openai-costs] GET ${fullUrl.replace(String(startTimeUnix), "<start>").replace(String(endTimeUnix), "<end>")}`)

    const res = await fetchWithRetry(
      fullUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
      },
      `Costs API page=${page ?? "1"}`
    )

    const json = (await res.json()) as {
      data: OpenAICostBucket[]
      has_more: boolean
      next_page: string | null
    }

    if (Array.isArray(json.data)) buckets.push(...json.data)
    console.log(`[openai-costs] page received: ${json.data?.length ?? 0} buckets, has_more=${json.has_more}`)
    if (!json.has_more || !json.next_page) break
    page = json.next_page
  }

  console.log(`[openai-costs] fetchOpenAICosts complete: ${buckets.length} total buckets`)
  return buckets
}

/**
 * Fetch token usage from the OpenAI Usage API (separate from Costs API).
 * Useful as a fallback when the Costs API returns 500 or omits projects.
 *
 * Endpoint: GET /v1/organization/usage/completions
 */
interface UsageBucket {
  start_time: number
  end_time: number
  results: Array<{
    project_id: string | null
    input_tokens: number
    output_tokens: number
    num_model_requests: number
  }>
}

/**
 * Fetch per-day token usage from the OpenAI Usage API with full pagination.
 * Returns raw daily buckets so callers can correlate tokens to specific dates.
 * Max limit for bucket_width=1d is 31 — we paginate automatically.
 */
export async function fetchOpenAIUsage(opts: {
  startTimeUnix: number
  endTimeUnix: number
  adminKey: string
}): Promise<UsageBucket[]> {
  const { startTimeUnix, endTimeUnix, adminKey } = opts
  const allBuckets: UsageBucket[] = []
  let page: string | null = null
  let safety = 0

  console.log(`[openai-usage] fetchOpenAIUsage start=${new Date(startTimeUnix * 1000).toISOString()}`)

  while (safety++ < 50) {
    const params = new URLSearchParams()
    params.set("start_time", String(startTimeUnix))
    params.set("end_time",   String(endTimeUnix))
    params.set("bucket_width", "1d")
    params.set("limit", "31")  // max allowed for bucket_width=1d
    params.append("group_by[]", "project_id")
    if (page) params.set("page", page)

    let res: Response
    try {
      res = await fetchWithRetry(
        `${USAGE_URL}?${params.toString()}`,
        { method: "GET", headers: { Authorization: `Bearer ${adminKey}` } },
        `Usage API page=${page ?? "1"}`
      )
    } catch (err: any) {
      console.error(`[openai-usage] Usage API failed: ${err.message}`)
      break
    }

    const json = (await res.json()) as { data: UsageBucket[]; has_more: boolean; next_page: string | null }
    if (Array.isArray(json.data)) allBuckets.push(...json.data)
    console.log(`[openai-usage] page received: ${json.data?.length ?? 0} buckets, has_more=${json.has_more}`)
    if (!json.has_more || !json.next_page) break
    page = json.next_page
  }

  console.log(`[openai-usage] fetchOpenAIUsage complete: ${allBuckets.length} total buckets`)
  return allBuckets
}

/**
 * Sync OpenAI cost buckets into openai_cost_sync. Idempotent — uses
 * UPSERT on (openai_project_id, date_bucket, line_item).
 *
 * @param lookbackDays  How many days back to fetch (default 7).
 */
export async function syncOpenAICosts(lookbackDays = 7): Promise<SyncResult> {
  const adminKey = process.env.OPENAI_ADMIN_KEY
  if (!adminKey) {
    throw new Error("OPENAI_ADMIN_KEY not configured")
  }

  const endMs = Date.now()
  const startMs = endMs - lookbackDays * 24 * 60 * 60 * 1000
  const startTimeUnix = Math.floor(startMs / 1000)
  const endTimeUnix = Math.floor(endMs / 1000)
  const startIso = new Date(startMs).toISOString()
  const endIso = new Date(endMs).toISOString()

  console.log(`[openai-costs-sync] Starting sync: ${startIso} → ${endIso}`)

  try {
    const buckets = await fetchOpenAICosts({ startTimeUnix, endTimeUnix, adminKey })

    const companyRows = (await DatabaseService.query(
      `SELECT id, name, openai_project_id FROM companies WHERE openai_project_id IS NOT NULL`
    )) as Array<{ id: string; name: string; openai_project_id: string }>
    const projectToCompany = new Map<string, string>()
    const { decrypt } = await import("./encryption")
    for (const r of companyRows) {
      try {
        const plainProjectId = decrypt(r.openai_project_id)
        projectToCompany.set(plainProjectId, r.id)
        console.log(`[openai-costs-sync] Company "${r.name}" → decrypted project_id: ${plainProjectId}`)
      } catch {
        const looksPlain = /^proj_[A-Za-z0-9_-]+$/.test(r.openai_project_id)
        if (looksPlain) {
          projectToCompany.set(r.openai_project_id, r.id)
          console.warn(`[openai-costs-sync] Company "${r.name}" decrypt failed — using raw value: ${r.openai_project_id}`)
        } else {
          console.error(`[openai-costs-sync] Company "${r.name}" decrypt failed — raw value not a project ID (len=${r.openai_project_id.length}). Will NOT match.`)
        }
      }
    }
    console.log(`[openai-costs-sync] Mapped ${projectToCompany.size} project IDs from ${companyRows.length} companies`)

    const allApiProjectIds = new Set<string>()
    let nullProjectCost = 0
    let nullProjectRows = 0
    for (const b of buckets) {
      for (const r of b.results || []) {
        if (r.project_id) {
          allApiProjectIds.add(r.project_id)
        } else {
          nullProjectCost += Number(r.amount?.value) || 0
          nullProjectRows++
        }
      }
    }
    console.log(`[openai-costs-sync] OpenAI Costs API returned ${allApiProjectIds.size} distinct project IDs:`, Array.from(allApiProjectIds))
    if (nullProjectRows > 0) {
      console.warn(`[openai-costs-sync] ⚠️  ${nullProjectRows} rows with project_id=null (unattributed) — $${nullProjectCost.toFixed(4)} cost being SKIPPED. This is why some projects are missing.`)
    } else {
      console.log(`[openai-costs-sync] No null project_id rows found.`)
    }

    let rowsUpserted = 0
    let totalCost = 0
    const matchedProjects = new Set<string>()
    const unmatchedProjects = new Set<string>()

    for (const bucket of buckets) {
      const dateBucket = new Date(bucket.start_time * 1000).toISOString().slice(0, 10)

      for (const result of bucket.results || []) {
        const projectId = result.project_id || "unknown"
        const amount = Number(result.amount?.value) || 0
        const lineItem = result.line_item || "unknown"
        const companyId = projectToCompany.get(projectId) || null

        if (companyId) matchedProjects.add(projectId)
        else if (projectId !== "unknown") unmatchedProjects.add(projectId)

        totalCost += amount

        await DatabaseService.query(
          `INSERT INTO openai_cost_sync
             (company_id, openai_project_id, date_bucket, amount_usd, line_item, raw_data, synced_at)
           VALUES ($1::uuid, $2, $3::date, $4, $5, $6::jsonb, NOW())
           ON CONFLICT (openai_project_id, date_bucket, line_item)
           DO UPDATE SET
             amount_usd = EXCLUDED.amount_usd,
             company_id = EXCLUDED.company_id,
             raw_data   = EXCLUDED.raw_data,
             synced_at  = NOW()`,
          [
            companyId,
            projectId,
            dateBucket,
            amount,
            lineItem,
            JSON.stringify({ start_time: bucket.start_time, end_time: bucket.end_time, ...result }),
          ]
        )
        rowsUpserted++
      }
    }

    console.log(`[openai-costs-sync] Done: ${rowsUpserted} rows, ${matchedProjects.size} matched, ${unmatchedProjects.size} unmatched, $${totalCost.toFixed(4)}`)

    // ── Step 2: Fetch Usage API — drives both token backfill AND estimate fallback ──
    let usageEstimateRowsUpserted = 0
    let usageEstimateProjectsWritten = 0
    let usageEstimateStaleRowsDeleted = 0
    let tokenMetadataRowsUpdated = 0

    try {
      const usageBuckets = await fetchOpenAIUsage({ startTimeUnix, endTimeUnix, adminKey })

      // Build: projectId → [{ date, input, output, requests }]
      type DayUsage = { date: string; input: number; output: number; requests: number }
      const usageByProjectDate = new Map<string, DayUsage[]>()
      for (const bucket of usageBuckets) {
        const date = new Date(bucket.start_time * 1000).toISOString().slice(0, 10)
        for (const r of bucket.results ?? []) {
          if (!r.project_id) continue
          if (!usageByProjectDate.has(r.project_id)) usageByProjectDate.set(r.project_id, [])
          usageByProjectDate.get(r.project_id)!.push({
            date,
            input:    r.input_tokens        || 0,
            output:   r.output_tokens       || 0,
            requests: r.num_model_requests  || 0,
          })
        }
      }

      console.log(`[openai-costs-sync] Usage API returned data for ${usageByProjectDate.size} projects`)

      for (const [projectId, days] of usageByProjectDate.entries()) {
        const companyId = projectToCompany.get(projectId)
        if (!companyId) continue

        const inCostsApiAlready = matchedProjects.has(projectId)

        for (const { date, input, output, requests } of days) {
          const total = input + output

          if (inCostsApiAlready) {
            // ── 2a: Merge token metadata into existing costs_api rows ──────────
            // UPDATE all rows for this project+date (may be multiple line_items).
            // amount_usd and cost_source are intentionally NOT touched.
            const updated = await DatabaseService.query(
              `UPDATE openai_cost_sync
               SET input_tokens  = $3,
                   output_tokens = $4,
                   total_tokens  = $5,
                   request_count = $6,
                   synced_at     = NOW()
               WHERE openai_project_id = $1
                 AND date_bucket = $2::date
                 AND cost_source = 'costs_api'`,
              [projectId, date, input, output, total, requests]
            ) as any
            tokenMetadataRowsUpdated += updated.rowCount ?? 0

            // Also clean up any stale estimate rows for this date (actual data is now present)
            const deleted = await DatabaseService.query(
              `DELETE FROM openai_cost_sync
               WHERE openai_project_id = $1 AND date_bucket = $2::date AND cost_source = 'usage_estimate'`,
              [projectId, date]
            ) as any
            usageEstimateStaleRowsDeleted += deleted.rowCount ?? 0

          } else {
            // ── 2b: No actual row yet — write / refresh usage estimate ─────────
            const estimatedUsd =
              (input  / 1_000_000) * GPT4O_INPUT_PER_1M +
              (output / 1_000_000) * GPT4O_OUTPUT_PER_1M

            await DatabaseService.query(
              `INSERT INTO openai_cost_sync
                 (company_id, openai_project_id, date_bucket, amount_usd, line_item,
                  cost_source, input_tokens, output_tokens, total_tokens, request_count,
                  raw_data, synced_at)
               VALUES ($1::uuid, $2, $3::date, $4, 'usage_estimate',
                       'usage_estimate', $5, $6, $7, $8, $9::jsonb, NOW())
               ON CONFLICT (openai_project_id, date_bucket, line_item)
               DO UPDATE SET
                 amount_usd    = EXCLUDED.amount_usd,
                 company_id    = EXCLUDED.company_id,
                 input_tokens  = EXCLUDED.input_tokens,
                 output_tokens = EXCLUDED.output_tokens,
                 total_tokens  = EXCLUDED.total_tokens,
                 request_count = EXCLUDED.request_count,
                 raw_data      = EXCLUDED.raw_data,
                 synced_at     = NOW()`,
              [
                companyId, projectId, date, estimatedUsd,
                input, output, total, requests,
                JSON.stringify({
                  source: "usage_estimate", input_tokens: input, output_tokens: output,
                  total_tokens: total, request_count: requests,
                  pricing: { model: "gpt-4o", input_per_1m: GPT4O_INPUT_PER_1M, output_per_1m: GPT4O_OUTPUT_PER_1M },
                }),
              ]
            )
            usageEstimateRowsUpserted++
          }
        }

        if (!inCostsApiAlready) usageEstimateProjectsWritten++
      }

      console.log(
        `[openai-costs-sync] Token metadata merged into ${tokenMetadataRowsUpdated} actual cost rows.`
      )
      console.log(
        `[openai-costs-sync] Usage estimates: ${usageEstimateRowsUpserted} rows written, ` +
        `${usageEstimateProjectsWritten} projects, ${usageEstimateStaleRowsDeleted} stale deleted`
      )
    } catch (usageErr: any) {
      console.warn(`[openai-costs-sync] Usage/token step failed (non-fatal): ${usageErr.message}`)
    }

    return {
      ok: true,
      bucketsFetched: buckets.length,
      rowsUpserted,
      projectsMatched: matchedProjects.size,
      projectsUnmatched: unmatchedProjects.size,
      totalCostUsd: totalCost,
      startTimeParam: startIso,
      endTimeParam: endIso,
      unmatchedProjects: Array.from(unmatchedProjects),
      usageEstimateRowsUpserted,
      usageEstimateProjectsWritten,
      usageEstimateStaleRowsDeleted,
      tokenMetadataRowsUpdated,
    }
  } catch (err: any) {
    console.error(`[openai-costs-sync] FAILED:`, err.message || err)
    return {
      ok: false,
      bucketsFetched: 0,
      rowsUpserted: 0,
      projectsMatched: 0,
      projectsUnmatched: 0,
      totalCostUsd: 0,
      startTimeParam: startIso,
      endTimeParam: endIso,
      error: err.message || String(err),
      usageEstimateRowsUpserted: 0,
      usageEstimateProjectsWritten: 0,
      usageEstimateStaleRowsDeleted: 0,
      tokenMetadataRowsUpdated: 0,
    }
  }
}

/** Most recent sync timestamp — derived from openai_cost_sync directly. */
export async function getLastSuccessfulSync(): Promise<Date | null> {
  try {
    const rows = (await DatabaseService.query(
      `SELECT MAX(synced_at) AS last_synced FROM openai_cost_sync`
    )) as Array<{ last_synced: string | null }>
    return rows[0]?.last_synced ? new Date(rows[0].last_synced) : null
  } catch {
    return null
  }
}

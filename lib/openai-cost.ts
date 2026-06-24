/**
 * Single source of truth for converting OpenAI token usage → USD cost.
 *
 * Pricing lives in the `openai_model_pricing` table (admin-editable). This
 * module caches the catalog in-memory for 5 minutes to avoid hitting the DB
 * on every OpenAI call.
 *
 * Used by:
 *   - CV parsing (lib/resume-parser.ts → app/api/resumes/parse/route.ts)
 *   - JD question generation (app/api/questions/generate/route.ts)
 *   - AI video interview (post-session token reconciliation)
 */

import { DatabaseService } from "./database"

export interface ModelPrice {
  model: string
  inputPricePer1M: number
  outputPricePer1M: number
  perMinutePrice: number | null
}

export interface CostCalculation {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  pricingSource: "model-catalog" | "fallback-default"
}

// In-memory cache
let priceCache: Map<string, ModelPrice> | null = null
let priceCacheLoadedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

const FALLBACK_PRICE: ModelPrice = {
  model: "gpt-4o",
  inputPricePer1M: 2.5,
  outputPricePer1M: 10.0,
  perMinutePrice: null,
}

async function loadPricing(): Promise<Map<string, ModelPrice>> {
  const now = Date.now()
  if (priceCache && now - priceCacheLoadedAt < CACHE_TTL_MS) {
    return priceCache
  }

  try {
    const rows = (await DatabaseService.query(
      `SELECT model, input_price_per_1m, output_price_per_1m, per_minute_price
       FROM openai_model_pricing`
    )) as Array<{
      model: string
      input_price_per_1m: string | number
      output_price_per_1m: string | number
      per_minute_price: string | number | null
    }>

    const map = new Map<string, ModelPrice>()
    for (const r of rows) {
      map.set(r.model, {
        model: r.model,
        inputPricePer1M: parseFloat(String(r.input_price_per_1m)),
        outputPricePer1M: parseFloat(String(r.output_price_per_1m)),
        perMinutePrice: r.per_minute_price != null ? parseFloat(String(r.per_minute_price)) : null,
      })
    }
    priceCache = map
    priceCacheLoadedAt = now
    return map
  } catch (err) {
    console.warn("[openai-cost] Failed to load pricing catalog; using fallback:", err)
    const map = new Map<string, ModelPrice>()
    map.set(FALLBACK_PRICE.model, FALLBACK_PRICE)
    return map
  }
}

/**
 * Convert token usage to USD cost for a given model.
 * Returns 0-filled result (with fallback marker) if model isn't in the catalog.
 */
export async function calculateOpenAICost(
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<CostCalculation> {
  const catalog = await loadPricing()
  const price = catalog.get(model) ?? FALLBACK_PRICE
  const pricingSource: CostCalculation["pricingSource"] =
    catalog.has(model) ? "model-catalog" : "fallback-default"

  const inputCost = (promptTokens / 1_000_000) * price.inputPricePer1M
  const outputCost = (completionTokens / 1_000_000) * price.outputPricePer1M

  return {
    model,
    promptTokens: promptTokens || 0,
    completionTokens: completionTokens || 0,
    totalTokens: (promptTokens || 0) + (completionTokens || 0),
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    pricingSource,
  }
}

/**
 * Estimate realtime / video interview cost when token usage isn't available.
 * Uses `per_minute_price` from the catalog if set, else returns 0.
 */
export async function estimateRealtimeMinuteCost(
  model: string,
  durationMinutes: number
): Promise<{ cost: number; pricingSource: string }> {
  const catalog = await loadPricing()
  const price = catalog.get(model)
  if (price?.perMinutePrice != null) {
    return {
      cost: price.perMinutePrice * durationMinutes,
      pricingSource: "model-catalog-per-minute",
    }
  }
  return { cost: 0, pricingSource: "fallback-no-rate" }
}

/** Test / admin helper to bust the in-memory cache after editing the catalog. */
export function invalidateOpenAIPriceCache(): void {
  priceCache = null
  priceCacheLoadedAt = 0
}

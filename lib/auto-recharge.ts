import { DatabaseService } from '@/lib/database'
import { checkAndAutoRechargeStripe } from '@/lib/auto-recharge-stripe'

import { randomUUID } from 'crypto'

/**
 * Check if auto-recharge should be triggered and charge using saved token.
 * 
 * This function:
 * 1. Fetches wallet_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold from company_billing
 * 2. Fetches customer_id and token_id from company_subscriptions
 * 3. If auto_recharge_enabled is false → returns early
 * 4. If wallet_balance >= auto_recharge_threshold → returns early
 * 5. Checks for pending/in-progress recharge to prevent duplicates (idempotency)
 * 6. Creates a direct payment using POST /v1/payments with saved token
 * 
 *
 * @param companyId - The company UUID to check and potentially auto-recharge
 * @param force - Optional parameter for testing purposes
 * @returns Object with success status and details
 */
// Cooldown period to prevent duplicate recharges (in milliseconds)
const RECHARGE_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export async function checkAndAutoRecharge(companyId: string, force = false): Promise<{
  success: boolean
  triggered: boolean
  message: string
  paymentId?: string
  amount?: number
  walletBalance?: number
}> {
  const idempotencyKey = randomUUID()
  
  try {
    // ─── 1. Fetch billing state + plan amount from active subscription ───
    const billingQuery = `
      SELECT
        cb.wallet_balance,
        cb.auto_recharge_enabled,
        cs.plan_amount
      FROM company_billing cb
      LEFT JOIN company_subscriptions cs ON cb.company_id = cs.company_id AND cs.status IN ('active', 'past_due')
      WHERE cb.company_id = $1::uuid
      LIMIT 1
    `

    const billingResult = await DatabaseService.query(billingQuery, [companyId])

    if (billingResult.length === 0) {
      return { success: true, triggered: false, message: 'No billing record found for company' }
    }

    const billing = billingResult[0]
    const walletBalance = parseFloat(billing.wallet_balance) || 0
    const autoRechargeEnabled = billing.auto_recharge_enabled || false
    // Amount always comes from the active plan; threshold is fixed at $10
    const autoRechargeAmount = billing.plan_amount ? parseFloat(billing.plan_amount) : null
    const autoRechargeThreshold = 10

    if (!autoRechargeAmount) {
      return { success: true, triggered: false, message: 'No active plan found — cannot determine recharge amount' }
    }

    console.log(`[Auto-Recharge] company=${companyId} balance=${walletBalance} threshold=${autoRechargeThreshold} amount=${autoRechargeAmount} enabled=${autoRechargeEnabled}`)

    // ─── 2. Check if auto-recharge is enabled ───
    if (!autoRechargeEnabled) {
      return {
        success: true,
        triggered: false,
        message: 'Auto-recharge is disabled'
      }
    }

    // ─── 3. Check if wallet balance is above threshold (bypass if force=true) ───
    if (!force && walletBalance >= autoRechargeThreshold) {
      return {
        success: true,
        triggered: false,
        message: `Wallet balance (${walletBalance}) is above threshold (${autoRechargeThreshold})`
      }
    }

    if (force) {
      console.log(`[Auto-Recharge] Force mode enabled - bypassing threshold check (balance: ${walletBalance}, threshold: ${autoRechargeThreshold})`)
    }

    // ─── 4. Idempotency check - prevent duplicate recharges ───
    const recentRechargeQuery = `
      SELECT id, status, created_at 
      FROM auto_recharge_transactions 
      WHERE company_id = $1::uuid 
        AND created_at > NOW() - INTERVAL '5 minutes'
        AND status IN ('created', 'authorized', 'captured')
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    const recentRecharge = await DatabaseService.query(recentRechargeQuery, [companyId])
    
    if (recentRecharge.length > 0) {
      const recent = recentRecharge[0]
      console.log(`[Auto-Recharge] Skipping - recent recharge found:`, {
        id: recent.id,
        status: recent.status,
        created_at: recent.created_at
      })
      return {
        success: true,
        triggered: false,
        message: `Auto-recharge already in progress or recently completed (status: ${recent.status})`
      }
    }

    // ─── 5. Use Stripe auto-recharge ───
    console.log(`[Auto-Recharge] Using Stripe auto-recharge for company ${companyId}`)
    return checkAndAutoRechargeStripe(companyId, force)

  } catch (error: any) {
    console.error('[Auto-Recharge] Error:', error)
    return {
      success: false,
      triggered: false,
      message: error.message || 'Failed to process auto-recharge'
    }
  }
}


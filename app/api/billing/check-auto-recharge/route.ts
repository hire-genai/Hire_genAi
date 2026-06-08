import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/check-auto-recharge
 * Check if auto-recharge should be triggered and process it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, currentBalance } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    console.log(`[Auto-Recharge Check] Company: ${companyId}, Balance: ${currentBalance}`)

    // Get auto-recharge settings
    const settings = await DatabaseService.query(
      `SELECT auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold 
       FROM auto_recharge_settings 
       WHERE company_id = $1::uuid`,
      [companyId]
    )

    if (settings.length === 0 || !settings[0].auto_recharge_enabled) {
      return NextResponse.json({
        autoRechargeTriggered: false,
        reason: 'Auto-recharge not enabled'
      })
    }

    const { auto_recharge_amount, auto_recharge_threshold } = settings[0]

    // Check if balance is below threshold
    if (currentBalance > auto_recharge_threshold) {
      return NextResponse.json({
        autoRechargeTriggered: false,
        reason: `Balance ${currentBalance} is above threshold ${auto_recharge_threshold}`
      })
    }

    console.log(`[Auto-Recharge] Triggering recharge: Balance ${currentBalance} < Threshold ${auto_recharge_threshold}`)

    // Process auto-recharge
    const result = await processAutoRecharge(companyId, auto_recharge_amount)

    return NextResponse.json({
      autoRechargeTriggered: true,
      rechargeAmount: auto_recharge_amount,
      newBalance: currentBalance + auto_recharge_amount,
      paymentId: result.paymentId,
      message: 'Auto-recharge successful'
    })

  } catch (error: any) {
    console.error('[Auto-Recharge Check] Error:', error)
    return NextResponse.json({ 
      error: 'Auto-recharge check failed',
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Process auto-recharge payment
 */
async function processAutoRecharge(companyId: string, amount: number) {
  try {
    // For now, simulate successful payment
    // In production, integrate with Razorpay API
    const paymentId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update company balance
    await DatabaseService.query(
      `UPDATE companies 
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE id = $2::uuid`,
      [amount, companyId]
    )

    // Log the auto-recharge transaction
    await DatabaseService.query(
      `INSERT INTO subscription_payments (
         company_id, amount, status, payment_id, method, 
         payment_date, created_at, updated_at
       ) VALUES (
         $1::uuid, $2, 'completed', $3, 'auto_recharge',
         NOW(), NOW(), NOW()
       )`,
      [companyId, amount, paymentId]
    )

    console.log(`[Auto-Recharge] Completed for company ${companyId}: +${amount}, Payment ID: ${paymentId}`)

    return { paymentId, success: true }

  } catch (error: any) {
    console.error('[Auto-Recharge Process] Error:', error)
    throw error
  }
}

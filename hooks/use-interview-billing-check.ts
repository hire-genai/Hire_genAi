'use client'

import { useState, useCallback } from 'react'

const MIN_WALLET_BALANCE_FOR_INTERVIEW = 500

export interface BillingCheckResult {
  canProceed: boolean
  isTrialActive: boolean
  isTrialExpired: boolean
  walletBalance: number
  reason?: 'trial_active' | 'wallet_sufficient' | 'wallet_insufficient'
}

export interface UseBillingCheckReturn {
  isChecking: boolean
  showLowBalancePopup: boolean
  setShowLowBalancePopup: (show: boolean) => void
  checkBillingAccess: (companyId: string) => Promise<BillingCheckResult>
  billingResult: BillingCheckResult | null
}

/**
 * Hook for checking billing access for AI Interview features.
 * 
 * Business Logic:
 * 1. FIRST check if trial is expired (isTrialExpired)
 * 2. ONLY IF trial is expired, THEN check wallet balance
 * 
 * CASE 1: Trial Active (isTrialExpired === false)
 * - Allow access immediately
 * - Skip wallet balance validation
 * 
 * CASE 2: Trial Expired (isTrialExpired === true)
 * - SUBCASE A: walletBalance >= 500 → Allow access
 * - SUBCASE B: walletBalance < 500 → Block access, show popup
 */
export function useInterviewBillingCheck(): UseBillingCheckReturn {
  const [isChecking, setIsChecking] = useState(false)
  const [showLowBalancePopup, setShowLowBalancePopup] = useState(false)
  const [billingResult, setBillingResult] = useState<BillingCheckResult | null>(null)

  const checkBillingAccess = useCallback(async (companyId: string): Promise<BillingCheckResult> => {
    if (!companyId) {
      return {
        canProceed: false,
        isTrialActive: false,
        isTrialExpired: true,
        walletBalance: 0,
        reason: 'wallet_insufficient'
      }
    }

    setIsChecking(true)
    
    try {
      const response = await fetch(`/api/billing/status?companyId=${encodeURIComponent(companyId)}`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        console.error('[Billing Check] API error:', data.error)
        // Fail-open for better UX - allow access if billing check fails
        const result: BillingCheckResult = {
          canProceed: true,
          isTrialActive: true,
          isTrialExpired: false,
          walletBalance: 0,
          reason: 'trial_active'
        }
        setBillingResult(result)
        return result
      }

      const { billing } = data
      const isTrialExpired = billing?.isTrialExpired === true
      const walletBalance = parseFloat(billing?.walletBalance) || 0

      // CASE 1: Trial is active - allow access immediately
      if (!isTrialExpired) {
        const result: BillingCheckResult = {
          canProceed: true,
          isTrialActive: true,
          isTrialExpired: false,
          walletBalance,
          reason: 'trial_active'
        }
        setBillingResult(result)
        return result
      }

      // CASE 2: Trial expired - check wallet balance
      if (walletBalance >= MIN_WALLET_BALANCE_FOR_INTERVIEW) {
        // SUBCASE A: Wallet has sufficient balance
        const result: BillingCheckResult = {
          canProceed: true,
          isTrialActive: false,
          isTrialExpired: true,
          walletBalance,
          reason: 'wallet_sufficient'
        }
        setBillingResult(result)
        return result
      } else {
        // SUBCASE B: Wallet balance insufficient
        const result: BillingCheckResult = {
          canProceed: false,
          isTrialActive: false,
          isTrialExpired: true,
          walletBalance,
          reason: 'wallet_insufficient'
        }
        setBillingResult(result)
        setShowLowBalancePopup(true)
        return result
      }
    } catch (error) {
      console.error('[Billing Check] Error:', error)
      // Fail-open for better UX
      const result: BillingCheckResult = {
        canProceed: true,
        isTrialActive: true,
        isTrialExpired: false,
        walletBalance: 0,
        reason: 'trial_active'
      }
      setBillingResult(result)
      return result
    } finally {
      setIsChecking(false)
    }
  }, [])

  return {
    isChecking,
    showLowBalancePopup,
    setShowLowBalancePopup,
    checkBillingAccess,
    billingResult
  }
}

/**
 * Reusable Low Balance Popup Component Props
 */
export interface LowBalancePopupProps {
  show: boolean
  onClose: () => void
  onRecharge: () => void
  message?: string
}

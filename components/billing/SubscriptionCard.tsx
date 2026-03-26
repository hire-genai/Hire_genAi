"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Flame, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Rocket, 
  Settings as SettingsIcon,
  Calendar,
  RefreshCw,
  Wallet,
  Zap,
  ExternalLink
} from 'lucide-react'

// Razorpay Payment Link URL
const RAZORPAY_PAYMENT_LINK = 'https://pages.razorpay.com/hire-genai'

// 5 billing status values (matches backend)
export type BillingStatus = 'active' | 'trial' | 'trial_over' | 'low_balance' | 'recharge_over'

interface SubscriptionCardProps {
  status: BillingStatus
  trialDaysRemaining?: number
  trialTotalDays?: number
  planName?: string
  nextBillingDate?: string
  autoRenewal?: boolean
  walletBalance?: number
  lowBalanceThreshold?: number
  currency?: 'INR' | 'USD'
  companyId: string
  userEmail?: string
  onPaymentSuccess?: () => void
  onPaymentCancel?: () => void
  onManagePlan?: () => void
}

export default function SubscriptionCard({
  status,
  trialDaysRemaining = 7,
  trialTotalDays = 7,
  planName = 'Pro Plan',
  nextBillingDate,
  autoRenewal = true,
  walletBalance = 0,
  lowBalanceThreshold = 200,
  currency = 'INR',
  companyId,
  userEmail,
  onPaymentSuccess,
  onPaymentCancel,
  onManagePlan
}: SubscriptionCardProps) {
  const [showContinueMessage, setShowContinueMessage] = useState(false)

  // Currency symbol helper
  const currencySymbol = currency === 'INR' ? '₹' : '$'

  const handleContinueTrial = () => {
    setShowContinueMessage(true)
    setTimeout(() => setShowContinueMessage(false), 3000)
  }

  const progressPercent = trialTotalDays > 0 
    ? ((trialTotalDays - trialDaysRemaining) / trialTotalDays) * 100 
    : 0

  // Open Razorpay payment link in same tab with email prefill
  const handlePayment = () => {
    // Extend session before going to external payment page (30 minutes)
    const sessionExpiresAt = localStorage.getItem('sessionExpiresAt')
    if (sessionExpiresAt) {
      const newExpiry = Date.now() + (30 * 60 * 1000)
      localStorage.setItem('sessionExpiresAt', newExpiry.toString())
    }
    
    const callbackUrl = `${window.location.origin}/payment/return`
    
    let paymentUrl = RAZORPAY_PAYMENT_LINK
    const params = new URLSearchParams()
    if (userEmail) {
      params.append('email', userEmail)
    }
    params.append('callback_url', callbackUrl)
    
    if (params.toString()) {
      paymentUrl += `?${params.toString()}`
    }
    window.location.href = paymentUrl
  }

  // Handle upgrade click - open payment link
  const handleUpgrade = () => {
    handlePayment()
  }

  // Handle recharge click - open payment link
  const handleRecharge = () => {
    handlePayment()
  }

  // Card border color based on status
  const getCardStyle = () => {
    switch (status) {
      case 'recharge_over': return 'border-red-300 bg-red-50/30'
      case 'low_balance': return 'border-amber-300 bg-amber-50/20'
      case 'trial_over': return 'border-red-200'
      case 'active': return 'border-emerald-200'
      case 'trial': return 'border-amber-200'
      default: return 'border-slate-200'
    }
  }

  return (
    <div className="w-full mb-4">
      <Card className={`w-full shadow-sm rounded-lg ${getCardStyle()}`}>
        <CardContent className="pt-4 pb-4 text-center">
          
          {/* RECHARGE_OVER STATE - Wallet is empty */}
          {status === 'recharge_over' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border-0 mb-3">
                🔴 RECHARGE REQUIRED
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Your wallet balance is {currencySymbol}0
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Recharge to continue using services without interruption
              </p>
              
              <div className="bg-red-50 rounded-lg p-2.5 mb-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    <strong>Services paused:</strong> API calls and AI features are disabled until recharge
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={handleRecharge}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Recharge Now
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                ⚠️ Wallet empty. Services may be paused. Recharge immediately.
              </p>
            </>
          )}

          {/* LOW_BALANCE STATE */}
          {status === 'low_balance' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border-0 mb-3">
                🟡 LOW BALANCE
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Wallet balance: {currencySymbol}{walletBalance.toFixed(2)}
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Your balance is running low. Recharge soon to avoid service interruption.
              </p>
              
              <div className="bg-amber-50 rounded-lg p-2.5 mb-4 text-left flex items-start gap-2">
                <Zap className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Recommended minimum: {currencySymbol}{lowBalanceThreshold}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={handleRecharge}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Recharge Wallet
                </Button>
                <Button 
                  variant="outline"
                  onClick={onManagePlan}
                  className="rounded-full px-6 py-2.5 font-medium text-sm border-slate-200 hover:bg-slate-50"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Manage Plan
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                ⚡ Low balance ({currencySymbol}{walletBalance.toFixed(2)}). Recharge to avoid interruption.
              </p>
            </>
          )}

          {/* TRIAL STATE */}
          {status === 'trial' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border-0 mb-3">
                <Flame className="h-3.5 w-3.5" />
                FREE TRIAL · {trialDaysRemaining} days remaining
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Explore Pro features
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                You're on a 7-day free trial. Upgrade anytime to continue access.
              </p>
              
              <div className="w-full mb-2">
                <Progress value={progressPercent} className="h-1.5 bg-slate-200 [&>div]:bg-indigo-600" />
              </div>
              <p className="text-xs text-slate-400 mb-4">
                {trialDaysRemaining} days left out of {trialTotalDays}
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={handleUpgrade}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleContinueTrial}
                  className="rounded-full px-6 py-2.5 font-medium text-sm border-slate-200 hover:bg-slate-50"
                >
                  Continue trial
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                {showContinueMessage 
                  ? '✓ You can continue using trial features until expiration.'
                  : 'Your trial ends soon. Upgrade to keep premium features.'}
              </p>
            </>
          )}

          {/* TRIAL_OVER STATE */}
          {status === 'trial_over' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border-0 mb-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                TRIAL EXPIRED · Access Limited
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Your trial has ended
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Some features are locked. Upgrade to restore full access.
              </p>
              
              <div className="bg-red-50 rounded-lg p-2.5 mb-4 text-left">
                <p className="text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Limited mode:</strong> Read-only access, no exports, AI features disabled.
                  </span>
                </p>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={handleUpgrade}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Your trial expired. Upgrade to regain all Pro features.
              </p>
            </>
          )}

          {/* ACTIVE STATE */}
          {status === 'active' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-0 mb-3">
                <CheckCircle className="h-3.5 w-3.5" />
                ACTIVE · {planName.toUpperCase()}
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Your workspace is upgraded
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                All premium features are unlocked.
              </p>
              
              {nextBillingDate && (
                <div className="bg-slate-50 rounded-lg p-3 mb-3 flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    Next billing date
                  </span>
                  <strong className="text-slate-900">{nextBillingDate}</strong>
                </div>
              )}
              
              <div className="bg-slate-50 rounded-lg p-2.5 mb-4 flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <RefreshCw className="h-4 w-4" />
                  Auto-renewal
                </span>
                <strong className="text-slate-900">{autoRenewal ? 'ON' : 'OFF'}</strong>
              </div>

              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  onClick={onManagePlan}
                  className="rounded-full px-6 py-2.5 font-medium text-sm border-slate-200 hover:bg-slate-50"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Manage Plan
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Your subscription is active. Manage billing or cancel anytime.
              </p>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}

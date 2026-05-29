"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Flame,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Settings as SettingsIcon,
  Calendar,
  CreditCard,
  XCircle,
  Loader2,
  Wallet
} from 'lucide-react'
import { getAppUrl } from '@/lib/domain-config'

// 5 billing status values (matches backend - subscription-based)
export type BillingStatus = 'active' | 'trial' | 'trial_over' | 'cancelled' | 'expired'

export type SubscriptionStatus = 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'paused' | 'created' | 'authenticated' | null

export interface SubscriptionInfo {
  id: string
  status: SubscriptionStatus
  planId?: string
  nextBillingDate?: string
  currentEnd?: string
  cancelAtCycleEnd?: boolean
  subscriberEmail?: string
  checkoutUrl?: string | null
}

interface SubscriptionCardProps {
  status: BillingStatus
  trialDaysRemaining?: number
  trialTotalDays?: number
  planName?: string
  nextBillingDate?: string
  autoRenewal?: boolean
  currency?: 'INR' | 'USD'
  companyId: string
  userEmail?: string
  subscription?: SubscriptionInfo | null
  walletBalance?: number
  currentMonthSpent?: number
  totalSpent?: number
  onManagePlan?: () => void
  onSubscribe?: (planType: 'monthly' | 'yearly') => void
  onCancelSubscription?: () => void
  onReactivate?: () => void
}

export default function SubscriptionCard({
  status,
  trialDaysRemaining = 7,
  trialTotalDays = 7,
  planName = 'Pro',
  nextBillingDate,
  autoRenewal = true,
  currency = 'USD',
  companyId,
  userEmail,
  subscription,
  walletBalance = 0,
  currentMonthSpent = 0,
  totalSpent = 0,
  onManagePlan,
  onSubscribe,
  onCancelSubscription,
  onReactivate,
}: SubscriptionCardProps) {
  const [showContinueMessage, setShowContinueMessage] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false)
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false)
  const [isManagingPlan, setIsManagingPlan] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  const handleContinueTrial = () => {
    setShowContinueMessage(true)
    setTimeout(() => setShowContinueMessage(false), 3000)
  }

  const progressPercent = trialTotalDays > 0
    ? ((trialTotalDays - trialDaysRemaining) / trialTotalDays) * 100
    : 0

  const handleUpgrade = () => goToPricingPage()
  const handleCreateSubscription = () => goToPricingPage()

  // Redirect to pricing page inside app (no navbar/footer) so user can pick a plan
  const goToPricingPage = () => {
    if (onSubscribe) {
      onSubscribe('monthly')
      return
    }
    window.location.href = getAppUrl(`/pricing?company_id=${encodeURIComponent(companyId)}`)
  }

  // Manage Plan — no Razorpay link, just call prop or show nothing
  const handleManagePlan = async () => {
    if (onManagePlan) {
      onManagePlan()
      return
    }
    // No external management link for Stripe — subscription managed from this page
    setIsManagingPlan(true)
    setTimeout(() => setIsManagingPlan(false), 800)
  }

  // Reactivate — try Stripe resume first, then create new
  const handleReactivateSubscription = async () => {
    if (onReactivate) {
      onReactivate()
      return
    }

    setIsCreatingSubscription(true)
    setSubscriptionError(null)

    try {
      const resumeResponse = await fetch('/api/subscriptions/stripe/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const resumeData = await resumeResponse.json()

      if (resumeResponse.ok) {
        window.dispatchEvent(new CustomEvent('subscription-updated'))
        setIsCreatingSubscription(false)
        return
      }

      // Resume failed — create new subscription
      console.log('Resume failed, creating new subscription:', resumeData.error)
      await handleCreateSubscription('monthly')
    } catch (error: any) {
      console.error('Reactivation error:', error)
      await handleCreateSubscription('monthly')
    }
  }

  // Cancel subscription via Stripe
  const handleCancelSubscription = async () => {
    if (onCancelSubscription) {
      onCancelSubscription()
      setShowCancelModal(false)
      return
    }

    setIsCancellingSubscription(true)
    setSubscriptionError(null)

    try {
      const response = await fetch('/api/subscriptions/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtCycleEnd: true })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      setShowCancelModal(false)
      window.dispatchEvent(new CustomEvent('subscription-updated'))
    } catch (error: any) {
      console.error('Subscription cancellation error:', error)
      setSubscriptionError(error.message || 'Failed to cancel subscription')
    } finally {
      setIsCancellingSubscription(false)
    }
  }

  const hasActiveSubscription = subscription && ['active', 'authenticated'].includes(subscription.status || '')

  return (
    <div className="w-full mb-4">
      {/* ACTIVE STATE */}
      {status === 'active' && (
        <div className="w-full bg-white rounded-xl border border-slate-100 border-l-[6px] border-l-emerald-600 px-4 sm:px-7 py-5 sm:py-6">

          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="bg-emerald-600 text-white px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              SUBSCRIBED · {planName.toUpperCase()} PLAN
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 sm:px-4 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs font-medium text-emerald-800">active</span>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-1.5">Your workspace is upgraded</h3>
          <p className="text-sm text-emerald-700 border-l-[3px] border-emerald-300 pl-3 mb-5 leading-relaxed">
            All premium features are unlocked. Priority support & analytics.
          </p>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-full px-4 py-1.5 inline-flex items-center gap-2 self-start">
              <span className="text-[10px] font-medium text-emerald-700">Next billing date</span>
              <span className="text-xs font-semibold text-emerald-950">
                {subscription?.nextBillingDate
                  ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                  : nextBillingDate || 'TBD'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => {
                  window.location.href = getAppUrl(`/pricing?company_id=${encodeURIComponent(companyId)}`)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 sm:px-5 py-2 text-sm font-medium w-full sm:w-auto justify-center"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Upgrade Plan
              </Button>
              <Button
                onClick={() => setShowCancelModal(true)}
                disabled={isCancellingSubscription}
                className="bg-transparent border border-orange-400 text-orange-500 hover:bg-orange-50 rounded-full px-3 sm:px-4 py-1.5 text-xs font-medium w-full sm:w-auto justify-center"
              >
                {isCancellingSubscription ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Cancel
              </Button>
            </div>
          </div>

          {subscriptionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4 text-center">
              <p className="text-xs text-red-700">{subscriptionError}</p>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {showCancelModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl border-t-4 border-t-orange-400">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-3xl">⚠️</span>
                  <h2 className="text-2xl font-bold text-emerald-900">Cancel plan?</h2>
                </div>
                <p className="text-center text-slate-600 text-sm leading-relaxed mb-2">
                  If you cancel your <strong>{planName} Plan</strong>, you'll lose premium features at the end of current billing cycle (
                  {subscription?.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                    : nextBillingDate || 'end of billing cycle'}
                  ). Your wallet balance remains untouched.
                </p>
                <p className="text-center text-slate-400 text-sm mb-8">
                  You can re-subscribe anytime.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 bg-emerald-50 border border-emerald-200 text-slate-700 rounded-full py-3 font-medium text-sm hover:bg-emerald-100 transition-all"
                  >
                    Keep my plan
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCancellingSubscription}
                    className="flex-1 bg-orange-600 text-white rounded-full py-3 font-medium text-sm hover:bg-orange-700 transition-all"
                  >
                    {isCancellingSubscription ? 'Cancelling...' : 'Confirm cancellation'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRIAL STATE */}
      {status === 'trial' && (
        <Card className="w-full shadow-lg rounded-[32px] border-0 bg-white border-l-[8px] border-l-emerald-600">
          <CardContent className="p-[20px_28px]">
            <div className="mb-4">
              <div className="bg-emerald-600 text-white px-5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 inline-block">
                <Flame className="h-3.5 w-3.5" />
                FREE TRIAL · {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left
              </div>
            </div>

            <h3 className="text-xl font-bold text-emerald-800 mb-4">
              Trial Period Ongoing
            </h3>

            <div className="mb-5">
              <div className="flex justify-between text-[0.75rem] text-emerald-600 font-medium mb-2">
                <span>{trialTotalDays} days trial</span>
                <span>{Math.round(progressPercent)}% used</span>
              </div>
              <div className="bg-emerald-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 rounded-full h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center flex-wrap gap-4 mt-4">
              <div className="bg-emerald-50 px-4 py-2 rounded-full text-sm text-emerald-700 font-medium">
                {'✨'} Full Pro features unlocked
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleUpgrade}
                  disabled={isCreatingSubscription}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm transition-all flex items-center justify-center h-10"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Upgrade to Pro
                </Button>
                <Button
                  variant="outline"
                  onClick={handleContinueTrial}
                  className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full px-6 py-2.5 font-semibold text-sm flex items-center justify-center h-10"
                >
                  Continue trial
                </Button>
              </div>
            </div>

            {showContinueMessage && (
              <div className="mt-3 text-center">
                <p className="text-xs text-emerald-600">
                  {'✓'} You can continue using trial features until expiration.
                </p>
              </div>
            )}

            {subscriptionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-3 text-center">
                <p className="text-xs text-red-700">{subscriptionError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TRIAL_OVER STATE */}
      {status === 'trial_over' && (
        <Card className="w-full shadow-lg rounded-[28px] border-0 bg-gradient-to-br from-white to-orange-50 border-l-[8px] border-l-orange-500">
          <CardContent className="p-[20px_28px]">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
              <div className="bg-orange-700 text-white px-4 py-1 rounded-full text-[0.8rem] font-semibold flex items-center gap-2 shadow-md">
                <AlertTriangle className="h-3 w-3" />
                TRIAL EXPIRED · Access Limited
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-[0.75rem] font-semibold text-orange-700">inactive</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-orange-800 mb-2">Your trial has ended</h3>
            <p className="text-sm text-orange-700 mb-4 leading-relaxed border-l-[3px] border-orange-300 pl-4">
              Some features are locked. Subscribe to restore full access.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-[16px] p-[8px_16px] mb-4 flex items-center gap-3 flex-wrap">
              <div className="text-lg">{'🔒'}</div>
              <div className="flex-1 text-xs text-orange-700 font-medium">
                Limited mode: Read-only access, no exports, AI features disabled.
              </div>
              <div className="bg-orange-200 text-orange-800 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full">
                Restricted
              </div>
            </div>

            {subscriptionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-center">
                <p className="text-xs text-red-700">{subscriptionError}</p>
              </div>
            )}

            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-full flex items-center gap-3 flex-wrap flex-1">
                <span className="text-[0.7rem] font-semibold text-orange-600 uppercase tracking-wide">{'⚠️'} Status</span>
                <span className="text-xs text-orange-700 font-medium">Your trial expired. Subscribe to regain all Pro features.</span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleCreateSubscription()}
                  disabled={isCreatingSubscription}
                  className="bg-green-700 hover:bg-green-800 text-white rounded-full px-6 py-2 font-bold text-sm shadow-lg transition-all"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Subscribe Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CANCELLED STATE */}
      {status === 'cancelled' && (
        <Card className="w-full shadow-lg rounded-[32px] border-0 bg-gradient-to-br from-white to-orange-50 border-l-[8px] border-l-orange-500">
          <CardContent className="p-8">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
              <div className="bg-orange-700 text-white px-5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md">
                <span className="text-lg">{'⏸️'}</span>
                CANCELLED · {planName.toUpperCase()} (until {subscription?.nextBillingDate
                  ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })
                  : nextBillingDate || 'end of cycle'})
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-1.5 rounded-full">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                <span className="text-xs font-semibold text-orange-700">cancelled</span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-orange-800 mb-2">Plan ends on billing date</h3>
            <p className="text-sm text-orange-700 mb-6 leading-relaxed border-l-[3px] border-orange-300 pl-4">
              Your {planName} features remain active until {subscription?.nextBillingDate
                ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                : nextBillingDate || 'end of billing cycle'}. After that, workspace will revert to Free tier.
            </p>

            <div className="flex justify-between items-center flex-wrap gap-6">
              <div className="bg-orange-50 border border-orange-200 rounded-full px-5 py-3 flex items-center gap-3 flex-wrap flex-1">
                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Expires on</span>
                <span className="text-sm text-orange-700 font-medium bg-white px-3 py-1 rounded-full">
                  {subscription?.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                    : nextBillingDate || 'TBD'}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleReactivateSubscription}
                  disabled={isCreatingSubscription}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Reactivate Subscription
                </Button>
              </div>
            </div>

            {subscriptionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-3 text-center">
                <p className="text-xs text-red-700">{subscriptionError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* EXPIRED STATE */}
      {status === 'expired' && (
        <Card className="w-full shadow-lg rounded-[28px] border-0 bg-[#fefcf5] border-l-[6px] border-l-[#b0aa7c]">
          <CardContent className="p-[20px_28px]">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
              <div className="bg-[#8f7a4b] text-white px-[18px] py-1 rounded-full text-[0.8rem] font-semibold flex items-center gap-1.5">
                <span className="text-sm">{'⚠️'}</span>
                PLAN EXPIRED
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0ede1] px-4 py-1 rounded-full">
                <div className="w-2 h-2 bg-[#c0a36b] rounded-full" />
                <span className="text-[0.8rem] font-semibold text-[#8b7342]">expired</span>
              </div>
            </div>

            <div className="text-[1.25rem] font-bold text-[#7a673e] mb-1.5 leading-tight">
              Your {planName} Plan has ended
            </div>
            <div className="text-[0.8rem] text-[#8f7e58] leading-relaxed border-l-[2px] border-[#ddd0aa] pl-3 mb-5">
              Subscription expired. Premium features, priority support & analytics are no longer accessible.
            </div>

            <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
              <div className="bg-[#f6f2e4] border border-[#e8dfc4] px-5 py-1.5 rounded-full flex items-center gap-3 flex-wrap">
                <span className="text-[0.65rem] uppercase tracking-wide font-semibold text-[#9e8a5a]">Expired on</span>
                <span className="text-[0.9rem] font-bold bg-[#fef7e6] text-[#8b6e3c] px-2.5 py-0.5 rounded-full">
                  {subscription?.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })
                    : 'TBD'}
                </span>
              </div>
              <div className="flex gap-2.5">
                <Button
                  onClick={() => handleCreateSubscription()}
                  disabled={isCreatingSubscription}
                  className="bg-[#b59d5e] hover:bg-[#9a8048] text-white rounded-full px-6 py-1.5 font-semibold text-[0.75rem] transition-all"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <span>Renew {planName} Plan {'→'}</span>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-[#fff7e0] border border-[#eadfb5] rounded-[18px] p-[10px_16px] flex items-center gap-2.5">
              <span className="text-sm">{'📆'}</span>
              <span className="text-[0.7rem] text-[#8b6e3c]">
                Your plan expired. Renew now to restore Pro access & unlock features.
              </span>
            </div>

            {subscriptionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-3 text-center">
                <p className="text-xs text-red-700">{subscriptionError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}

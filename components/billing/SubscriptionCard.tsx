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
  Settings as SettingsIcon,
  Calendar,
  CreditCard,
  XCircle,
  Loader2,
  Wallet
} from 'lucide-react'

// 5 billing status values (matches backend - subscription-based)
export type BillingStatus = 'active' | 'trial' | 'trial_over' | 'cancelled' | 'expired'

// Subscription status from Razorpay
export type SubscriptionStatus = 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'paused' | 'created' | 'authenticated' | null

export interface SubscriptionInfo {
  id: string
  status: SubscriptionStatus
  planId?: string
  nextBillingDate?: string
  currentEnd?: string
  cancelAtCycleEnd?: boolean
  subscriberEmail?: string
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
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function SubscriptionCard({
  status,
  trialDaysRemaining = 7,
  trialTotalDays = 7,
  planName = 'Pro Plan',
  nextBillingDate,
  autoRenewal = true,
  currency = 'INR',
  companyId,
  userEmail,
  subscription,
  walletBalance = 0,
  currentMonthSpent = 0,
  totalSpent = 0,
  onManagePlan,
  onSubscribe,
  onCancelSubscription
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

  // Handle upgrade click - create subscription with monthly plan
  const handleUpgrade = () => handleCreateSubscription('monthly')

  // Load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // Handle subscription creation with Razorpay popup
  const handleCreateSubscription = async (planType: 'monthly' | 'yearly' = 'monthly') => {
    if (onSubscribe) {
      onSubscribe(planType)
      return
    }

    setIsCreatingSubscription(true)
    setSubscriptionError(null)

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK')
      }

      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      // Open Razorpay popup with subscription_id
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscription.id,
        name: 'HireGenAI',
        description: `${planType === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
        handler: function () {
          // Payment successful - wait for webhook to process before refetching
          setIsCreatingSubscription(false)
          // Add delay to allow webhook to update database (typically 1-2 seconds)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('subscription-updated'))
          }, 2000)
        },
        prefill: {
          email: userEmail || ''
        },
        theme: {
          color: '#7c3aed'
        },
        modal: {
          ondismiss: function () {
            setIsCreatingSubscription(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error: any) {
      console.error('Subscription creation error:', error)
      setSubscriptionError(error.message || 'Failed to create subscription')
      setIsCreatingSubscription(false)
    }
  }

  // Handle manage plan functionality
  const handleManagePlan = async () => {
    if (onManagePlan) {
      onManagePlan()
      return
    }

    setIsManagingPlan(true)
    setSubscriptionError(null)

    try {
      // Fetch current active subscription with its unique management link
      const response = await fetch('/api/subscription/current', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription details')
      }

      // Use the subscription_link from database (unique per company)
      const subscriptionLink = data.subscription?.subscriptionLink
      if (!subscriptionLink) {
        throw new Error('Subscription management link not available')
      }

      // Open the company's unique Razorpay subscription management URL in new tab
      window.open(subscriptionLink, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      console.error('Manage plan error:', error)
      setSubscriptionError(error.message || 'Failed to open manage plan')
    } finally {
      setIsManagingPlan(false)
    }
  }

  // Handle subscription reactivation - try resume first, then create new if needed
  const handleReactivateSubscription = async () => {
    setIsCreatingSubscription(true)
    setSubscriptionError(null)

    try {
      // First, try to resume the existing subscription (if it was just scheduled for cancellation)
      const resumeResponse = await fetch('/api/subscriptions/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const resumeData = await resumeResponse.json()

      if (resumeResponse.ok) {
        // Successfully resumed - trigger billing data refresh
        console.log('Subscription resumed successfully')
        window.dispatchEvent(new CustomEvent('subscription-updated'))
        setIsCreatingSubscription(false)
        return
      }

      // If resume failed (subscription expired or not resumable), create new subscription
      console.log('Resume failed, creating new subscription:', resumeData.error)
      
      // Fall back to creating a new subscription
      await handleCreateSubscription('monthly')
    } catch (error: any) {
      console.error('Reactivation error:', error)
      // Try creating new subscription as fallback
      await handleCreateSubscription('monthly')
    }
  }

  // Handle subscription cancellation - cancels at cycle end (not immediate)
  const handleCancelSubscription = async () => {
    if (onCancelSubscription) {
      onCancelSubscription()
      return
    }

    setIsCancellingSubscription(true)
    setSubscriptionError(null)

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtCycleEnd: true }) // Cancel at cycle end, not immediately
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      // Close modal and trigger a refetch of billing data
      setShowCancelModal(false)
      
      // Dispatch custom event to trigger billing data refresh
      window.dispatchEvent(new CustomEvent('subscription-updated'))
    } catch (error: any) {
      console.error('Subscription cancellation error:', error)
      setSubscriptionError(error.message || 'Failed to cancel subscription')
    } finally {
      setIsCancellingSubscription(false)
    }
  }

  // Check if user has an active subscription
  const hasActiveSubscription = subscription && ['active', 'authenticated'].includes(subscription.status || '')

  // Card border color based on status
  const getCardStyle = () => {
    switch (status) {
      case 'trial_over': return 'border-red-200'
      case 'active': return 'border-emerald-200'
      case 'trial': return 'border-amber-200'
      default: return 'border-slate-200'
    }
  }

  return (
    <div className="w-full mb-4">
      {/* ACTIVE STATE - Clean Green Theme Card */}
      {status === 'active' && (
        <div className="w-full bg-white rounded-xl border border-slate-100 border-l-[6px] border-l-emerald-600 px-7 py-6">
          
          {/* Row 1: Badge + Status */}
          <div className="flex justify-between items-center mb-4">
            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              SUBSCRIBED · PRO PLAN
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs font-medium text-emerald-800">active</span>
            </div>
          </div>

          {/* Title + Description */}
          <h3 className="text-xl font-semibold text-slate-900 mb-1.5">Your workspace is upgraded</h3>
          <p className="text-sm text-emerald-700 border-l-[3px] border-emerald-300 pl-3 mb-5 leading-relaxed">
            All premium features are unlocked. Priority support & analytics.
          </p>

          {/* Billing Date + Buttons */}
          <div className="flex justify-between items-center flex-wrap gap-2">
            
            {/* Billing Date - side by side */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="text-[10px] font-medium text-emerald-700">Next billing date</span>
              <span className="text-xs font-semibold text-emerald-950">
                {subscription?.nextBillingDate 
                  ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                  : nextBillingDate || 'TBD'}
              </span>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleManagePlan}
                disabled={isManagingPlan}
                className="bg-transparent border-2 border-emerald-700 text-emerald-700 hover:bg-emerald-50 rounded-full px-5 py-2 text-sm font-medium"
              >
                {isManagingPlan ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <SettingsIcon className="h-3.5 w-3.5 mr-1.5" />
                )}
                Manage Plan
              </Button>
              <Button 
                onClick={() => setShowCancelModal(true)}
                disabled={isCancellingSubscription}
                className="bg-transparent border-2 border-orange-500 text-orange-600 hover:bg-orange-50 rounded-full px-5 py-2 text-sm font-medium"
              >
                {isCancellingSubscription ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                Cancel Subscription
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
                
                {/* Icon + Title */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-3xl">⚠️</span>
                  <h2 className="text-2xl font-bold text-emerald-900">Cancel plan?</h2>
                </div>

                {/* Description */}
                <p className="text-center text-slate-600 text-sm leading-relaxed mb-2">
                  If you cancel your <strong>Pro Plan</strong>, you'll lose premium features at the end of current billing cycle (
                  {subscription?.nextBillingDate 
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                    : nextBillingDate || 'end of billing cycle'}
                  ). Your wallet balance remains untouched.
                </p>
                <p className="text-center text-slate-400 text-sm mb-8">
                  You can re-subscribe anytime.
                </p>

                {/* Buttons */}
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
            {/* Header: Badge only */}
            <div className="mb-4">
              <div className="bg-emerald-600 text-white px-5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 inline-block">
                <Flame className="h-3.5 w-3.5" />
                FREE TRIAL · {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-emerald-800 mb-4">
              Trial Period Ongoing
            </h3>

            {/* Progress Bar Section Only */}
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

            {/* Footer: Info + Buttons */}
            <div className="flex justify-between items-center flex-wrap gap-4 mt-4">
              <div className="bg-emerald-50 px-4 py-2 rounded-full text-sm text-emerald-700 font-medium">
                {'\u2728'} Full Pro features unlocked
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleUpgrade}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-[20px_7px] py-[7px_20px] font-semibold text-[0.8rem] transition-all text-center"
                >
                  Upgrade to Pro
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleContinueTrial}
                  className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full px-[20px_7px] py-[7px_20px] font-semibold text-[0.8rem] text-center"
                >
                  Continue trial
                </Button>
              </div>
            </div>

            {/* Message */}
            {showContinueMessage && (
              <div className="mt-3 text-center">
                <p className="text-xs text-emerald-600">
                  {'\u2713'} You can continue using trial features until expiration.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TRIAL_OVER STATE - Compact Version */}
      {status === 'trial_over' && (
        <Card className="w-full shadow-lg rounded-[28px] border-0 bg-gradient-to-br from-white to-orange-50 border-l-[8px] border-l-orange-500">
          <CardContent className="p-[20px_28px]">
            {/* Row 1: Badge (left) + Status (right) parallel */}
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

            {/* Row 2: Title and description */}
            <h3 className="text-xl font-bold text-orange-800 mb-2">
              Your trial has ended
            </h3>
            <p className="text-sm text-orange-700 mb-4 leading-relaxed border-l-[3px] border-orange-300 pl-4">
              Some features are locked. Subscribe to restore full access.
            </p>

            {/* Limited mode notice - compact */}
            <div className="bg-orange-50 border border-orange-200 rounded-[16px] p-[8px_16px] mb-4 flex items-center gap-3 flex-wrap">
              <div className="text-lg">{'\ud83d\udd12'}</div>
              <div className="flex-1 text-xs text-orange-700 font-medium">
                Limited mode: Read-only access, no exports, AI features disabled.
              </div>
              <div className="bg-orange-200 text-orange-800 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full">
                Restricted
              </div>
            </div>

            {/* Error message if any */}
            {subscriptionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-center">
                <p className="text-xs text-red-700">{subscriptionError}</p>
              </div>
            )}

            {/* Row 3: Message + Subscribe Now button (parallel) */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-full flex items-center gap-3 flex-wrap flex-1">
                <span className="text-[0.7rem] font-semibold text-orange-600 uppercase tracking-wide">{'\u26a0\ufe0f'} Status</span>
                <span className="text-xs text-orange-700 font-medium">Your trial expired. Subscribe to regain all Pro features.</span>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleCreateSubscription('monthly')}
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

      {/* CANCELLED STATE - Similar to your HTML template */}
      {status === 'cancelled' && (
        <Card className="w-full shadow-lg rounded-[32px] border-0 bg-gradient-to-br from-white to-orange-50 border-l-[8px] border-l-orange-500">
          <CardContent className="p-8">
            {/* Row 1: Badge (left) + Status (right) parallel */}
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
              <div className="bg-orange-700 text-white px-5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md">
                <span className="text-lg">{'\u23f8\ufe0f'}</span>
                CANCELLED · PRO (until {subscription?.nextBillingDate 
                  ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })
                  : nextBillingDate || 'end of cycle'})
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-1.5 rounded-full">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                <span className="text-xs font-semibold text-orange-700">cancelled</span>
              </div>
            </div>

            {/* Row 2: Title and description */}
            <h3 className="text-2xl font-bold text-orange-800 mb-2">
              Plan ends on billing date
            </h3>
            <p className="text-sm text-orange-700 mb-6 leading-relaxed border-l-[3px] border-orange-300 pl-4">
              Your Pro features remain active until {subscription?.nextBillingDate 
                ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })
                : nextBillingDate || 'end of billing cycle'}. After that, workspace will revert to Free tier.
            </p>

            {/* Row 3: Expires on info + Reactivate buttons */}
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
                <Button 
                  variant="outline"
                  className="border-2 border-orange-300 text-orange-600 hover:bg-orange-50 rounded-full px-5 py-2.5 text-sm font-medium"
                >
                  Learn more
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EXPIRED STATE - Plan completely expired */}
      {status === 'expired' && (
        <Card className="w-full shadow-lg rounded-[28px] border-0 bg-[#fefcf5] border-l-[6px] border-l-[#b0aa7c]">
          <CardContent className="p-[20px_28px]">
            {/* Row 1: Badge + Status */}
            <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
              <div className="bg-[#8f7a4b] text-white px-[18px] py-1 rounded-full text-[0.8rem] font-semibold flex items-center gap-1.5">
                <span className="text-sm">{'\u26a0\ufe0f'}</span>
                PLAN EXPIRED
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0ede1] px-4 py-1 rounded-full">
                <div className="w-2 h-2 bg-[#c0a36b] rounded-full" />
                <span className="text-[0.8rem] font-semibold text-[#8b7342]">expired</span>
              </div>
            </div>

            {/* Row 2: Title + Description */}
            <div className="text-[1.25rem] font-bold text-[#7a673e] mb-1.5 leading-tight">
              Your Pro Plan has ended
            </div>
            <div className="text-[0.8rem] text-[#8f7e58] leading-relaxed border-l-[2px] border-[#ddd0aa] pl-3 mb-5">
              Subscription expired on {subscription?.nextBillingDate 
                ? new Date(subscription.nextBillingDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })
                : 'expiry date'}. Premium features, priority support & analytics are no longer accessible.
            </div>

            {/* Row 3: Expiry info + Renew button */}
            <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
              <div className="bg-[#f6f2e4] border border-[#e8dfc4] px-5 py-1.5 rounded-full flex items-center gap-3 flex-wrap">
                <span className="text-[0.65rem] uppercase tracking-wide font-semibold text-[#9e8a5a]">Expired on</span>
                <span className="text-[0.9rem] font-bold bg-[#fef7e6] text-[#8b6e3c] px-2.5 py-0.5 rounded-full">
                  {subscription?.nextBillingDate 
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'numeric' 
                      })
                    : 'TBD'}
                </span>
              </div>
              <div className="flex gap-2.5">
                <Button 
                  onClick={() => handleCreateSubscription('monthly')}
                  disabled={isCreatingSubscription}
                  className="bg-[#b59d5e] hover:bg-[#9a8048] text-white rounded-full px-6 py-1.5 font-semibold text-[0.75rem] transition-all"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <span>Renew Pro Plan {'\u2192'}</span>
                  )}
                </Button>
                <button 
                  className="bg-transparent border border-[#bcad7c] text-[#8b7342] px-5 py-1.5 rounded-full font-semibold text-[0.75rem] opacity-50 cursor-not-allowed"
                  disabled
                >
                  Subscription ended
                </button>
              </div>
            </div>

            {/* Extra message */}
            <div className="bg-[#fff7e0] border border-[#eadfb5] rounded-[18px] p-[10px_16px] flex items-center gap-2.5">
              <span className="text-sm">{'\ud83d\udcc6'}</span>
              <span className="text-[0.7rem] text-[#8b6e3c]">
                Your plan expired. Renew now to restore Pro access & unlock features.
              </span>
            </div>

            {/* Error message if any */}
            {subscriptionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-3 text-center">
                <p className="text-xs text-red-700">{subscriptionError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUBSCRIPTION PENDING/HALTED STATE */}
      {subscription && ['pending', 'halted', 'paused'].includes(subscription.status || '') && (
        <Card className="w-full shadow-sm rounded-lg">
          <CardContent className="pt-4 pb-4 text-center">
            <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border-0 mb-3">
              <AlertTriangle className="h-3.5 w-3.5" />
              SUBSCRIPTION {subscription.status?.toUpperCase()}
            </Badge>
            
            <h3 className="text-xl font-bold text-slate-900 mb-1.5">
              {subscription.status === 'pending' && 'Complete your subscription'}
              {subscription.status === 'halted' && 'Subscription payment failed'}
              {subscription.status === 'paused' && 'Subscription paused'}
            </h3>
            <p className="text-sm text-slate-500 mb-3">
              {subscription.status === 'pending' && 'Please complete the payment to activate your subscription.'}
              {subscription.status === 'halted' && 'Your subscription payment failed. Please update your payment method.'}
              {subscription.status === 'paused' && 'Your subscription is currently paused.'}
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Button 
                onClick={() => handleCreateSubscription('monthly')}
                disabled={isCreatingSubscription}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
              >
                {isCreatingSubscription ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {subscription.status === 'pending' ? 'Complete Payment' : 'Retry Payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

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

// 3 billing status values (matches backend - subscription-based)
export type BillingStatus = 'active' | 'trial' | 'trial_over'

// Subscription status from Razorpay
export type SubscriptionStatus = 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'paused' | 'created' | 'authenticated' | null

export interface SubscriptionInfo {
  id: string
  status: SubscriptionStatus
  planId?: string
  nextBillingDate?: string
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
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false)
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false)
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
          // Payment successful - reload to show updated status
          window.location.reload()
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

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (onCancelSubscription) {
      onCancelSubscription()
      return
    }

    if (!confirm('Are you sure you want to cancel your subscription immediately? Your access will end right away.')) {
      return
    }

    setIsCancellingSubscription(true)
    setSubscriptionError(null)

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtCycleEnd: false })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      // Refresh the page to show updated status
      window.location.reload()
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
      <Card className={`w-full shadow-sm rounded-lg ${getCardStyle()}`}>
        <CardContent className="pt-4 pb-4 text-center">

          {/* TRIAL STATE */}
          {status === 'trial' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-0 mb-3">
                <Flame className="h-3.5 w-3.5" />
                FREE TRIAL · {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Free Trial - {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Enjoy full access to all Pro features during your {trialTotalDays}-day free trial.
              </p>
              
              <div className="w-full mb-2">
                <Progress value={progressPercent} className="h-1.5 bg-slate-200 [&>div]:bg-emerald-500" />
              </div>
              
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
                  : 'No credit card required. Upgrade anytime to keep premium features.'}
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
                Some features are locked. Subscribe to restore full access.
              </p>
              
              <div className="bg-red-50 rounded-lg p-2.5 mb-4 text-left">
                <p className="text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Limited mode:</strong> Read-only access, no exports, AI features disabled.
                  </span>
                </p>
              </div>

              {subscriptionError && (
                <div className="bg-red-50 rounded-lg p-2.5 mb-4 text-center">
                  <p className="text-xs text-red-700">{subscriptionError}</p>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={() => handleCreateSubscription('monthly')}
                  disabled={isCreatingSubscription}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Subscribe Now
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Your trial expired. Subscribe to regain all Pro features.
              </p>
            </>
          )}

          {/* ACTIVE STATE - with subscription info */}
          {status === 'active' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-0 mb-3">
                <CheckCircle className="h-3.5 w-3.5" />
                {hasActiveSubscription ? 'SUBSCRIBED' : 'ACTIVE'} · {planName.toUpperCase()}
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Your workspace is upgraded
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                All premium features are unlocked.
              </p>

              {/* Wallet Balance */}
              <div className="bg-emerald-50 rounded-lg p-3 mb-3 flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-emerald-700">
                  <Wallet className="h-4 w-4" />
                  Wallet Balance
                </span>
                <strong className="text-emerald-800">
                  {currency === 'INR' ? '₹' : '$'}{walletBalance.toLocaleString()}
                </strong>
              </div>

              {/* Show subscription details if available */}
              {hasActiveSubscription && subscription && (
                <>
                  {(subscription.nextBillingDate || nextBillingDate) && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        Next billing date
                      </span>
                      <strong className="text-slate-900">
                        {subscription.nextBillingDate 
                          ? new Date(subscription.nextBillingDate).toLocaleDateString()
                          : nextBillingDate}
                      </strong>
                    </div>
                  )}
                  
                  <div className="bg-slate-50 rounded-lg p-2.5 mb-4 flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <CreditCard className="h-4 w-4" />
                      Subscription
                    </span>
                    <strong className="text-emerald-600 capitalize">{subscription.status}</strong>
                  </div>
                </>
              )}

              {subscriptionError && (
                <div className="bg-red-50 rounded-lg p-2.5 mb-4 text-center">
                  <p className="text-xs text-red-700">{subscriptionError}</p>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={onManagePlan}
                  className="rounded-full px-6 py-2.5 font-medium text-sm border-slate-200 hover:bg-slate-50"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Manage Plan
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={isCancellingSubscription}
                  className="rounded-full px-6 py-2.5 font-medium text-sm border-red-200 text-red-600 hover:bg-red-50"
                >
                  {isCancellingSubscription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancel Subscription
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Your subscription is active. Manage billing or cancel anytime.
              </p>
            </>
          )}

          {/* SUBSCRIPTION PENDING/HALTED STATE */}
          {subscription && ['pending', 'halted', 'paused'].includes(subscription.status || '') && (
            <>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {isCreatingSubscription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {subscription.status === 'pending' ? 'Complete Payment' : 'Retry Payment'}
                </Button>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}

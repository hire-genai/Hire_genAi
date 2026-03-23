"use client"

import { useState, useEffect } from 'react'
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
  Loader2,
  Zap
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

declare global {
  interface Window {
    Razorpay: any
    paypal: any
  }
}

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
  onPaymentSuccess?: () => void
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
  onPaymentSuccess,
  onManagePlan
}: SubscriptionCardProps) {
  const [showContinueMessage, setShowContinueMessage] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [country, setCountry] = useState<'IN' | 'INTERNATIONAL' | null>(null)
  const [config, setConfig] = useState<{ razorpayKeyId: string | null; paypalClientId: string | null } | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const { toast } = useToast()

  // Currency symbol helper
  const currencySymbol = currency === 'INR' ? '₹' : '$'

  // Detect country
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch('/api/detect-country')
        if (!res.ok) throw new Error('Country detection failed')
        const data = await res.json()
        setCountry(data.countryCode === 'IN' ? 'IN' : 'INTERNATIONAL')
      } catch {
        setCountry('INTERNATIONAL')
      }
    }
    detectCountry()
  }, [])

  // Load payment config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/payment/config')
        const data = await res.json()
        if (data.ok) {
          setConfig({ razorpayKeyId: data.razorpayKeyId, paypalClientId: data.paypalClientId })
        }
      } catch (err) {
        console.error('[SubscriptionCard] Config fetch error:', err)
      }
    }
    loadConfig()
  }, [])

  // Load Razorpay SDK
  useEffect(() => {
    if (country !== 'IN' || !config?.razorpayKeyId) return
    if (window.Razorpay) { setSdkReady(true); return }
    if (document.querySelector('script[data-razorpay-sdk]')) return

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.setAttribute('data-razorpay-sdk', 'true')
    script.async = true
    script.onload = () => setSdkReady(true)
    document.head.appendChild(script)
  }, [country, config])

  // Load PayPal SDK
  useEffect(() => {
    if (country !== 'INTERNATIONAL' || !config?.paypalClientId) return
    if (window.paypal) { setSdkReady(true); return }
    if (document.querySelector('script[data-paypal-sdk]')) return

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${config.paypalClientId}&currency=USD`
    script.setAttribute('data-paypal-sdk', 'true')
    script.async = true
    script.onload = () => setSdkReady(true)
    document.head.appendChild(script)
  }, [country, config])

  const handleContinueTrial = () => {
    setShowContinueMessage(true)
    setTimeout(() => setShowContinueMessage(false), 3000)
  }

  const progressPercent = trialTotalDays > 0 
    ? ((trialTotalDays - trialDaysRemaining) / trialTotalDays) * 100 
    : 0

  // Direct Razorpay payment
  const handleRazorpayPayment = async (amount: number = 10000) => {
    if (!config?.razorpayKeyId || !window.Razorpay) {
      toast({ title: 'Error', description: 'Payment system not ready. Please try again.', variant: 'destructive' })
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR', companyId }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create order')

      const options = {
        key: config.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: 'HireGenAI',
        description: 'Subscription Payment',
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'razorpay',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                amount: data.amount,
                companyId
              })
            })
            const verifyData = await verifyRes.json()
            if (verifyData.ok) {
              toast({ title: 'Payment Successful!', description: `₹${verifyData.amountCredited} added to wallet.` })
            } else {
              toast({ title: 'Payment Successful!', description: `Payment ID: ${response.razorpay_payment_id}` })
            }
          } catch {
            toast({ title: 'Payment Successful!', description: `Payment ID: ${response.razorpay_payment_id}` })
          }
          onPaymentSuccess?.()
          setProcessing(false)
        },
        prefill: { contact: '', email: '', name: '' },
        theme: { color: '#4f46e5' },
        modal: {
          ondismiss: () => setProcessing(false),
        },
        remember_customer: false
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        toast({ title: 'Payment Failed', description: response.error?.description || 'Payment could not be completed.', variant: 'destructive' })
        setProcessing(false)
      })
      rzp.open()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Payment failed', variant: 'destructive' })
      setProcessing(false)
    }
  }

  // Direct PayPal payment
  const handlePayPalPayment = async (amount: number = 100) => {
    if (!config?.paypalClientId || !window.paypal) {
      toast({ title: 'Error', description: 'Payment system not ready. Please try again.', variant: 'destructive' })
      return
    }

    setProcessing(true)
    try {
      const container = document.getElementById('paypal-button-temp')
      if (container) container.innerHTML = ''
      
      window.paypal.Buttons({
        style: { shape: 'pill', color: 'blue', layout: 'vertical', label: 'pay' },
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: amount.toFixed(2), currency_code: 'USD' }, description: 'HireGenAI Subscription' }],
          })
        },
        onApprove: async (data: any) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: 'paypal', paymentId: data.orderID, amount, companyId })
            })
            const verifyData = await verifyRes.json()
            if (verifyData.ok) {
              toast({ title: 'Payment Successful!', description: `$${amount} payment processed.` })
            }
          } catch {
            toast({ title: 'Payment Successful!', description: 'PayPal payment processed.' })
          }
          onPaymentSuccess?.()
          setProcessing(false)
        },
        onError: () => {
          toast({ title: 'Payment Failed', description: 'PayPal payment could not be completed.', variant: 'destructive' })
          setProcessing(false)
        },
        onCancel: () => {
          toast({ title: 'Cancelled', description: 'Payment was cancelled.' })
          setProcessing(false)
        },
      }).render('#paypal-button-temp')
    } catch (err) {
      setProcessing(false)
    }
  }

  // Handle upgrade click - directly open payment
  const handleUpgrade = () => {
    if (country === 'IN') {
      handleRazorpayPayment(10000)
    } else {
      handlePayPalPayment(100)
    }
  }

  // Handle recharge click
  const handleRecharge = () => {
    if (country === 'IN') {
      handleRazorpayPayment(1000) // ₹1000 recharge
    } else {
      handlePayPalPayment(10) // $10 recharge
    }
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
    <div className="w-full mb-6">
      <Card className={`w-full shadow-sm rounded-2xl ${getCardStyle()}`}>
        <CardContent className="pt-6 pb-6 text-center">
          
          {/* RECHARGE_OVER STATE - Wallet is empty */}
          {status === 'recharge_over' && (
            <>
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border-0 mb-4">
                🔴 RECHARGE REQUIRED
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Your wallet balance is {currencySymbol}0
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Recharge to continue using services without interruption
              </p>
              
              <div className="bg-red-50 rounded-lg p-3 mb-6 text-center">
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
                  disabled={processing}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
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
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border-0 mb-4">
                🟡 LOW BALANCE
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Wallet balance: {currencySymbol}{walletBalance.toFixed(2)}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Your balance is running low. Recharge soon to avoid service interruption.
              </p>
              
              <div className="bg-amber-50 rounded-lg p-3 mb-6 text-left flex items-start gap-2">
                <Zap className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Recommended minimum: {currencySymbol}{lowBalanceThreshold}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={handleRecharge}
                  disabled={processing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
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
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border-0 mb-4">
                <Flame className="h-3.5 w-3.5" />
                FREE TRIAL · {trialDaysRemaining} days remaining
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Explore Pro features
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                You're on a 7-day free trial. Upgrade anytime to continue access.
              </p>
              
              <div className="w-full mb-2">
                <Progress value={progressPercent} className="h-1.5 bg-slate-200 [&>div]:bg-indigo-600" />
              </div>
              <p className="text-xs text-slate-400 mb-6">
                {trialDaysRemaining} days left out of {trialTotalDays}
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={handleUpgrade}
                  disabled={processing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
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
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border-0 mb-4">
                <AlertTriangle className="h-3.5 w-3.5" />
                TRIAL EXPIRED · Access Limited
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Your trial has ended
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Some features are locked. Upgrade to restore full access.
              </p>
              
              <div className="bg-red-50 rounded-lg p-3 mb-6 text-left">
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
                  disabled={processing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-md transition-all"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
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
              <Badge className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-0 mb-4">
                <CheckCircle className="h-3.5 w-3.5" />
                ACTIVE · {planName.toUpperCase()}
              </Badge>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Your workspace is upgraded
              </h3>
              <p className="text-sm text-slate-500 mb-4">
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
              
              <div className="bg-slate-50 rounded-lg p-3 mb-6 flex justify-between items-center text-sm">
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

          {/* Hidden PayPal container for dynamic rendering */}
          <div id="paypal-button-temp" className="hidden" />
        </CardContent>
      </Card>
    </div>
  )
}

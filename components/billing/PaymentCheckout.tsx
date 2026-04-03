"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, AlertCircle, Loader2, Shield, CheckCircle, Globe, IndianRupee } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

declare global {
  interface Window {
    Razorpay: any
    paypal: any
  }
}

interface PaymentCheckoutProps {
  onPaymentSuccess?: (paymentId: string, provider: string) => void
  onPaymentCancel?: () => void
  companyId?: string
  amount?: number
}

interface PaymentConfig {
  razorpayKeyId: string | null
  paypalClientId: string | null
}

type Country = 'IN' | 'INTERNATIONAL' | null

export default function PaymentCheckout({ onPaymentSuccess, onPaymentCancel, companyId, amount = 10000 }: PaymentCheckoutProps) {
  const [country, setCountry] = useState<Country>(null)
  const [detectingCountry, setDetectingCountry] = useState(true)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [paypalReady, setPaypalReady] = useState(false)
  const { toast } = useToast()

  // ── 1. Detect user country ──
  useEffect(() => {
    const detectCountry = async () => {
      try {

        const res = await fetch('/api/detect-country')
        if (!res.ok) throw new Error('Country detection failed')
        const data = await res.json()
        const countryCode = data.countryCode
        console.log('[Payment] Detected country:', countryCode)
        setCountry(countryCode === 'IN' ? 'IN' : 'INTERNATIONAL')
      } catch (err) {
        console.warn('[Payment] Country detection failed, defaulting to INTERNATIONAL:', err)
        setCountry('INTERNATIONAL')
      } finally {
        setDetectingCountry(false)
      }
    }
    detectCountry()
  }, [])

  // ── 2. Fetch payment config from backend ──
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/payment/config')
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to load payment configuration')
        setLoading(false)
        return
      }
      setConfig({ razorpayKeyId: data.razorpayKeyId, paypalClientId: data.paypalClientId })
      setLoading(false)
    } catch (err) {
      console.error('[Payment] Config fetch error:', err)
      setError('Failed to load payment configuration')
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  // ── 3. Load Razorpay script (for India) ──
  useEffect(() => {
    if (country !== 'IN' || !config?.razorpayKeyId) return
    if (window.Razorpay) { setRazorpayReady(true); return }
    if (document.querySelector('script[data-razorpay-sdk]')) return

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.setAttribute('data-razorpay-sdk', 'true')
    script.async = true
    script.onload = () => {
      console.log('[Razorpay] SDK loaded')
      setRazorpayReady(true)
    }
    script.onerror = () => {
      console.error('[Razorpay] SDK failed to load')
      setError('Payment SDK failed to load. Please refresh.')
    }
    document.head.appendChild(script)
  }, [country, config])

  // ── 4. Load PayPal SDK (for international) ──
  useEffect(() => {
    if (country !== 'INTERNATIONAL' || !config?.paypalClientId) return
    if (window.paypal) { setPaypalReady(true); return }
    if (document.querySelector('script[data-paypal-sdk]')) return

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${config.paypalClientId}&currency=USD`
    script.setAttribute('data-paypal-sdk', 'true')
    script.async = true
    script.onload = () => {
      console.log('[PayPal] SDK loaded')
      setPaypalReady(true)
    }
    script.onerror = () => {
      console.error('[PayPal] SDK failed to load')
      setError('Payment SDK failed to load. Please refresh.')
    }
    document.head.appendChild(script)
  }, [country, config])

  // ── 5. Render PayPal button when ready ──
  useEffect(() => {
    if (country !== 'INTERNATIONAL' || !paypalReady || !config?.paypalClientId) return
    const container = document.getElementById('paypal-button-container')
    if (!container || container.hasChildNodes()) return

    try {
      window.paypal.Buttons({
        style: {
          shape: 'pill',
          color: 'blue',
          layout: 'vertical',
          label: 'pay',
        },
        createOrder: function (_data: any, actions: any) {
          // Convert INR amount to approximate USD (or use a fixed USD amount)
          const usdAmount = (amount / 100).toFixed(2) // 1 USD = 100 INR
          console.log('[PayPal] Creating order for $', usdAmount)
          return actions.order.create({
            purchase_units: [{
              amount: { value: usdAmount, currency_code: 'USD' },
              description: 'HireGenAI Subscription',
            }],
          })
        },
        onApprove: async function (data: any) {
          console.log('[PayPal] Payment approved:', data.orderID)
          
          // Verify payment and add credits to wallet
          try {
            const usdAmount = (amount / 100) // Amount in USD
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'paypal',
                paymentId: data.orderID,
                amount: usdAmount,
                companyId
              })
            })
            const verifyData = await verifyRes.json()
            
            if (verifyData.ok) {
              toast({ 
                title: 'Payment Successful!', 
                description: `₹${verifyData.amountCredited} added to wallet. New balance: ₹${verifyData.walletBalance}` 
              })
            } else {
              toast({ title: 'Payment Successful!', description: 'Your PayPal payment has been processed.' })
            }
          } catch (verifyErr) {
            console.error('[PayPal] Verification error:', verifyErr)
            toast({ title: 'Payment Successful!', description: 'Your PayPal payment has been processed.' })
          }
          
          onPaymentSuccess?.(data.orderID, 'paypal')
        },
        onError: function (err: any) {
          console.error('[PayPal] Payment error:', err)
          toast({ title: 'Payment Failed', description: 'PayPal payment could not be completed. Please try again.', variant: 'destructive' })
        },
        onCancel: function () {
          console.log('[PayPal] Payment cancelled')
          toast({ title: 'Cancelled', description: 'Payment was cancelled.' })
        },
      }).render('#paypal-button-container')
    } catch (err) {
      console.error('[PayPal] Button render error:', err)
    }
  }, [paypalReady, country, config, amount, toast, onPaymentSuccess])

  // ── 6. Handle Razorpay checkout ──
  const handleRazorpayPayment = async () => {
    if (!config?.razorpayKeyId) {
      toast({ title: 'Error', description: 'Razorpay not configured.', variant: 'destructive' })
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Clear Razorpay stored customer data to prevent "Using as" phone number
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('rzp_') || key.includes('razorpay'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Also clear sessionStorage
        const sessionKeysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && (key.startsWith('rzp_') || key.includes('razorpay'))) {
            sessionKeysToRemove.push(key)
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
        
        // Clear Razorpay cookies
        document.cookie.split(';').forEach(cookie => {
          const name = cookie.split('=')[0].trim()
          if (name.startsWith('rzp_') || name.includes('razorpay')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          }
        })
      } catch (e) {
        console.warn('[Razorpay] Could not clear stored data:', e)
      }

      // Create subscription on backend
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: 'monthly' }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      console.log('[Razorpay] Subscription created:', data.subscription.id)

      // Open Razorpay checkout
      const options = {
        key: config.razorpayKeyId,
        subscription_id: data.subscription.id,
        name: 'HireGenAI',
        description: 'Subscription Payment',
        handler: async function (response: any) {
          console.log('[Razorpay] Payment successful:', response.razorpay_payment_id)
          
          // Verify payment and add credits to wallet
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'razorpay',
                paymentId: response.razorpay_payment_id,
                subscriptionId: response.razorpay_subscription_id,
                signature: response.razorpay_signature,
                companyId
              })
            })
            const verifyData = await verifyRes.json()
            
            if (verifyData.ok) {
              toast({ 
                title: 'Subscription Activated!', 
                description: 'Your subscription has been successfully activated.' 
              })
            } else {
              console.warn('[Razorpay] Verification warning:', verifyData.error)
              toast({ title: 'Payment Successful!', description: `Payment ID: ${response.razorpay_payment_id}` })
            }
          } catch (verifyErr) {
            console.error('[Razorpay] Verification error:', verifyErr)
            toast({ title: 'Payment Successful!', description: `Payment ID: ${response.razorpay_payment_id}` })
          }
          
          onPaymentSuccess?.(response.razorpay_payment_id, 'razorpay')
          setProcessing(false)
        },
        prefill: {
          contact: '',
          email: '',
          name: ''
        },
        config: {
          display: {
            preferences: {
              hide_header: false,
              hide_footer: false,
              show_default_blocks: true
            }
          }
        },
        customer_details: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#7c3aed'
        },
        modal: {
          ondismiss: function () {
            console.log('[Razorpay] Checkout dismissed')
            setProcessing(false)
            onPaymentCancel?.()
          },
          escape: true,
          handleback: true,
          confirm_close: false,
          animation: true
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 900,
        remember_customer: false
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        console.error('[Razorpay] Payment failed:', response.error)
        toast({
          title: 'Payment Failed',
          description: response.error?.description || 'Payment could not be completed.',
          variant: 'destructive',
        })
        setProcessing(false)
      })
      rzp.open()
    } catch (err: any) {
      console.error('[Razorpay] Error:', err)
      setError(err.message || 'Payment failed')
      toast({ title: 'Error', description: err.message || 'Payment failed', variant: 'destructive' })
      setProcessing(false)
    }
  }

  // ── Derived states ──
  const isReady = !detectingCountry && !loading
  const isIndia = country === 'IN'
  const sdkLoaded = isIndia ? razorpayReady : paypalReady
  const configMissing = isIndia ? !config?.razorpayKeyId : !config?.paypalClientId


  // ── UI ──
  return (
    <Card className="border-violet-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2 text-violet-800">
          <CreditCard className="h-5 w-5" />
          Subscribe Now
        </CardTitle>
        <CardDescription className="text-violet-700 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          {detectingCountry
            ? 'Detecting your region...'
            : isIndia
              ? 'Pay securely with Razorpay (India)'
              : 'Pay securely with PayPal (International)'}
        </CardDescription>
        
      </CardHeader>
      <CardContent className="pt-6">
        <div className="max-w-md mx-auto space-y-4">
          {/* Error state */}
          {error && (
            <div className="border border-red-300 bg-red-50 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Payment Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {(!isReady || (!sdkLoaded && !configMissing && !error)) && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-3" />
              <p className="text-sm text-gray-500">
                {detectingCountry ? 'Detecting your region...' : 'Loading payment options...'}
              </p>
            </div>
          )}

          {/* Config missing */}
          {isReady && configMissing && !error && (
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Configuration Missing</p>
                <p className="text-sm text-amber-700 mt-1">
                  {isIndia ? 'Razorpay' : 'PayPal'} is not configured. Please contact support.
                </p>
              </div>
            </div>
          )}

          {/* Ready state — show payment UI */}
          {isReady && sdkLoaded && !configMissing && (
            <div className="space-y-4">
              {/* Features list */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>AI-powered interviews & evaluations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>CV parsing & question generation</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Unlimited job postings</span>
                </div>
              </div>

              {/* India → Razorpay button */}
              {isIndia && (
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={processing}
                  className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-base rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <IndianRupee className="h-5 w-5 mr-1" />
                      Pay ₹{(amount / 100).toLocaleString('en-IN')} with Razorpay
                    </>
                  )}
                </Button>
              )}

              {/* International → PayPal button container */}
              {!isIndia && (
                <div>
                  <div id="paypal-button-container" className="min-h-[150px]" />
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Pay ${(amount / 100).toFixed(2)} USD via PayPal
                  </p>
                </div>
              )}

              {/* Security badge */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Shield className="h-3.5 w-3.5" />
                <span>
                  {isIndia
                    ? 'Secured by Razorpay \u00b7 PCI DSS compliant'
                    : 'Secured by PayPal \u00b7 Buyer protection included'}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

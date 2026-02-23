"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Script from 'next/script'
import { Zap, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PayPalOverviewProps {
  onSubscriptionSuccess?: (subscriptionId: string) => void
  planId?: string
}

export default function PayPalOverview({ onSubscriptionSuccess, planId = "P-4N498891U73853430ND4MFXY" }: PayPalOverviewProps) {
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [paypalError, setPaypalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const paypalButtonRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load PayPal SDK and render button
  useEffect(() => {
    if (!paypalLoaded || !paypalButtonRef.current) return

    const paypal = (window as any).paypal
    if (!paypal) {
      console.error('PayPal SDK not loaded')
      setPaypalError('PayPal SDK failed to load')
      return
    }

    if (!paypal.Buttons) {
      console.error('PayPal Buttons not available')
      setPaypalError('PayPal Buttons not available')
      return
    }

    // Clear existing buttons
    paypalButtonRef.current.innerHTML = ''

    try {
      console.log('Creating PayPal button with plan:', planId)
      
      const button = paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'blue',
          label: 'subscribe'
        },
        createSubscription: function (_data: any, actions: any) {
          console.log('Creating subscription for plan:', planId)
          setLoading(true)
          return actions.subscription.create({
            plan_id: planId
          })
        },
        onApprove: function (data: any) {
          console.log('Subscription approved:', data)
          toast({
            title: 'Success!',
            description: `Subscription successful! ID: ${data.subscriptionID}`,
          })
          onSubscriptionSuccess?.(data.subscriptionID)
          setLoading(false)
        },
        onError: function (err: any) {
          console.error('PayPal onError callback:', err)
          toast({
            title: 'Error',
            description: 'Failed to process subscription. Please try again.',
            variant: 'destructive'
          })
          setLoading(false)
        },
        onCancel: function () {
          console.log('Subscription cancelled')
          toast({
            title: 'Cancelled',
            description: 'Subscription was cancelled.',
          })
          setLoading(false)
        }
      })

      console.log('Button created, checking eligibility...')
      if (button.isEligible && button.isEligible()) {
        console.log('Button is eligible, rendering...')
        button.render(paypalButtonRef.current)
        setPaypalError(null)
      } else {
        console.warn('PayPal button is not eligible for this browser/location')
        setPaypalError('PayPal is not available in your region')
      }
    } catch (err) {
      console.error('PayPal render error:', err)
      setPaypalError(`PayPal error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [paypalLoaded, planId, onSubscriptionSuccess, toast])

  return (
    <>
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100">
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <Zap className="h-5 w-5" />
            Quick Subscribe
          </CardTitle>
          <CardDescription className="text-emerald-700">
            Get started instantly with PayPal
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-md mx-auto space-y-4">
            {paypalError ? (
              <div className="border border-red-300 bg-red-50 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">PayPal Error</p>
                  <p className="text-sm text-red-700 mt-1">{paypalError}</p>
                </div>
              </div>
            ) : (
              <>
                {/* PayPal Button Container */}
                <div 
                  ref={paypalButtonRef} 
                  id="paypal-button-container-overview"
                  className="min-h-[140px]"
                />
                
                {!paypalLoaded && (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PayPal...</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PayPal SDK Script */}
      <Script
        src="https://www.paypal.com/sdk/js?client-id=AQbce0p4a4o3MirF8A9e3B8QjmxcyvdM7sElrPr9yj985xukZ7w0sCQaeY95UO0SLgv91tOREpx94rkQ&vault=true&intent=subscription"
        onLoad={() => setPaypalLoaded(true)}
        strategy="lazyOnload"
      />
    </>
  )
}

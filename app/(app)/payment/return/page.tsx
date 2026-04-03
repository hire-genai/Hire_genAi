'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

/**
 * /payment/return
 * 
 * This page handles the redirect after Razorpay payment.
 * 
 * Logic:
 * 1. Check if user is logged in (session exists)
 * 2. If logged in → check DB for recent payment
 *    - Payment success → show success message → redirect to /settings?tab=payment
 *    - Payment fail/back → redirect to /settings?tab=payment
 * 3. If NOT logged in → redirect to /login with a postLoginRedirect flag
 *    - After login, user goes to /settings?tab=payment
 */
export default function PaymentReturnPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'success' | 'no-payment' | 'no-session'>('checking')
  const [message, setMessage] = useState('Verifying your payment...')
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    const handleReturn = async () => {
      // ─── Case 1: User is NOT logged in ───
      if (!user) {
        setStatus('no-session')
        setMessage('Session not found. Redirecting to login...')
        
        // Store redirect target for after login
        localStorage.setItem('postLoginRedirect', '/settings?tab=payment')
        
        setTimeout(() => {
          router.replace('/login')
        }, 1500)
        return
      }

      // ─── Case 2: User IS logged in → Check payment status from DB ───
      setMessage('Checking payment status...')

      try {
        const res = await fetch(`/api/payment/check-status?email=${encodeURIComponent(user.email)}`)
        const data = await res.json()

        if (data.ok && data.hasSuccessPayment) {
          // ─── Payment SUCCESS (user has successful payment in DB) ───
          setStatus('success')
          setPaymentAmount(parseFloat(data.lastPayment?.amount || '0'))
          setWalletBalance(data.walletBalance)
          setMessage('Payment successful! Redirecting...')
        } else {
          // ─── No success payment (user cancelled/failed/new user) ───
          setStatus('no-payment')
          setMessage('Redirecting to payment settings...')
        }

        // Both cases redirect to same place - let settings page handle the details
        setTimeout(() => {
          router.replace('/settings?tab=payment')
        }, 2000)

      } catch (error) {
        console.error('[Payment Return] Error checking status:', error)
        setStatus('no-payment')
        setMessage('Redirecting to payment settings...')

        setTimeout(() => {
          router.replace('/settings?tab=payment')
        }, 1500)
      }
    }

    handleReturn()
  }, [authLoading, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        {/* Loading / Checking */}
        {status === 'checking' && (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}

        {/* Payment Success */}
        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
            {paymentAmount && (
              <p className="text-2xl font-bold text-emerald-600 mb-1">₹{paymentAmount}</p>
            )}
            {walletBalance !== null && (
              <p className="text-gray-500 mb-4">Wallet Balance: ₹{walletBalance}</p>
            )}
            <p className="text-gray-400 text-sm">Redirecting to settings...</p>
          </>
        )}

        {/* No Payment / Cancelled */}
        {status === 'no-payment' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-orange-500" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Not Completed</h2>
            <p className="text-gray-500 mb-4">Your payment was cancelled or not completed.</p>
            <p className="text-gray-400 text-sm">Redirecting to settings...</p>
          </>
        )}

        {/* No Session */}
        {status === 'no-session' && (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Restoring Session</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'

export type StripeCheckoutProps = {
  name?: string
  description?: string
  amount?: number
  currency?: string
  quantity?: number
  customerEmail?: string
  buttonLabel?: string
  className?: string
}

export default function StripeCheckout({
  name = 'Sample Product',
  description = 'One-time payment via Stripe',
  amount = 1000,
  currency = 'usd',
  quantity = 1,
  customerEmail,
  buttonLabel = 'Pay with Stripe',
  className = '',
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          amount,
          currency,
          quantity,
          customerEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data?.error || 'Failed to start Stripe checkout')
      }

      window.location.href = data.url
    } catch (err: any) {
      setError(err?.message || 'Stripe checkout failed')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        style={{
          background: '#635bff',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 8,
          border: 'none',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          width: '100%',
        }}
      >
        {loading ? 'Redirecting…' : buttonLabel}
      </button>
      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}

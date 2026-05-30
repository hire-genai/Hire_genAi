"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Zap, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface AutoRechargeSettingsProps {
  companyId: string
  initialData?: any
}

export default function AutoRechargeSettings({ companyId, initialData }: AutoRechargeSettingsProps) {
  const [enabled, setEnabled] = useState<boolean>(initialData?.settings?.auto_recharge_enabled ?? false)
  const [planName, setPlanName] = useState<string | null>(initialData?.settings?.planName ?? null)
  const [planAmount, setPlanAmount] = useState<number | null>(initialData?.settings?.planAmount ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (companyId && !initialData) fetchSettings()
  }, [companyId, initialData])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/billing/auto-recharge-settings', { credentials: 'include' })
      const data = await res.json()
      if (data.ok && data.settings) {
        setEnabled(data.settings.auto_recharge_enabled ?? false)
        setPlanName(data.settings.planName ?? null)
        setPlanAmount(data.settings.planAmount ?? null)
      }
    } catch {
      showFeedback('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (value: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/billing/auto-recharge-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ auto_recharge_enabled: value }),
      })
      const data = await res.json()
      if (data.ok) {
        setEnabled(value)
        showFeedback('success', value ? 'Auto-recharge enabled' : 'Auto-recharge disabled')
      } else {
        showFeedback('error', data.error || 'Failed to update')
      }
    } catch {
      showFeedback('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  if (loading) {
    return (
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border rounded-xl shadow-sm transition-all duration-200 ${enabled ? 'border-emerald-200' : 'border-gray-200'}`}>
      {/* Header */}
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${enabled ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <Zap className={`h-5 w-5 ${enabled ? 'text-emerald-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Auto-Recharge</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Triggers when wallet balance drops below $10</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            <Switch checked={enabled} disabled={saving} onCheckedChange={handleToggle} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success'
              ? <CheckCircle className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            {feedback.message}
          </div>
        )}

        {/* Plan + Amount block */}
        {planAmount ? (
          <div className={`rounded-lg border p-4 space-y-3 transition-all ${enabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
            {/* Plan row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Plan</span>
              <span className="text-sm font-semibold text-gray-800">{planName || '—'}</span>
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* Recharge amount row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recharge Amount</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">${planAmount.toFixed(2)}</span>
                <Badge className={`text-[10px] px-1.5 py-0.5 ${enabled ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'} border`}>
                  <RefreshCw className="h-2.5 w-2.5 mr-1 inline" />
                  Synced
                </Badge>
              </div>
            </div>

            {/* Trigger note */}
            <div className="border-t border-dashed border-gray-200" />
            <p className="text-xs text-gray-500">
              {enabled
                ? <>When balance drops below <span className="font-semibold text-gray-700">$10</span>, we'll auto-charge <span className="font-semibold text-gray-700">${planAmount.toFixed(2)}</span> to your subscription payment method.</>
                : 'Enable auto-recharge to automatically top up your wallet.'}
            </p>
          </div>
        ) : (
          /* No active plan */
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">No active plan found</p>
            <p className="text-xs text-amber-700 mt-1">
              Auto-recharge amount is linked to your subscription plan price. Subscribe to a plan to enable this feature.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

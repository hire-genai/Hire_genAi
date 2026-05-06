"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Shield, Loader2, CheckCircle, XCircle, Settings } from "lucide-react"

interface AutoRechargeSettingsProps {
  companyId: string
}

interface AutoRechargeSettings {
  auto_recharge_enabled: boolean
  auto_recharge_amount: number
  auto_recharge_threshold: number
}

export default function AutoRechargeSettings({ companyId }: AutoRechargeSettingsProps) {
  const [settings, setSettings] = useState<AutoRechargeSettings>({
    auto_recharge_enabled: false,
    auto_recharge_amount: 2000,
    auto_recharge_threshold: 100
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Load settings on mount
  useEffect(() => {
    if (companyId) {
      loadSettings()
    }
  }, [companyId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/billing/auto-recharge-settings', {
        method: 'GET',
        credentials: 'include'
      })
      
      const data = await res.json()
      
      if (data.ok && data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load auto-recharge settings:', error)
      showFeedback('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const validateSettings = (newSettings: AutoRechargeSettings): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Validate recharge amount (minimum ₹2000)
    if (newSettings.auto_recharge_amount < 2000) {
      newErrors.auto_recharge_amount = 'Minimum recharge amount is ₹2000'
    }

    // Validate threshold (must be positive)
    if (newSettings.auto_recharge_threshold <= 0) {
      newErrors.auto_recharge_threshold = 'Threshold must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveSettings = async (newSettings: AutoRechargeSettings) => {
    if (!validateSettings(newSettings)) {
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/billing/auto-recharge-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newSettings)
      })
      
      const data = await res.json()
      
      if (data.ok && data.settings) {
        setSettings(data.settings)
        showFeedback('success', 'Auto-recharge settings updated successfully')
      } else {
        showFeedback('error', data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Failed to save auto-recharge settings:', error)
      showFeedback('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    const newSettings = { ...settings, auto_recharge_enabled: enabled }
    await saveSettings(newSettings)
  }

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0
    const newSettings = { ...settings, auto_recharge_amount: amount }
    setSettings(newSettings)
    
    // Clear error when user starts typing
    if (errors.auto_recharge_amount) {
      setErrors(prev => ({ ...prev, auto_recharge_amount: '' }))
    }
  }

  const handleThresholdChange = (value: string) => {
    const threshold = parseFloat(value) || 0
    const newSettings = { ...settings, auto_recharge_threshold: threshold }
    setSettings(newSettings)
    
    // Clear error when user starts typing
    if (errors.auto_recharge_threshold) {
      setErrors(prev => ({ ...prev, auto_recharge_threshold: '' }))
    }
  }

  const handleAmountBlur = () => {
    saveSettings(settings)
  }

  const handleThresholdBlur = () => {
    saveSettings(settings)
  }

  if (loading) {
    return (
      <Card className="border rounded-lg shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">Auto-Recharge Settings</CardTitle>
          </div>
          <CardDescription>Configure automatic wallet recharge preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">Auto-Recharge Settings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.auto_recharge_enabled}
              disabled={saving || loading}
              onCheckedChange={handleToggleEnabled}
            />
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feedback Message */}
        {feedback && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            feedback.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}


        {/* Settings Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recharge Amount */}
          <div className="space-y-2">
            <Label htmlFor="recharge-amount" className="text-sm font-medium">
              Recharge Amount (₹)
            </Label>
            <Input
              id="recharge-amount"
              type="number"
              min="2000"
              step="100"
              value={settings.auto_recharge_amount || ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={handleAmountBlur}
              disabled={saving || !settings.auto_recharge_enabled}
              className={`${errors.auto_recharge_amount ? 'border-red-500' : ''}`}
              placeholder="2000"
            />
            {errors.auto_recharge_amount && (
              <p className="text-xs text-red-600">{errors.auto_recharge_amount}</p>
            )}
            <p className="text-xs text-gray-500">
              Minimum ₹2000. Amount to add when auto-recharge triggers.
            </p>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="recharge-threshold" className="text-sm font-medium">
              Auto recharge when balance below (₹)
            </Label>
            <Input
              id="recharge-threshold"
              type="number"
              min="1"
              step="10"
              value={settings.auto_recharge_threshold || ''}
              onChange={(e) => handleThresholdChange(e.target.value)}
              onBlur={handleThresholdBlur}
              disabled={saving || !settings.auto_recharge_enabled}
              className={`${errors.auto_recharge_threshold ? 'border-red-500' : ''}`}
              placeholder="100"
            />
            {errors.auto_recharge_threshold && (
              <p className="text-xs text-red-600">{errors.auto_recharge_threshold}</p>
            )}
            <p className="text-xs text-gray-500">
              Trigger auto-recharge when wallet balance falls below this amount.
            </p>
          </div>
        </div>


        {/* Info Box */}
        {settings.auto_recharge_enabled && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">How Auto-Recharge Works</p>
                <p className="text-xs text-amber-700 mt-1">
                  When your wallet balance drops below ₹{settings.auto_recharge_threshold}, 
                  we'll automatically add ₹{settings.auto_recharge_amount} to your wallet 
                  using your active subscription payment method.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

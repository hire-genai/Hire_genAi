"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Loader2, XCircle } from "lucide-react"

interface SettingsData {
  settings: Record<string, string>
  openai: { configured: boolean; valid: boolean }
  supportStats: { open: number; inProgress: number; resolvedToday: number; total: number }
}

export default function SettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profitMargin, setProfitMargin] = useState("20")
  const [openai, setOpenai] = useState({ configured: false, valid: false })
  const [features, setFeatures] = useState({ anomaly_detection: true, realtime_alerts: true })
  const [saveMessage, setSaveMessage] = useState("")

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error("Failed to load")
      const data: { ok: boolean } & SettingsData = await res.json()
      if (data.ok) {
        setProfitMargin(data.settings.profit_margin || "20")
        setOpenai(data.openai)
        setFeatures({
          anomaly_detection: data.settings.anomaly_detection !== "false",
          realtime_alerts: data.settings.realtime_alerts !== "false",
        })
      }
    } catch (err) {
      console.error("Settings fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = async (key: string, value: string) => {
    setSaving(true)
    setSaveMessage("")
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (data.ok) {
        setSaveMessage(`${key} updated successfully`)
        setTimeout(() => setSaveMessage(""), 3000)
      } else {
        setSaveMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setSaveMessage("Failed to save setting")
    } finally {
      setSaving(false)
    }
  }

  const toggleFeature = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue
    if (key === "anomaly_detection") setFeatures((f) => ({ ...f, anomaly_detection: newValue }))
    if (key === "realtime_alerts") setFeatures((f) => ({ ...f, realtime_alerts: newValue }))
    await updateSetting(key, String(newValue))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-slate-400">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.includes("Error") || saveMessage.includes("Failed") ? "bg-red-900/20 border border-red-700 text-red-200" : "bg-emerald-900/20 border border-emerald-700 text-emerald-200"}`}>
          {saveMessage}
        </div>
      )}

      {/* Profit Margin */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Profit Margin</CardTitle>
          <CardDescription>Configure markup on OpenAI costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">Margin Percentage (%)</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="number"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <Button
                  onClick={() => updateSetting("profit_margin", profitMargin)}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Example: {profitMargin}% margin on $1.00 cost = ${(1 * (1 + parseFloat(profitMargin || "0") / 100)).toFixed(2)} final price
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OpenAI API Key Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">OpenAI API Status</CardTitle>
          <CardDescription>Admin key health check</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {openai.configured ? (
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                {openai.valid ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className="text-white font-semibold">
                    {openai.valid ? "API Key Valid" : "API Key Invalid"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {openai.valid ? "Admin key is configured and working" : "API key is configured but validation failed"}
                  </p>
                </div>
                <Badge className={`ml-auto ${openai.valid ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
                  {openai.valid ? "Active" : "Error"}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="text-white font-semibold">API Key Not Configured</p>
                  <p className="text-xs text-slate-400">Set OPENAI_API_KEY in your .env.local file</p>
                </div>
                <Badge className="ml-auto bg-amber-900 text-amber-200">Not Set</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Feature Toggles</CardTitle>
          <CardDescription>Enable/disable admin features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div>
                <p className="text-white font-medium">Anomaly Detection</p>
                <p className="text-xs text-slate-400">Detect unusual patterns and alerts</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeature("anomaly_detection", features.anomaly_detection)}
                className={features.anomaly_detection ? "bg-green-900 text-green-200 border-green-700 hover:bg-green-800" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}
              >
                {features.anomaly_detection ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div>
                <p className="text-white font-medium">Real-time Alerts</p>
                <p className="text-xs text-slate-400">Send notifications for critical issues</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeature("realtime_alerts", features.realtime_alerts)}
                className={features.realtime_alerts ? "bg-green-900 text-green-200 border-green-700 hover:bg-green-800" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}
              >
                {features.realtime_alerts ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

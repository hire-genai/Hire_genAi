"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Alert {
  id: string
  alertType: string
  severity: string
  title: string
  description: string
  companyId: string | null
  status: string
  createdAt: string
}

export default function AnomaliesTab() {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/anomalies")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      if (data.ok) {
        setAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error("Anomalies fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-900 text-red-200"
      case "medium": return "bg-amber-900 text-amber-200"
      case "low": return "bg-blue-900 text-blue-200"
      default: return "bg-slate-700 text-slate-200"
    }
  }

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-500"
      case "medium": return "text-amber-500"
      case "low": return "text-blue-500"
      default: return "text-slate-500"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "usage_spike": return "Usage Spike"
      case "low_balance": return "Low Balance"
      case "payment_failure": return "Payment Failure"
      case "system_error": return "System Error"
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-slate-400">Loading anomalies...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-white">Anomalies & Alerts</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-slate-400">Live (30s)</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAlerts} className="text-slate-300 border-slate-700">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription>Detected issues and unusual patterns</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400">No anomalies detected</p>
              <p className="text-xs text-slate-500 mt-1">System is operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${getSeverityIconColor(alert.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium">{alert.title}</p>
                      <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>{alert.severity}</Badge>
                      <Badge className="text-xs bg-slate-700 text-slate-300">{getTypeLabel(alert.alertType)}</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{alert.description}</p>
                    <p className="text-xs text-slate-500 mt-2">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

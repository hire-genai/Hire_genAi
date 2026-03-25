"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Briefcase, DollarSign, Loader2, Calendar } from "lucide-react"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"

interface KPIs {
  totalRevenue: number
  monthRevenue: number
  revenueChange: number
  totalExpenses: number
  netProfit: number
  profitMarginPercent: number
}

interface TrendItem {
  date: string
  revenue: number
  expenses: number
  profit: number
}

interface Alert {
  id: string
  alertType: string
  severity: string
  title: string
  description: string
  createdAt: string
}

export default function OverviewTab() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPIs>({ totalRevenue: 0, monthRevenue: 0, revenueChange: 0, totalExpenses: 0, netProfit: 0, profitMarginPercent: 20 })
  const [trend, setTrend] = useState<TrendItem[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  const fetchData = useCallback(async (startDateStr: string, endDateStr: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/platform-stats?startDate=${startDateStr}&endDate=${endDateStr}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      if (data.ok) {
        setKpis(data.kpis)
        setTrend(data.trend || [])
        setAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error("Overview fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Date Filter - Always Visible */}
      <div className="flex justify-end">
        <DashboardDateFilter onApply={fetchData} defaultPreset="last90Days" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-400">Loading overview data...</span>
        </div>
      ) : (
        <>
      {/* Revenue & Profitability KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-200">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-100">${kpis.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-emerald-300 mt-1">All time earnings</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-gradient-to-br from-blue-900 to-slate-900 border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-100">${kpis.monthRevenue.toFixed(2)}</div>
            <p className="text-xs text-blue-300 mt-1">
              <span className={kpis.revenueChange >= 0 ? "text-emerald-400" : "text-red-400"}>
                {kpis.revenueChange >= 0 ? "↑" : "↓"} {Math.abs(kpis.revenueChange).toFixed(1)}% vs last month
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-orange-900 to-slate-900 border-orange-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-100">${kpis.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-orange-300 mt-1">AI & Infrastructure costs</p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="bg-gradient-to-br from-purple-900 to-slate-900 border-purple-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Net Profit</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-100">${kpis.netProfit.toFixed(2)}</div>
            <p className="text-xs text-purple-300 mt-1">
              <span className="text-emerald-400">
                {kpis.totalRevenue > 0 ? ((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1) : "0"}% margin
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expenses Trend */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Revenue vs Expenses</CardTitle>
            <CardDescription>Daily revenue and cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={(value: number) => `$${value.toFixed(4)}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="expenses" fill="#f97316" name="Expenses" />
                  <Bar dataKey="profit" fill="#8b5cf6" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-400">No trend data available for this period</div>
            )}
          </CardContent>
        </Card>

        {/* Profit Margin Trend */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Profit Trend</CardTitle>
            <CardDescription>Daily profit and cumulative growth</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={trend.map((item) => ({
                    date: item.date,
                    margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100) : 0,
                    profit: item.profit,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="margin" stroke="#a78bfa" strokeWidth={2} name="Margin %" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit ($)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-400">No trend data available for this period</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Active Alerts
          </CardTitle>
          <CardDescription>Issues requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400">No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    alert.severity === "high" ? "text-red-500" : alert.severity === "medium" ? "text-amber-500" : "text-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{alert.title}</p>
                      <Badge className={`text-xs ${
                        alert.severity === "high" ? "bg-red-900 text-red-200" : alert.severity === "medium" ? "bg-amber-900 text-amber-200" : "bg-blue-900 text-blue-200"
                      }`}>{alert.severity}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{new Date(alert.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}

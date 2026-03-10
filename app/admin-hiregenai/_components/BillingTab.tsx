"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"

interface UsageSummary {
  cvParsing: { count: number; totalCost: number; totalTokens: number }
  questionGeneration: { count: number; totalCost: number; totalTokens: number }
  videoInterview: { count: number; totalCost: number; totalMinutes: number }
}

interface LedgerEntry {
  id: string
  entryType: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
  companyName: string
  jobTitle: string
  createdAt: string
}

export default function BillingTab() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<UsageSummary>({
    cvParsing: { count: 0, totalCost: 0, totalTokens: 0 },
    questionGeneration: { count: 0, totalCost: 0, totalTokens: 0 },
    videoInterview: { count: 0, totalCost: 0, totalMinutes: 0 },
  })
  const [ledger, setLedger] = useState<LedgerEntry[]>([])

  const fetchData = useCallback(async (startDateStr: string, endDateStr: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/billing?startDate=${startDateStr}&endDate=${endDateStr}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      if (data.ok) {
        setSummary(data.summary)
        setLedger(data.ledger || [])
      }
    } catch (err) {
      console.error("Billing fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Date Filter - Always Visible */}
      <div className="flex justify-end">
        <DashboardDateFilter onApply={fetchData} defaultPreset="last90Days" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-400">Loading billing data...</span>
        </div>
      ) : (
        <>
      {/* Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">CV Parsing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${summary.cvParsing.totalCost.toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1">{summary.cvParsing.count} CVs parsed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Question Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${summary.questionGeneration.totalCost.toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1">{summary.questionGeneration.totalTokens.toLocaleString()} tokens used</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Video Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${summary.videoInterview.totalCost.toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1">{summary.videoInterview.totalMinutes} minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Ledger */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Usage Ledger</CardTitle>
          <CardDescription>Complete billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No billing records found for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Company</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Job</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Qty</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Unit Price</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-slate-700 text-slate-200 text-xs">{entry.entryType}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{entry.companyName}</td>
                      <td className="py-3 px-4 text-slate-300">{entry.jobTitle}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{entry.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-300">${entry.unitPrice.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                        ${entry.amount.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}

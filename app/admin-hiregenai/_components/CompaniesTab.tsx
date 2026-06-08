"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Company {
  id: string
  name: string
  billingStatus: string
  subscriptionStatus: string | null
  planName: string | null
  trialDaysLeft: number
  cancelAtCycleEnd: boolean
  nextBillingTime: string | null
  walletBalance: number
  monthSpent: number
  totalSpent: number
  userCount: number
  jobCount: number
  createdAt: string
}

interface CompaniesTabProps {
  onReady?: (fetchFn: (start: string, end: string) => void) => void
}

function formatJoinDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function getPlanBadge(company: Company): { label: string; className: string } {
  const { billingStatus, subscriptionStatus, planName, trialDaysLeft, cancelAtCycleEnd } = company

  // If a Razorpay subscription row exists, always show subscription state (never "Trial Expired")
  if (subscriptionStatus) {
    if (["active", "authenticated"].includes(subscriptionStatus)) {
      if (cancelAtCycleEnd) {
        return { label: `${planName || "Plan"} · Cancelling`, className: "bg-amber-900/70 text-amber-200" }
      }
      return { label: planName || "Active Plan", className: "bg-emerald-900/70 text-emerald-200" }
    }
    if (subscriptionStatus === "created") {
      return { label: planName ? `${planName} (Pending)` : "Pending Setup", className: "bg-blue-900/60 text-blue-300" }
    }
    if (subscriptionStatus === "halted") {
      return { label: `${planName || "Plan"} · Halted`, className: "bg-red-900/70 text-red-200" }
    }
    if (subscriptionStatus === "paused") {
      return { label: `${planName || "Plan"} · Paused`, className: "bg-amber-900/70 text-amber-200" }
    }
    if (subscriptionStatus === "cancelled" || subscriptionStatus === "expired") {
      return { label: planName ? `${planName} · Cancelled` : "Plan Cancelled", className: "bg-slate-700 text-slate-300" }
    }
    // any other Razorpay status
    return { label: planName || subscriptionStatus, className: "bg-slate-700 text-slate-300" }
  }

  // No subscription — show trial state
  if (billingStatus === "past_due") {
    return { label: "Past Due", className: "bg-red-900/70 text-red-200" }
  }

  if (trialDaysLeft > 0) {
    const cls = trialDaysLeft <= 2 ? "bg-orange-900/70 text-orange-200" : "bg-blue-900/70 text-blue-200"
    return { label: `Trial · ${trialDaysLeft}d left`, className: cls }
  }

  if (billingStatus === "active") {
    return { label: "Active (No Plan)", className: "bg-slate-700 text-slate-300" }
  }

  return { label: "Trial Expired", className: "bg-orange-900/70 text-orange-200" }
}

function getBillingStatusBadge(status: string): string {
  switch (status) {
    case "active": return "bg-green-900/60 text-green-300"
    case "trial": return "bg-blue-900/60 text-blue-300"
    case "past_due": return "bg-red-900/60 text-red-300"
    case "suspended": return "bg-red-900/70 text-red-200"
    default: return "bg-slate-700 text-slate-300"
  }
}

export default function CompaniesTab({ onReady }: CompaniesTabProps) {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])

  const searchRef = useRef(search)
  useEffect(() => { searchRef.current = search }, [search])

  const fetchCompanies = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchRef.current) params.set("search", searchRef.current)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      const res = await fetch(`/api/admin/companies-list?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      if (data.ok) setCompanies(data.companies || [])
    } catch (err) {
      console.error("Companies fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCompanies() }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchCompanies(), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (onReady) onReady(fetchCompanies)
  }, [])

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="w-full sm:w-80 relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
        />
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="h-3 w-32 bg-slate-700 animate-pulse rounded mb-6" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {["Company", "Joined", "Account", "Plan", "Users", "Jobs", "Wallet", "This Month", "Total Spent"].map((h) => (
                    <th key={h} className="py-3 px-4">
                      <div className="h-4 w-20 bg-slate-700 animate-pulse rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-3 px-4">
                      <div className="h-4 w-36 bg-slate-700 animate-pulse rounded" />
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-5 w-16 bg-slate-700 animate-pulse rounded-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>{filteredCompanies.length} companies</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCompanies.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No companies found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Company</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Joined</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Account</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Plan</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-medium">Users</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-medium">Jobs</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Wallet</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">This Month</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-medium">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => {
                      const planBadge = getPlanBadge(company)
                      return (
                        <tr key={company.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-3 px-4">
                            <div className="text-slate-200 font-medium">{company.name}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-sm whitespace-nowrap">
                            {formatJoinDate(company.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-xs ${getBillingStatusBadge(company.billingStatus ?? "trial")}`}>
                              {company.billingStatus ?? "trial"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-xs whitespace-nowrap ${planBadge.className}`}>
                              {planBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-blue-400 font-semibold">
                            {company.userCount}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {company.jobCount ?? 0}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                            ${company.walletBalance.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            ${company.monthSpent.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            ${company.totalSpent.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

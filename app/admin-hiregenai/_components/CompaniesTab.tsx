"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"
import { Skeleton, StatCardGridLoader, TalentPoolTableLoader } from '@/components/ui/skeleton-loader'

interface Company {
  id: string
  name: string
  status: string
  walletBalance: number
  monthSpent: number
  totalSpent: number
  userCount: number
  subscriptionPlan: string
  createdAt: string
}

interface CompaniesTabProps {
  onReady?: (fetchFn: (start: string, end: string) => void) => void
}

export default function CompaniesTab({ onReady }: CompaniesTabProps) {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])

  // Refs to track latest values without recreating fetchCompanies
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
      if (data.ok) {
        setCompanies(data.companies || [])
      }
    } catch (err) {
      console.error("Companies fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, []) // empty deps - never recreated

  // Initial load only
  useEffect(() => {
    fetchCompanies()
  }, [])

  // Re-fetch on search with debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchCompanies(), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Register stable function with parent - only once
  useEffect(() => {
    if (onReady) onReady(fetchCompanies)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-900 text-green-200"
      case "trialing":
      case "trial":
        return "bg-blue-900 text-blue-200"
      case "past_due":
        return "bg-red-900 text-red-200"
      case "cancelled":
        return "bg-slate-700 text-slate-200"
      default:
        return "bg-slate-700 text-slate-200"
    }
  }

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search Bar */}
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
        <div className="space-y-4">
          {/* Search Bar Skeleton */}
          <div className="w-full sm:w-80">
            <div className="relative">
              <div className="absolute left-3 top-3 h-4 w-4 bg-slate-700 animate-pulse rounded" />
              <div className="pl-10 h-10 w-full bg-slate-700 animate-pulse rounded-lg" />
            </div>
          </div>

          {/* Companies Table Card Skeleton */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="h-3 w-32 bg-slate-700 animate-pulse rounded mb-4" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4">
                      <div className="h-4 w-20 bg-slate-700 animate-pulse rounded" />
                    </th>
                    <th className="text-left py-3 px-4">
                      <div className="h-4 w-16 bg-slate-700 animate-pulse rounded" />
                    </th>
                    <th className="text-center py-3 px-4">
                      <div className="h-4 w-16 bg-slate-700 animate-pulse rounded" />
                    </th>
                    <th className="text-right py-3 px-4">
                      <div className="h-4 w-28 bg-slate-700 animate-pulse rounded" />
                    </th>
                    <th className="text-right py-3 px-4">
                      <div className="h-4 w-24 bg-slate-700 animate-pulse rounded" />
                    </th>
                    <th className="text-right py-3 px-4">
                      <div className="h-4 w-20 bg-slate-700 animate-pulse rounded" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-3 px-4">
                        <div className="h-4 w-32 bg-slate-700 animate-pulse rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-6 w-16 bg-slate-700 animate-pulse rounded-full" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="h-4 w-8 bg-slate-700 animate-pulse rounded mx-auto" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-4 w-20 bg-slate-700 animate-pulse rounded ml-auto" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-4 w-16 bg-slate-700 animate-pulse rounded ml-auto" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-4 w-16 bg-slate-700 animate-pulse rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div>
            <CardDescription>{filteredCompanies.length} companies</CardDescription>
          </div>
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
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium">Users</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Wallet Balance</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">This Month</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-300">{company.name}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(company.status)}>{company.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-blue-400 font-semibold">
                        {company.userCount}
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
                  ))}
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

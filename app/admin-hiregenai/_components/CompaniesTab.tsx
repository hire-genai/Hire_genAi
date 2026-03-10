"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"

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

export default function CompaniesTab() {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])

  const fetchCompanies = useCallback(async (searchTerm: string, startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      let url = `/api/admin/companies-list?search=${encodeURIComponent(searchTerm)}`
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      const res = await fetch(url)
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
  }, [])

  const handleDateRangeApply = (startDate: string, endDate: string) => {
    fetchCompanies(search, startDate, endDate)
  }

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
    <div className="space-y-6">
      {/* Header Row with Search and Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
          />
        </div>
        <div className="flex-shrink-0">
          <DashboardDateFilter onApply={handleDateRangeApply} defaultPreset="last90Days" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-400">Loading companies...</span>
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

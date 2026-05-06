"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton, StatCardGridLoader, TalentPoolTableLoader } from '@/components/ui/skeleton-loader'

interface Job {
  id: string
  title: string
  status: string
  companyId: string
  companyName: string
  interviewCount: number
  cvCost: number
  questionsCost: number
  videoCost: number
  totalCost: number
  createdAt: string
}

interface CompanyOption {
  id: string
  name: string
}

interface JobsTabProps {
  onReady?: (fetchFn: (start: string, end: string) => void) => void
}

export default function JobsTab({ onReady }: JobsTabProps) {
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])

  // Refs to track latest values without recreating fetchJobs
  const searchTermRef = useRef(searchTerm)
  const selectedCompanyRef = useRef(selectedCompany)

  useEffect(() => { searchTermRef.current = searchTerm }, [searchTerm])
  useEffect(() => { selectedCompanyRef.current = selectedCompany }, [selectedCompany])

  const fetchJobs = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTermRef.current) params.set("search", searchTermRef.current)
      if (selectedCompanyRef.current !== "all") params.set("companyId", selectedCompanyRef.current)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      const res = await fetch(`/api/admin/jobs?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      if (data.ok) {
        setJobs(data.jobs || [])
        setCompanies(data.companies || [])
      }
    } catch (err) {
      console.error("Jobs fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, []) // empty deps - never recreated

  // Initial load only
  useEffect(() => {
    fetchJobs()
  }, [])

  // Re-fetch on company change
  useEffect(() => {
    fetchJobs()
  }, [selectedCompany])

  // Re-fetch on search with debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchJobs(), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Register stable function with parent - only once
  useEffect(() => {
    if (onReady) onReady(fetchJobs)
  }, [])

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams({ format: "csv" })
      if (searchTerm) params.set("search", searchTerm)
      if (selectedCompany !== "all") params.set("companyId", selectedCompany)
      const res = await fetch(`/api/admin/jobs?${params.toString()}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jobs-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
    } catch (err) {
      console.error("CSV export error:", err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filters Card Skeleton */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="h-5 w-16 bg-slate-700 animate-pulse rounded mb-5" /> {/* "Filters" label */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-slate-700 animate-pulse rounded" />
              <div className="h-10 w-full bg-slate-700 animate-pulse rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 bg-slate-700 animate-pulse rounded" />
              <div className="h-10 w-full bg-slate-700 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>

        {/* Jobs List Card Skeleton */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <div className="h-5 w-12 bg-slate-700 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-700 animate-pulse rounded" />
            </div>
            <div className="h-9 w-32 bg-slate-700 animate-pulse rounded-lg" /> {/* Export CSV */}
          </div>

          {/* Job item rows */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-slate-700 animate-pulse rounded" />
                  <div className="h-3 w-24 bg-slate-700 animate-pulse rounded" />
                  <div className="h-3 w-56 bg-slate-700 animate-pulse rounded" />
                </div>
                <div className="h-6 w-14 bg-slate-700 animate-pulse rounded-full" /> {/* status badge */}
              </div>
              <div className="grid grid-cols-5 gap-4 mt-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-3 w-16 bg-slate-700 animate-pulse rounded" />
                    <div className="h-4 w-20 bg-slate-700 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id} className="text-white">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Jobs</CardTitle>
            <CardDescription>{jobs.length} jobs found</CardDescription>
          </div>
          <Button
            onClick={exportToCSV}
            disabled={jobs.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No jobs found</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-slate-400">{job.companyName}</p>
                      <p className="text-xs text-slate-500 mt-1">ID: {job.id}</p>
                    </div>
                    <Badge
                      className={job.status === "open" ? "bg-green-900 text-green-200" : "bg-slate-700 text-slate-200"}
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Interviews</p>
                      <p className="text-white font-semibold">{job.interviewCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total Cost</p>
                      <p className="text-emerald-400 font-semibold">${job.totalCost.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">CV Cost</p>
                      <p className="text-white font-semibold">${job.cvCost.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Questions Cost</p>
                      <p className="text-white font-semibold">${job.questionsCost.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Video Cost</p>
                      <p className="text-white font-semibold">${job.videoCost.toFixed(4)}</p>
                    </div>
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

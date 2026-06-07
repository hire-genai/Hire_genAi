"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Download, Search, Users, FileText, Video, DollarSign, Cpu, HelpCircle } from "lucide-react"

interface Job {
  id: string
  title: string
  status: string
  companyId: string
  companyName: string
  applicationCount: number
  cvParsedCount: number
  interviewCount: number
  cvCost: number
  questionsCost: number
  videoCost: number
  totalCost: number
  createdAt: string
}

interface CompanyOption { id: string; name: string }
interface JobsTabProps {
  onReady?: (fetchFn: (start: string, end: string) => void) => void
}

const METRICS = [
  { key: "applicants",     label: "Total Applicants",  icon: Users,      color: "text-blue-400",    getValue: (j: Job) => j.applicationCount, fmt: (v: number) => String(v) },
  { key: "cv_parsed",      label: "CV Parsed",          icon: FileText,   color: "text-amber-400",   getValue: (j: Job) => j.cvParsedCount,    fmt: (v: number) => String(v) },
  { key: "interviews",     label: "AI Interviews",      icon: Video,      color: "text-violet-400",  getValue: (j: Job) => j.interviewCount,   fmt: (v: number) => String(v) },
  { key: "cv_cost",        label: "Total CV Cost",      icon: DollarSign, color: "text-emerald-400", getValue: (j: Job) => j.cvCost,           fmt: (v: number) => `$${v.toFixed(3)}` },
  { key: "interview_cost", label: "AI Interview Cost",  icon: Cpu,        color: "text-pink-400",    getValue: (j: Job) => j.videoCost,        fmt: (v: number) => `$${v.toFixed(3)}` },
  { key: "question_cost",  label: "Question Cost",      icon: HelpCircle, color: "text-cyan-400",    getValue: (j: Job) => j.questionsCost,    fmt: (v: number) => `$${v.toFixed(3)}` },
]

const statusBadge = (s: string) =>
  s === "open" ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
  : s === "draft" ? "bg-slate-700/60 text-slate-400"
  : "bg-slate-700 text-slate-400"

export default function JobsTab({ onReady }: JobsTabProps) {
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [activeMetric, setActiveMetric] = useState("applicants")

  const searchRef = useRef(searchTerm)
  const companyRef = useRef(selectedCompany)
  useEffect(() => { searchRef.current = searchTerm }, [searchTerm])
  useEffect(() => { companyRef.current = selectedCompany }, [selectedCompany])

  const fetchJobs = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (searchRef.current) p.set("search", searchRef.current)
      if (companyRef.current !== "all") p.set("companyId", companyRef.current)
      if (startDate) p.set("startDate", startDate)
      if (endDate) p.set("endDate", endDate)
      const res = await fetch(`/api/admin/jobs?${p}`)
      const data = await res.json()
      if (data.ok) { setJobs(data.jobs || []); setCompanies(data.companies || []) }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchJobs() }, [])
  useEffect(() => { fetchJobs() }, [selectedCompany])
  useEffect(() => { const t = setTimeout(() => fetchJobs(), 300); return () => clearTimeout(t) }, [searchTerm])
  useEffect(() => { if (onReady) onReady(fetchJobs) }, [])

  const exportCSV = async () => {
    const p = new URLSearchParams({ format: "csv" })
    if (searchTerm) p.set("search", searchTerm)
    if (selectedCompany !== "all") p.set("companyId", selectedCompany)
    const res = await fetch(`/api/admin/jobs?${p}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `company-usage-${new Date().toISOString().split("T")[0]}.csv`; a.click()
  }

  const totals = METRICS.reduce((acc, m) => {
    acc[m.key] = jobs.reduce((s, j) => s + m.getValue(j), 0)
    return acc
  }, {} as Record<string, number>)

  const fmtDate = (dt: string) =>
    new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="space-y-4">

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-48">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 text-sm h-9">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-200">All Companies</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-slate-200">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search jobs or company…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500 h-9 text-sm"
          />
        </div>
        <button
          onClick={exportCSV}
          disabled={jobs.length === 0}
          className="ml-auto flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Metric Summary Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {METRICS.map(m => {
          const Icon = m.icon
          const isActive = activeMetric === m.key
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                isActive ? "bg-slate-800 border-slate-600" : "bg-slate-900 border-slate-800 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide leading-none">{m.label}</span>
              </div>
              <span className={`text-xl font-extrabold leading-none ${m.color}`}>
                {loading ? "—" : m.fmt(totals[m.key] ?? 0)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading company usage data...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No jobs found</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-800">
              <span className="text-xs text-slate-500">{jobs.length} jobs across all companies</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 1050 }}>
                <thead>
                  <tr className="border-b border-slate-800">
                    {["Job Title", "Company", "Status", "Applicants", "CV Parsed", "AI Interviews", "CV Cost", "Q Cost", "Video Cost", "Total Cost", "Created"].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 max-w-[180px]">
                        <div className="text-slate-200 font-medium truncate text-sm">{job.title}</div>
                        <div className="text-[10px] text-slate-600 font-mono">{job.id.substring(0, 8).toUpperCase()}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-xs whitespace-nowrap">{job.companyName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-blue-400 font-bold">{job.applicationCount}</td>
                      <td className="py-2.5 px-3 text-center text-amber-400 font-bold">{job.cvParsedCount}</td>
                      <td className="py-2.5 px-3 text-center text-violet-400 font-bold">{job.interviewCount}</td>
                      <td className="py-2.5 px-3 text-slate-300 text-xs font-mono">${job.cvCost.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-slate-300 text-xs font-mono">${job.questionsCost.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-slate-300 text-xs font-mono">${job.videoCost.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold text-xs font-mono">${job.totalCost.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t border-slate-700 bg-slate-800/60">
                    <td className="py-2.5 px-3 text-xs font-semibold text-slate-400" colSpan={3}>Totals</td>
                    <td className="py-2.5 px-3 text-center text-blue-400 font-bold text-xs">{totals.applicants}</td>
                    <td className="py-2.5 px-3 text-center text-amber-400 font-bold text-xs">{totals.cv_parsed}</td>
                    <td className="py-2.5 px-3 text-center text-violet-400 font-bold text-xs">{totals.interviews}</td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs font-mono font-bold">${(totals.cv_cost ?? 0).toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs font-mono font-bold">${(totals.question_cost ?? 0).toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs font-mono font-bold">${(totals.interview_cost ?? 0).toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold text-xs font-mono">
                      ${jobs.reduce((s, j) => s + j.totalCost, 0).toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

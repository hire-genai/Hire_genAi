'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Clock, Search, Loader2, AlertCircle, Calendar, Users, X, Briefcase, ChevronRight } from 'lucide-react'

interface CompanyInfo {
  id: string
  name: string
  slug: string
  website: string
  industry: string
  size: string
  logoUrl: string | null
}

interface JobListing {
  id: string
  title: string
  department: string
  location: string
  jobType: string
  workMode: string
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceYears: number | null
  applicationDeadline: string | null
  expectedStartDate: string | null
  status: string
  publishedAt: string
  hiringPriority: string | null
  numberOfOpenings: number
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function workModeColor(mode: string) {
  switch (mode?.toLowerCase()) {
    case 'remote': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'onsite':
    case 'on-site': return 'bg-slate-100 text-slate-700 border-slate-200'
    default: return 'bg-violet-50 text-violet-700 border-violet-200'
  }
}

export default function CompanyJobsPage() {
  const params = useParams()
  const router = useRouter()
  const companySlug = params.companySlug as string
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/jobs/${companySlug}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load jobs')
        setCompany(data.company)
        setJobs(data.jobs || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [companySlug])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.requiredSkills.some(s => s.toLowerCase().includes(q))
    ).slice(0, 6)
  }, [search, jobs])

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs
    const q = search.toLowerCase()
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.requiredSkills.some(s => s.toLowerCase().includes(q))
    )
  }, [jobs, search])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-400">Loading jobs…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow p-8 text-center border border-red-100">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 mb-1">Company Not Found</h2>
          <p className="text-slate-400 text-sm mb-5">{error}</p>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-900 underline">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company?.name} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <span className="text-sm font-bold text-white">{company?.name?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-900">{company?.name}</span>
          </div>

          <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />

          <div ref={searchRef} className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search roles…"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowDropdown(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showDropdown && search.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                {suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400">No matching roles</div>
                ) : suggestions.map(job => (
                  <button key={job.id}
                    onMouseDown={() => { router.push(`/jobs/${companySlug}/${job.id}`); setShowDropdown(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{job.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{job.department}{job.location ? ` · ${job.location}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />
          <span className="shrink-0 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            {jobs.length} open {jobs.length === 1 ? 'role' : 'roles'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {search.trim() && (
          <p className="text-xs text-slate-400 mb-4">
            {filtered.length === 0 ? 'No results' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`} for &ldquo;{search}&rdquo;
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-500 mb-1">No roles found</h3>
            <p className="text-xs text-slate-400">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(job => {
              const isUrgent = job.hiringPriority === 'urgent'
              const isHigh = job.hiringPriority === 'high'
              return (
                <div
                  key={job.id}
                  onClick={() => router.push(`/jobs/${companySlug}/${job.id}`)}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md shadow-sm transition-all duration-200 cursor-pointer select-none flex flex-col"
                >
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Dept + badges */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{job.department}</span>
                      {isUrgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Urgent</span>}
                      {isHigh && !isUrgent && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">High Priority</span>}
                    </div>

                    {/* Title */}
                    <h2 className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {job.title}
                    </h2>

                    {/* Meta chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {job.location && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                          <MapPin className="h-2.5 w-2.5" />{job.location}
                        </span>
                      )}
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${workModeColor(job.workMode)}`}>
                        {job.workMode}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                        <Clock className="h-2.5 w-2.5" />{job.jobType}
                      </span>
                      {job.experienceYears ? (
                        <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                          {job.experienceYears}+ yrs
                        </span>
                      ) : null}
                    </div>

                    {/* Skills — wraps freely, container clipped to ~2 rows */}
                    {job.requiredSkills.length > 0 && (
                      <div className="overflow-hidden" style={{ maxHeight: '3.4rem' }}>
                        <div className="flex flex-wrap gap-1.5">
                          {job.requiredSkills.map(skill => (
                            <span
                              key={skill}
                              title={skill}
                              className="text-[11px] bg-slate-100 text-slate-600 rounded-md px-2 py-0.5 font-medium whitespace-nowrap"
                            >
                              {skill.length > 22 ? skill.slice(0, 21) + '…' : skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{timeAgo(job.publishedAt)}</span>
                      {job.numberOfOpenings > 1 && (
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.numberOfOpenings} openings</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold group-hover:gap-2 transition-all">
                      Apply <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="text-xs text-slate-300">Powered by <span className="font-semibold text-emerald-500">HireGenAI</span></p>
        </div>
      </div>
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic';

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Filter, Plus, Mail, Phone, Calendar, X, Send, Briefcase, Target, TrendingUp, Clock, Upload, FileSpreadsheet, Linkedin, FileText, Settings2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { StatCardGridLoader, TalentPoolTableLoader, ErrorState } from '@/components/ui/skeleton-loader'

type UserRole = 'recruiter' | 'manager' | 'director'

interface TalentPoolEntry {
  poolId: string
  candidateId: string
  name: string
  position: string
  email: string
  phone: string
  location: string
  currentCompany: string
  companies: string[]
  experienceYears: number | null
  linkedinUrl: string
  resumeUrl: string
  photoUrl: string
  addedDate: string
  source: string
  status: string
  lastContact: string
  skills: string[]
  cvScore: string | null
  interviewScore: string | null
  rejectionStage: string | null
  rejectionReason: string | null
  addedByName: string | null
  notes: string
  history: Array<{ date: string; event: string; description: string; source?: string; stage?: string }>
}

interface TalentPoolData {
  entries: TalentPoolEntry[]
  stats: {
    total: number
    activeInterest: number
    passive: number
    byPosition: number
    bySource: { referral: number; linkedin: number; pastApplication: number }
    recentlyContacted: number
    avgSkillsPerCandidate: string
  }
  availableJDs: Array<{ id: string; title: string; department: string; location: string; responsibilities: string[]; required_skills: string[]; description: string }>
  recruiters: Array<{ id: string; name: string }>
}

const emailTemplates: Record<string, { subject: string; body: string }> = {
  jd: {
    subject: 'Exciting New Opportunity at [Company Name]',
    body: `Hi [Candidate Name],

I hope this email finds you well! I wanted to reach out to share an exciting opportunity that I think would be a great fit for your background and skills.

We're currently hiring for: [Job Title]
Location: [Location]
Department: [Department]

Key Responsibilities:
• Lead technical architecture and implementation
• Collaborate with cross-functional teams
• Mentor junior team members

Required Skills:
• [Skill 1]
• [Skill 2]
• [Skill 3]

This role offers competitive compensation, comprehensive benefits, and the opportunity to work on cutting-edge projects.

👉 **Apply Here:** [Apply Link]

Would you be interested in learning more? I'd love to schedule a call to discuss this opportunity in detail.

Best regards,
[Your Name]
[Company Name] Talent Acquisition Team`
  },
  newsletter: {
    subject: '[Company Name] Monthly Newsletter - [Month]',
    body: `Hi [Candidate Name],

Welcome to this month's newsletter from [Company Name]!

🎉 Company Updates:
• Exciting product launches and company milestones
• New office expansion
• Awards and recognition

💼 Career Opportunities:
We're growing! Check out our latest openings:
• Software Engineers
• Product Managers
• Designers

📚 Industry Insights:
• Latest trends in technology
• Professional development resources
• Upcoming webinars and events

🌟 Employee Spotlight:
Meet our talented team members and learn about their journeys

Stay connected with us:
LinkedIn | Twitter | Website

Best regards,
The [Company Name] Team`
  },
  greeting: {
    subject: 'Season\'s Greetings from [Company Name]',
    body: `Hi [Candidate Name],

We hope this message finds you well!

As the year comes to a close, we wanted to take a moment to reach out and wish you all the best. Whether you've recently connected with us or we've been in touch for a while, we truly appreciate your interest in [Company Name].

🎊 What's New:
We've had an incredible year of growth and innovation, and we're excited about what's ahead in the coming year.

🤝 Stay Connected:
We'd love to keep you in the loop about opportunities that match your skills and career goals. Feel free to reach out anytime!

Wishing you and your loved ones a wonderful holiday season and a prosperous new year!

Warm regards,
[Your Name]
[Company Name] Talent Acquisition Team`
  }
}

// Data is now fetched from API

export default function TalentPoolPage() {
  const { company, user } = useAuth()
  const [poolData, setPoolData] = useState<TalentPoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Active Interest' | 'Passive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [showJDDialog, setShowJDDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailType, setEmailType] = useState<'jd' | 'newsletter' | 'greeting' | ''>('')
  const [selectedJD, setSelectedJD] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [viewAsRole, setViewAsRole] = useState<UserRole | ''>('')
  const [viewAsRecruiter, setViewAsRecruiter] = useState('all')
  const [showAddCandidateDialog, setShowAddCandidateDialog] = useState(false)
  const [showCandidateDetailsDialog, setShowCandidateDetailsDialog] = useState(false)
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState<any>(null)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    source: 'Manual Entry',
    status: 'Passive',
    skills: '',
    experience: '',
    location: '',
    currentCompany: '',
    linkedIn: '',
    notes: ''
  })
  const [showBulkEmail, setShowBulkEmail] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [selectedJDForSend, setSelectedJDForSend] = useState<string>('')
  const [jdEmailPreview, setJdEmailPreview] = useState<{ subject: string; body: string } | null>(null)

  const fetchTalentPool = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = company?.id ? `?companyId=${company.id}` : ''
      const res = await fetch(`/api/talent-pool${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch talent pool data')
      }
      const json = await res.json()
      setPoolData(json.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load talent pool')
    } finally {
      setLoading(false)
    }
  }, [company?.id])

  // Initialize viewAsRole from user role
  useEffect(() => {
    if (user?.role) {
      setViewAsRole(user.role as UserRole)
    }
  }, [user?.role])

  useEffect(() => {
    fetchTalentPool()
  }, [fetchTalentPool])

  // Permission check - recruiters, managers, and directors can modify
  const canModify = viewAsRole === 'recruiter' || viewAsRole === 'manager' || viewAsRole === 'director'

  // Use fetched data or empty arrays
  const talentPoolEntries = poolData?.entries || []
  const availableJDs = poolData?.availableJDs || []
  const recruiters = poolData?.recruiters || []

  // Extract unique values for filters
  const allPositions = [...new Set(talentPoolEntries.map(c => c.position))]
  const allSources = [...new Set(talentPoolEntries.map(c => c.source))]

  const filteredCandidates = talentPoolEntries.filter(candidate => {
    const matchesStatus = selectedStatus === 'all' || candidate.status === selectedStatus
    const matchesSearch = searchQuery === '' || 
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSkill = skillFilter === '' || 
      candidate.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase()))
    const matchesPosition = positionFilter === 'all' || candidate.position === positionFilter
    const matchesSource = sourceFilter === 'all' || candidate.source === sourceFilter
    
    return matchesStatus && matchesSearch && matchesSkill && matchesPosition && matchesSource
  })

  const stats = poolData?.stats || {
    total: 0,
    activeInterest: 0,
    passive: 0,
    byPosition: 0,
    bySource: { referral: 0, linkedin: 0, pastApplication: 0 },
    recentlyContacted: 0,
    avgSkillsPerCandidate: '0',
  }

  return (
    <div className="space-y-2 p-3 md:p-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Talent Pool</h1>
          <p className="text-xs text-gray-600 mt-0.5">Manage and engage with potential candidates</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {/* View As Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">View as:</span>
            <Select value={viewAsRole} onValueChange={(v) => setViewAsRole(v as UserRole)}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="director">Director</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-[130px]">
              <Select value={viewAsRecruiter} onValueChange={setViewAsRecruiter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="All Recruiters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recruiters</SelectItem>
                  {recruiters.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            className="gap-2 w-full sm:w-auto" 
            size="sm"
            onClick={() => setShowAddCandidateDialog(true)}
          >
            <Plus className="h-3 w-3" />
            Add to Pool
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <>
          <StatCardGridLoader count={6} theme="light" />
          <TalentPoolTableLoader rows={6} theme="light" />
        </>
      )}

      {/* Error State */}
      {!loading && error && <ErrorState message={error} onRetry={fetchTalentPool} />}

      {/* Enhanced Stats Dashboard */}
      {!loading && !error && (<>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Total Pool</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{stats.byPosition} positions</p>
            </div>
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Active Interest</p>
              <p className="text-xl font-bold text-green-600">{stats.activeInterest}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{stats.total > 0 ? ((stats.activeInterest/stats.total)*100).toFixed(0) : 0}% of pool</p>
            </div>
            <Target className="h-6 w-6 text-green-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Passive</p>
              <p className="text-xl font-bold text-gray-600">{stats.passive}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{stats.total > 0 ? ((stats.passive/stats.total)*100).toFixed(0) : 0}% of pool</p>
            </div>
            <Users className="h-6 w-6 text-gray-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Referrals</p>
              <p className="text-xl font-bold text-purple-600">{stats.bySource.referral}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">High quality source</p>
            </div>
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Recent Contact</p>
              <p className="text-xl font-bold text-orange-600">{stats.recentlyContacted}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Last 7 days</p>
            </div>
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Avg Skills</p>
              <p className="text-xl font-bold text-indigo-600">{stats.avgSkillsPerCandidate}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Per candidate</p>
            </div>
            <Briefcase className="h-6 w-6 text-indigo-600" />
          </div>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="p-2">
        <div className="space-y-2">
          {/* Search and Filter Inputs - 3x2 grid on mobile, single row on desktop */}
          <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-center">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 md:flex-1 md:min-w-[200px]"
            />
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as 'all' | 'Active Interest' | 'Passive')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Active Interest">Active Interest</SelectItem>
                <SelectItem value="Passive">Passive</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="text"
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="col-span-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {allPositions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {allSources.map(src => (
                  <SelectItem key={src} value={src}>{src}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
              <span className="text-sm font-medium text-gray-700">
                {selectedCandidates.length} selected
              </span>
              {canModify ? (
                <>
                  <Button 
                    size="sm"
                    onClick={() => setShowEmailDialog(true)}
                    className="bg-transparent"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Send Email
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowJDDialog(true)}
                    variant="outline"
                    className="bg-transparent"
                  >
                    Send JD
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="text-xs">View-only mode: Cannot send emails</Badge>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedCandidates([])}
                className="bg-transparent"
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Talent Pool Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1400px]">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="px-3 py-3 text-left bg-gray-50 border-r border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCandidates(filteredCandidates.map(c => c.email))
                      else setSelectedCandidates([])
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap">Candidate Name</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap">Email / Phone</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap">Exp</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap">LinkedIn / Resume</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap min-w-[120px]">Position</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide min-w-[200px]">Skills</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap min-w-[150px]">Previous Company Set</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap">CV / Interview Score</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap min-w-[130px]">Status / Source</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 uppercase tracking-wide whitespace-nowrap">Last Contact</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 bg-gray-50 uppercase tracking-wide sticky right-0 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)] border-l border-gray-200">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredCandidates.map((candidate, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors border-b">
                  {/* Checkbox */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.email)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCandidates([...selectedCandidates, candidate.email])
                        else setSelectedCandidates(selectedCandidates.filter(e => e !== candidate.email))
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300"
                    />
                  </td>
                  {/* Candidate Name */}
                  <td className="px-3 py-3 border-r border-gray-100 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                        {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <button
                        onClick={() => { setSelectedCandidateDetails(candidate); setShowCandidateDetailsDialog(true) }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 underline decoration-dotted cursor-pointer transition-colors text-left leading-tight whitespace-nowrap"
                      >
                        {candidate.name}
                      </button>
                    </div>
                  </td>
                  {/* Email / Phone */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <div className="text-xs text-gray-700 whitespace-nowrap">{candidate.email || '—'}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">{candidate.phone || '—'}</div>
                  </td>
                  {/* Exp */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    {candidate.experienceYears != null ? (
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-200 whitespace-nowrap">
                        {candidate.experienceYears} yr{candidate.experienceYears !== 1 ? 's' : ''}
                      </span>
                    ) : <span className="text-[10px] text-gray-400">—</span>}
                  </td>
                  {/* LinkedIn / Resume */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <div className="flex items-center gap-2">
                      {candidate.linkedinUrl ? (
                        <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn"
                          className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                          <Linkedin className="h-4 w-4 text-green-600 fill-green-600" strokeWidth={2} />
                        </a>
                      ) : (
                        <span title="No LinkedIn" className="inline-flex items-center justify-center w-7 h-7 rounded bg-gray-50 border border-gray-200">
                          <Linkedin className="h-4 w-4 text-gray-400" strokeWidth={2} />
                        </span>
                      )}
                      {candidate.resumeUrl ? (
                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" title="Resume"
                          className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                          <FileText className="h-4 w-4 text-green-600" strokeWidth={2} />
                        </a>
                      ) : (
                        <span title="No Resume" className="inline-flex items-center justify-center w-7 h-7 rounded bg-gray-50 border border-gray-200">
                          <FileText className="h-4 w-4 text-gray-400" strokeWidth={2} />
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Position */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <div className="text-xs text-gray-700 leading-tight">{candidate.position || '—'}</div>
                  </td>
                  {/* Skills */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    {candidate.skills.length > 0 ? (
                      <div className="max-h-[80px] overflow-y-auto flex flex-wrap gap-1" style={{scrollbarWidth:'thin', scrollbarColor:'#e5e7eb transparent'}}>
                        {candidate.skills.map((skill, i) => (
                          <span key={i} className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-[10px] text-gray-400">—</span>}
                  </td>
                  {/* Company Set */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    {(() => {
                      const companyList = (candidate.companies && candidate.companies.length > 0)
                        ? candidate.companies
                        : (candidate.currentCompany ? candidate.currentCompany.split(',').map(c => c.trim()).filter(Boolean) : [])
                      return companyList.length > 0 ? (
                        <div className="max-h-[72px] overflow-y-auto flex flex-col gap-0.5" style={{scrollbarWidth:'thin', scrollbarColor:'#e5e7eb transparent'}}>
                          {companyList.map((c, i) => (
                            <span key={i} className="text-[10px] text-gray-700 whitespace-nowrap leading-5">
                              {i + 1}. {c}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-[10px] text-gray-400">—</span>
                    })()}
                  </td>
                  {/* CV / Interview Score */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <Badge className="bg-emerald-100 text-emerald-800 font-semibold text-[10px] px-1.5 py-0 h-auto">
                      {candidate.cvScore || 'N/A'}
                    </Badge>
                    <div className="mt-1">
                      <Badge className={`text-[10px] px-1.5 py-0 h-auto ${candidate.interviewScore ? 'bg-purple-100 text-purple-800 font-semibold' : 'bg-gray-100 text-gray-500'}`}>
                        {candidate.interviewScore || 'N/A'}
                      </Badge>
                    </div>
                  </td>
                  {/* Status / Source */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <Badge className={`text-[10px] px-1.5 py-0 h-auto ${candidate.status === 'Active Interest' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {candidate.status}
                    </Badge>
                    <div className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">{candidate.source}</div>
                  </td>
                  {/* Last Contact */}
                  <td className="px-3 py-3 border-r border-gray-100">
                    <div className="text-[10px] text-gray-600 whitespace-nowrap">{candidate.lastContact}</div>
                  </td>
                  {/* Action - sticky */}
                  <td className="px-3 py-3 sticky right-0 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-gray-100">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setSelectedCandidateDetails(candidate); setShowCandidateDetailsDialog(true) }}
                        title="View Profile"
                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => { setSelectedCandidates([candidate.email]); setShowEmailDialog(true) }}
                        title="Send Email"
                        disabled={!canModify}
                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40"
                      >
                        <Mail className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </Card>
      </>
      )}

      {/* Send Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg font-semibold">Send Email to Candidates</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowEmailDialog(false)
                  setEmailType('')
                  setSelectedJD('')
                  setEmailSubject('')
                  setEmailBody('')
                }}
                className="bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Recipients */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Recipients: {selectedCandidates.length} candidate(s)
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {filteredCandidates
                    .filter(c => selectedCandidates.includes(c.email))
                    .slice(0, 10)
                    .map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                  {selectedCandidates.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedCandidates.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Email Type Selection */}
              {!emailType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Email Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all text-center"
                      onClick={() => {
                        setEmailType('jd')
                        setEmailSubject(emailTemplates.jd.subject)
                        setEmailBody(emailTemplates.jd.body)
                      }}
                    >
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-semibold text-sm">New Job Opening</div>
                      <div className="text-xs text-gray-600 mt-1">Share exciting opportunities</div>
                    </div>
                    <div
                      className="p-4 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all text-center"
                      onClick={() => {
                        setEmailType('newsletter')
                        setEmailSubject(emailTemplates.newsletter.subject)
                        setEmailBody(emailTemplates.newsletter.body)
                      }}
                    >
                      <Mail className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="font-semibold text-sm">Newsletter</div>
                      <div className="text-xs text-gray-600 mt-1">Company updates & insights</div>
                    </div>
                    <div
                      className="p-4 border-2 rounded-lg hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all text-center"
                      onClick={() => {
                        setEmailType('greeting')
                        setEmailSubject(emailTemplates.greeting.subject)
                        setEmailBody(emailTemplates.greeting.body)
                      }}
                    >
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <div className="font-semibold text-sm">Greeting</div>
                      <div className="text-xs text-gray-600 mt-1">Holiday wishes & check-ins</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Selection for JD emails */}
              {emailType === 'jd' && !selectedJD && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Job Opening
                    </label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEmailType('')
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                      className="bg-transparent text-xs"
                    >
                      Back
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {availableJDs.map(jd => (
                      <div
                        key={jd.id}
                        className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedJD(jd.id)
                          // Generate company slug from name if not available
                          const companyName = company?.name || 'Company'
                          const companySlug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                          const applyLink = `https://${window.location.host}/jobs/${companySlug}/${jd.id}/apply`
                          
                          // Format responsibilities from job data
                          let responsibilitiesText = '• Lead technical architecture and implementation\n• Collaborate with cross-functional teams\n• Mentor junior team members'
                          if (jd.responsibilities && jd.responsibilities.length > 0) {
                            responsibilitiesText = jd.responsibilities
                              .slice(0, 5) // Limit to 5 responsibilities
                              .map(resp => `• ${resp}`)
                              .join('\n')
                          }
                          
                          // Format required skills from job data
                          let skillsText = '• [Skill 1]\n• [Skill 2]\n• [Skill 3]'
                          if (jd.required_skills && jd.required_skills.length > 0) {
                            skillsText = jd.required_skills
                              .slice(0, 5) // Limit to 5 skills
                              .map(skill => `• ${skill}`)
                              .join('\n')
                          }
                          
                          // Update email body with all job details
                          const updatedBody = emailBody
                            .replace('[Job Title]', jd.title)
                            .replace('[Location]', jd.location)
                            .replace('[Department]', jd.department)
                            .replace('[Apply Link]', applyLink)
                            .replace(/• Lead technical architecture and implementation\n• Collaborate with cross-functional teams\n• Mentor junior team members/, responsibilitiesText)
                            .replace(/• \[Skill 1\]\n• \[Skill 2\]\n• \[Skill 3\]/, skillsText)
                          setEmailBody(updatedBody)
                          setEmailSubject(`Exciting Opportunity: ${jd.title} at [Company Name]`)
                        }}
                      >
                        <div className="font-medium text-sm">{jd.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {jd.department} • {jd.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Editor */}
              {emailType && (emailType !== 'jd' || selectedJD) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Compose Email
                    </label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEmailType('')
                        setSelectedJD('')
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                      className="bg-transparent text-xs"
                    >
                      Change Template
                    </Button>
                  </div>
                  
                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email subject..."
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Email body..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: [Candidate Name], [Company Name], and [Your Name] will be automatically replaced
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowEmailDialog(false)
                        setEmailType('')
                        setSelectedJD('')
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                      className="bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          setIsSendingEmail(true)
                          
                          // Get candidates' details for personalization
                          const selectedCandidateDetails = filteredCandidates.filter(c => selectedCandidates.includes(c.email))
                          
                          // Send email to all selected candidates
                          const response = await fetch('/api/talent-pool/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              recipients: selectedCandidates,
                              subject: emailSubject,
                              emailContent: emailBody,
                              emailType: emailType,
                              companyId: company?.id // Explicitly pass company ID
                            })
                          })
                          
                          if (!response.ok) {
                            const errorData = await response.json()
                            throw new Error(errorData.error || 'Failed to send emails')
                          }
                          
                          const result = await response.json()
                          alert(`Email sent to ${result.sentTo} candidate(s)!\n\nSubject: ${emailSubject}\n\nCandidates have been marked as contacted.`)
                          setShowEmailDialog(false)
                          setEmailType('')
                          setSelectedJD('')
                          setEmailSubject('')
                          setEmailBody('')
                          setSelectedCandidates([])
                          
                          // Refresh talent pool data to show updated contact status
                          fetchTalentPool()
                        } catch (error) {
                          console.error('Error sending emails:', error)
                          alert(`Error sending emails: ${error instanceof Error ? error.message : 'Unknown error'}`)
                        } finally {
                          setIsSendingEmail(false)
                        }
                      }}
                      disabled={!emailSubject || !emailBody || isSendingEmail}
                      className="bg-transparent"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send Email
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Send JD Dialog */}
      {showJDDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <Card className="w-full max-w-2xl max-h-[88vh] overflow-y-auto tp-no-scrollbar">
            <div className="px-4 py-2.5 border-b flex items-center justify-between bg-gray-50 sticky top-0 z-10">
              <h3 className="text-sm font-semibold">Send Job Description</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowJDDialog(false)
                  setSelectedJDForSend('')
                  setJdEmailPreview(null)
                }}
                className="bg-transparent h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {/* Recipients */}
              <div>
                <p className="text-xs text-gray-600 mb-1.5">
                  Sending to {selectedCandidates.length} candidate(s)
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {filteredCandidates
                    .filter(c => selectedCandidates.includes(c.email))
                    .map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Job Selection Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Job Description
                </label>
                <select
                  className="w-full h-8 px-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedJDForSend}
                  onChange={(e) => {
                    const jobId = e.target.value
                    setSelectedJDForSend(jobId)
                    
                    if (jobId) {
                      const selectedJob = availableJDs.find(j => j.id === jobId)
                      if (selectedJob) {
                        const companyName = company?.name || 'Company'
                        const companySlug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        const applyLink = `https://${window.location.host}/jobs/${companySlug}/${selectedJob.id}/apply`
                        
                        // Format responsibilities from job data
                        let responsibilitiesText = '• No responsibilities specified'
                        if (selectedJob.responsibilities && Array.isArray(selectedJob.responsibilities) && selectedJob.responsibilities.length > 0) {
                          responsibilitiesText = selectedJob.responsibilities
                            .slice(0, 5)
                            .map(resp => `• ${resp}`)
                            .join('\n')
                        }
                        
                        // Format required skills from job data
                        let skillsText = '• No skills specified'
                        if (selectedJob.required_skills && Array.isArray(selectedJob.required_skills) && selectedJob.required_skills.length > 0) {
                          skillsText = selectedJob.required_skills
                            .slice(0, 5)
                            .map(skill => `• ${skill}`)
                            .join('\n')
                        }
                        
                        // Build email preview
                        const emailSubject = `Exciting Opportunity: ${selectedJob.title} at ${companyName}`
                        const emailBody = `Hi [Candidate Name],

I hope this email finds you well! I wanted to reach out to share an exciting opportunity that I think would be a great fit for your background and skills.

We're currently hiring for: ${selectedJob.title}
Location: ${selectedJob.location || 'Not specified'}
Department: ${selectedJob.department || 'Not specified'}

Key Responsibilities:
${responsibilitiesText}

Required Skills:
${skillsText}

This role offers competitive compensation, comprehensive benefits, and the opportunity to work on cutting-edge projects.

👉 **Apply Here:** ${applyLink}

Would you be interested in learning more? I'd love to schedule a call to discuss this opportunity in detail.

Best regards,
${user?.full_name || '[Your Name]'}
${companyName} Talent Acquisition Team`
                        
                        setJdEmailPreview({ subject: emailSubject, body: emailBody })
                      }
                    } else {
                      setJdEmailPreview(null)
                    }
                  }}
                >
                  <option value="">-- Select a Job --</option>
                  {availableJDs.map(jd => (
                    <option key={jd.id} value={jd.id}>
                      {jd.title} ({jd.department} • {jd.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Preview */}
              {jdEmailPreview && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Email Preview
                  </label>

                  {/* Subject */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Subject</label>
                    <div className="px-2 py-1.5 bg-gray-50 border rounded text-xs">
                      {jdEmailPreview.subject}
                    </div>
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Body</label>
                    <div className="px-2 py-2 bg-gray-50 border rounded text-xs whitespace-pre-wrap max-h-[220px] overflow-y-auto tp-no-scrollbar">
                      {jdEmailPreview.body}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 italic">
                    Note: [Candidate Name] and [Your Name] will be replaced with actual names when sending.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {isSendingEmail && (
                <div className="p-2 border rounded bg-blue-50 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-xs font-medium">Sending emails to {selectedCandidates.length} candidates...</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowJDDialog(false)
                    setSelectedJDForSend('')
                    setJdEmailPreview(null)
                  }}
                  className="bg-transparent h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedJDForSend || !jdEmailPreview || isSendingEmail}
                  onClick={async () => {
                    if (!jdEmailPreview || !selectedJDForSend) return
                    
                    try {
                      setIsSendingEmail(true)
                      
                      // Send email to all selected candidates
                      const response = await fetch('/api/talent-pool/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recipients: selectedCandidates,
                          subject: jdEmailPreview.subject,
                          emailContent: jdEmailPreview.body,
                          jobId: selectedJDForSend,
                          emailType: 'jd',
                          companyId: company?.id
                        })
                      })
                      
                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || 'Failed to send emails')
                      }
                      
                      const result = await response.json()
                      alert(`JD sent to ${result.sentTo} candidate(s) successfully!`)
                      setShowJDDialog(false)
                      setSelectedJDForSend('')
                      setJdEmailPreview(null)
                      setSelectedCandidates([])
                      
                      // Refresh talent pool data
                      fetchTalentPool()
                    } catch (error) {
                      console.error('Error sending JD emails:', error)
                      alert(`Error sending emails: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    } finally {
                      setIsSendingEmail(false)
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send Email
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Candidate Dialog */}
      <Dialog open={showAddCandidateDialog} onOpenChange={setShowAddCandidateDialog}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[88vh] overflow-y-auto p-4 sm:p-5 tp-no-scrollbar">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base font-semibold">Add Candidate to Talent Pool</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Import Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-xs text-blue-900">Import from Excel</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">Upload an Excel file with candidate data in the required format</p>
                  <div className="mt-2 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.xlsx,.xls,.csv'
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0]
                          if (!file) return
                          
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            // Add company ID to form data
                            if (company?.id) {
                              formData.append('companyId', company.id)
                            }
                            
                            const response = await fetch('/api/talent-pool/import', {
                              method: 'POST',
                              body: formData
                            })
                            
                            const result = await response.json()
                            
                            if (!response.ok) {
                              throw new Error(result.error || 'Failed to import')
                            }
                            
                            alert(`✅ Import Complete!\n\nImported: ${result.imported} candidate(s)\nErrors: ${result.errors}\n\n${result.errorDetails?.length > 0 ? 'Error Details:\n' + result.errorDetails.join('\n') : ''}`)
                            
                            // Refresh talent pool data
                            fetchTalentPool()
                            setShowAddCandidateDialog(false)
                          } catch (error) {
                            console.error('Import error:', error)
                            alert(`❌ Import Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                          }
                        }
                        input.click()
                      }}
                      className="bg-transparent h-7 text-[11px]"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Excel File
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { window.location.href = '/api/talent-pool/template' }}
                      className="bg-transparent h-7 text-[11px]"
                    >
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold text-xs mb-2">Or Enter Candidate Details Manually</h4>

              {/* Basic Information */}
              <div className="space-y-2.5 [&_label]:text-[11px] [&_label]:font-medium [&_input]:h-8 [&_input]:text-xs [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="candidate-name">Full Name *</Label>
                    <Input 
                      id="candidate-name"
                      placeholder="e.g., John Doe"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="candidate-position">Position/Role *</Label>
                    <Input 
                      id="candidate-position"
                      placeholder="e.g., Senior Developer"
                      value={newCandidate.position}
                      onChange={(e) => setNewCandidate({...newCandidate, position: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="candidate-email">Email Address *</Label>
                    <Input 
                      id="candidate-email"
                      type="email"
                      placeholder="candidate@email.com"
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate({...newCandidate, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="candidate-phone">Phone Number</Label>
                    <Input 
                      id="candidate-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={newCandidate.phone}
                      onChange={(e) => setNewCandidate({...newCandidate, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="candidate-experience">Years of Experience</Label>
                    <Input 
                      id="candidate-experience"
                      type="number"
                      placeholder="e.g., 5"
                      value={newCandidate.experience}
                      onChange={(e) => setNewCandidate({...newCandidate, experience: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="candidate-location">Location</Label>
                    <Input 
                      id="candidate-location"
                      placeholder="e.g., San Francisco, CA"
                      value={newCandidate.location}
                      onChange={(e) => setNewCandidate({...newCandidate, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="candidate-company">Current Company</Label>
                    <Input 
                      id="candidate-company"
                      placeholder="e.g., Tech Corp"
                      value={newCandidate.currentCompany}
                      onChange={(e) => setNewCandidate({...newCandidate, currentCompany: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="candidate-linkedin">LinkedIn Profile</Label>
                    <Input 
                      id="candidate-linkedin"
                      placeholder="https://linkedin.com/in/..."
                      value={newCandidate.linkedIn}
                      onChange={(e) => setNewCandidate({...newCandidate, linkedIn: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="candidate-skills">Skills (comma-separated)</Label>
                  <Input 
                    id="candidate-skills"
                    placeholder="e.g., React, Node.js, TypeScript, Python"
                    value={newCandidate.skills}
                    onChange={(e) => setNewCandidate({...newCandidate, skills: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="candidate-source">Source</Label>
                    <Select 
                      value={newCandidate.source} 
                      onValueChange={(value) => setNewCandidate({...newCandidate, source: value})}
                    >
                      <SelectTrigger id="candidate-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Past Application">Past Application</SelectItem>
                        <SelectItem value="Job Board">Job Board</SelectItem>
                        <SelectItem value="Event/Conference">Event/Conference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="candidate-status">Interest Status</Label>
                    <Select 
                      value={newCandidate.status} 
                      onValueChange={(value) => setNewCandidate({...newCandidate, status: value})}
                    >
                      <SelectTrigger id="candidate-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active Interest">Active Interest</SelectItem>
                        <SelectItem value="Passive">Passive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="candidate-notes">Additional Notes</Label>
                  <Textarea
                    id="candidate-notes"
                    placeholder="Any additional information about the candidate..."
                    rows={2}
                    className="text-xs min-h-0"
                    value={newCandidate.notes}
                    onChange={(e) => setNewCandidate({...newCandidate, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t">
              <Button
                size="sm"
                onClick={async () => {
                  if (!newCandidate.name || !newCandidate.position || !newCandidate.email) {
                    alert('Please fill in required fields: Name, Position, and Email')
                    return
                  }
                  
                  try {
                    setLoading(true)
                    const response = await fetch('/api/talent-pool', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newCandidate.name,
                        position: newCandidate.position,
                        email: newCandidate.email,
                        phone: newCandidate.phone,
                        source: newCandidate.source,
                        status: newCandidate.status,
                        skills: newCandidate.skills,
                        experience: newCandidate.experience,
                        location: newCandidate.location,
                        currentCompany: newCandidate.currentCompany,
                        linkedIn: newCandidate.linkedIn,
                        notes: newCandidate.notes,
                        companyId: company?.id,
                      }),
                    })

                    const data = await response.json()

                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to add candidate')
                    }

                    alert(`Successfully added ${newCandidate.name} to talent pool!`)
                    setShowAddCandidateDialog(false)
                    setNewCandidate({
                      name: '',
                      position: '',
                      email: '',
                      phone: '',
                      source: 'Manual Entry',
                      status: 'Passive',
                      skills: '',
                      experience: '',
                      location: '',
                      currentCompany: '',
                      linkedIn: '',
                      notes: ''
                    })
                    
                    // Refresh the talent pool data
                    await fetchTalentPool()
                  } catch (error: any) {
                    console.error('Error adding candidate:', error)
                    alert(error.message || 'Failed to add candidate to talent pool')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="flex-1 h-8 text-xs"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add to Talent Pool'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddCandidateDialog(false)
                  setNewCandidate({
                    name: '',
                    position: '',
                    email: '',
                    phone: '',
                    source: 'Manual Entry',
                    status: 'Passive',
                    skills: '',
                    experience: '',
                    location: '',
                    currentCompany: '',
                    linkedIn: '',
                    notes: ''
                  })
                }}
                className="flex-1 bg-transparent h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog open={showCandidateDetailsDialog} onOpenChange={setShowCandidateDetailsDialog}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[88vh] overflow-y-auto p-4 sm:p-5 tp-no-scrollbar">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base font-semibold">Candidate Profile</DialogTitle>
          </DialogHeader>

          {selectedCandidateDetails && (
            <div className="space-y-3 pt-2">
              {/* Header with Avatar */}
              <div className="flex items-start gap-3 pb-3 border-b">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {selectedCandidateDetails.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{selectedCandidateDetails.name}</h3>
                    <Badge className={`text-[10px] px-1.5 py-0 h-auto ${selectedCandidateDetails.status === 'Active Interest' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {selectedCandidateDetails.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{selectedCandidateDetails.position}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1 truncate max-w-[200px]"><Mail className="h-3 w-3" />{selectedCandidateDetails.email}</span>
                    {selectedCandidateDetails.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCandidateDetails.phone}</span>}
                  </div>
                </div>
              </div>

              {/* Source Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="font-semibold text-xs text-blue-900 mb-1.5 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  How They Joined Our Talent Pool
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Source:</span>
                    <span className="text-gray-900">{selectedCandidateDetails.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Date Added:</span>
                    <span className="text-gray-900">{selectedCandidateDetails.addedDate}</span>
                  </div>

                  {selectedCandidateDetails.source === 'Past Application' && (
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <h5 className="font-semibold text-blue-900 mb-1.5 text-[11px]">Previous Application Details</h5>
                      <div className="space-y-1">
                        {selectedCandidateDetails.cvScore && (
                          <div className="flex justify-between"><span className="text-gray-700 font-medium">CV Score:</span><span className="font-semibold text-blue-700">{selectedCandidateDetails.cvScore}</span></div>
                        )}
                        {selectedCandidateDetails.interviewScore && (
                          <div className="flex justify-between"><span className="text-gray-700 font-medium">Interview Score:</span><span className="font-semibold text-purple-700">{selectedCandidateDetails.interviewScore}</span></div>
                        )}
                        {selectedCandidateDetails.rejectionStage && (
                          <div className="flex justify-between items-center"><span className="text-gray-700 font-medium">Last Stage:</span><Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 h-auto">{selectedCandidateDetails.rejectionStage}</Badge></div>
                        )}
                        {selectedCandidateDetails.rejectionReason && (
                          <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded">
                            <span className="text-[10px] font-semibold text-amber-900">Reason for Moving to Talent Pool:</span>
                            <p className="text-[11px] text-gray-700 mt-0.5">{selectedCandidateDetails.rejectionReason}</p>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alert('Opening detailed CV and Interview Report...')}
                          className="w-full bg-transparent h-7 text-[11px] mt-1.5"
                        >
                          <Briefcase className="h-3 w-3 mr-1" />
                          View CV & Interview Report
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedCandidateDetails.history && selectedCandidateDetails.history[0] && !selectedCandidateDetails.source.includes('Past Application') && (
                    <div className="mt-1.5 pt-1.5 border-t border-blue-300">
                      <p className="text-gray-700 text-[11px]">{selectedCandidateDetails.history[0].description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="font-semibold text-xs text-gray-900 mb-1.5">Skills & Expertise</h4>
                {selectedCandidateDetails.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidateDetails.skills.map((skill: string, i: number) => (
                      <Badge key={i} className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0 h-auto">{skill}</Badge>
                    ))}
                  </div>
                ) : <span className="text-[11px] text-gray-400">—</span>}
              </div>

              {/* Activity History */}
              {selectedCandidateDetails.history && selectedCandidateDetails.history.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Activity Timeline
                  </h4>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto tp-no-scrollbar pr-1">
                    {selectedCandidateDetails.history.map((item: any, index: number) => (
                      <div key={index} className="relative pl-3 border-l-2 border-gray-200">
                        <div className="bg-gray-50 rounded-md p-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-[11px] text-gray-900">{item.event}</span>
                            <span className="text-[10px] text-gray-500 shrink-0">{item.date}</span>
                          </div>
                          <p className="text-[11px] text-gray-700 mt-0.5">{item.description}</p>
                          {item.source && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 rounded">{item.source}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Contact + Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <div>
                  <p className="text-[10px] text-gray-500">Last Contact</p>
                  <p className="text-xs text-gray-700">{selectedCandidateDetails.lastContact}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCandidateDetailsDialog(false)}
                    className="h-7 text-[11px] px-3"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowCandidateDetailsDialog(false)
                      setSelectedCandidates([selectedCandidateDetails.email])
                      setShowJDDialog(true)
                    }}
                    className="h-7 text-[11px] px-3"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Send Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .tp-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .tp-no-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }
      `}</style>
    </div>
  )
}

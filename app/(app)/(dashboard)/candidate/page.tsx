'use client'

import { Textarea } from "@/components/ui/textarea"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Filter, Calendar, UserCheck, FileText, CheckCircle, XCircle, Database, Download, FileTextIcon, Search } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { CandidateActionDialog } from '@/components/dashboard/candidate-action-dialogs'
import { useMobileMenu } from '@/components/dashboard/mobile-menu-context'
import { useAuth } from '@/contexts/auth-context'

type BucketType = 'all' | 'screening' | 'interview' | 'hiringManager' | 'offer' | 'hired' | 'rejected'

const defaultBucketData = {
  screening: { count: 0, icon: Filter, color: 'amber', label: 'CV Screening', description: 'Under review' },
  interview: { count: 0, icon: Calendar, color: 'orange', label: 'AI Interview', description: 'Scheduled' },
  hiringManager: { count: 0, icon: UserCheck, color: 'pink', label: 'Hiring Manager', description: 'Awaiting feedback' },
  offer: { count: 0, icon: FileText, color: 'green', label: 'Offer Stage', description: 'Negotiation' },
  hired: { count: 0, icon: CheckCircle, color: 'emerald', label: 'Hired', description: 'Completed' },
  rejected: { count: 0, icon: XCircle, color: 'red', label: 'Rejected', description: 'Not proceeding' },
  all: { count: 0, icon: Database, color: 'slate', label: 'Total Applicants', description: 'All statuses' }
}

const defaultApplicationsData: Record<string, any[]> = {
  all: [],
  screening: [],
  interview: [],
  hiringManager: [],
  offer: [],
  hired: [],
  rejected: []
}

const defaultBucketStats: Record<string, any> = {
  all: { inPipeline: 0, hired: 0, rejected: 0 },
  screening: { totalScreened: 0, qualified: 0, unqualified: 0, successRate: 0 },
  interview: { totalInterviewed: 0, qualified: 0, unqualified: 0, successRate: 0 },
  hiringManager: { totalSentToHM: 0, approved: 0, rejected: 0, successRate: 0 },
  offer: { totalOfferSent: 0, accepted: 0, declined: 0, successRate: 0 },
  hired: { totalHires: 0, onboarded: 0, awaitingOnboard: 0, successRate: 0 },
  rejected: { totalRejected: 0, fromScreening: 0, fromInterview: 0, fromOther: 0 }
}

type UserRole = 'recruiter' | 'admin' | 'manager' | 'director'

const recruiters = [
  { id: '1', name: 'Sarah Johnson' },
  { id: '2', name: 'Mike Davis' },
  { id: '3', name: 'Emily Chen' },
  { id: '4', name: 'John Williams' },
]

export default function CandidatesPage() {
  const { company } = useAuth()
  const [activeBucket, setActiveBucket] = useState<BucketType>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [candidateDetailsOpen, setCandidateDetailsOpen] = useState(false)
  const [jdDetailsOpen, setJdDetailsOpen] = useState(false)
  const [editableCandidate, setEditableCandidate] = useState<any>(null)
  const { setIsCollapsed } = useMobileMenu()
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [viewAsRole, setViewAsRole] = useState<UserRole>('recruiter')
  const [viewAsRecruiter, setViewAsRecruiter] = useState('1')

  // Data state from API
  const [bucketData, setBucketData] = useState(defaultBucketData)
  const [applicationsData, setApplicationsData] = useState<Record<string, any[]>>(defaultApplicationsData)
  const [bucketStats, setBucketStats] = useState<Record<string, any>>(defaultBucketStats)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data from API
  const fetchCandidates = useCallback(async () => {
    if (!company?.id) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/candidates?companyId=${company.id}`)
      const data = await res.json()
      if (data.ok) {
        // Update bucket counts while preserving icons/colors/labels
        setBucketData(prev => ({
          screening: { ...prev.screening, count: data.bucketData?.screening?.count || 0 },
          interview: { ...prev.interview, count: data.bucketData?.interview?.count || 0 },
          hiringManager: { ...prev.hiringManager, count: data.bucketData?.hiringManager?.count || 0 },
          offer: { ...prev.offer, count: data.bucketData?.offer?.count || 0 },
          hired: { ...prev.hired, count: data.bucketData?.hired?.count || 0 },
          rejected: { ...prev.rejected, count: data.bucketData?.rejected?.count || 0 },
          all: { ...prev.all, count: data.bucketData?.all?.count || 0 }
        }))
        setApplicationsData(data.applicationsData || defaultApplicationsData)
        setBucketStats(data.bucketStats || defaultBucketStats)
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [company?.id])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])
  
  // Permission check - only recruiters can modify
  const canModify = viewAsRole === 'recruiter'

  // Function to apply filters to data
  const applyFilters = (data: any[]) => {
    return data.filter((application: any) => {
      // Position filter
      if (positionFilter !== 'all' && application.position !== positionFilter) {
        return false
      }
      
      // Source filter
      if (sourceFilter !== 'all' && application.source !== sourceFilter) {
        return false
      }
      
      // Skill filter
      if (skillFilter && application.skills && !application.skills.toLowerCase().includes(skillFilter.toLowerCase())) {
        return false
      }
      
      // Search query filter (name)
      if (searchQuery && !application.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      return true
    })
  }

  // Calculate filtered counts for each bucket
  const getFilteredCount = (bucketKey: BucketType) => {
    const data = applicationsData[bucketKey] || []
    return applyFilters(data).length
  }

  // Get dynamic bucket counts based on filters
  const dynamicBucketCounts = {
    screening: getFilteredCount('screening'),
    interview: getFilteredCount('interview'),
    hiringManager: getFilteredCount('hiringManager'),
    offer: getFilteredCount('offer'),
    hired: getFilteredCount('hired'),
    rejected: getFilteredCount('rejected'),
    all: getFilteredCount('all'),
  }

  // Extract unique values for filters
  const allApplications = Object.values(applicationsData).flat()
  const positions = [...new Set(allApplications.map((app: any) => app.position).filter(Boolean))]
  const sources = [...new Set(allApplications.map((app: any) => app.source).filter(Boolean))]

  const handleBucketClick = (bucket: BucketType) => {
    setActiveBucket(bucket)
    setIsCollapsed(true) // Auto-collapse sidebar when bucket is clicked
  }

  const handleViewCandidate = (candidate: any) => {
    setSelectedCandidate(candidate)
    setDialogOpen(true)
  }

  const renderTableHeaders = () => {
    switch (activeBucket) {
      case 'screening':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Applied Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Source</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Screening Score</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Screening Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
      case 'interview':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">CV Score</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Interview Score</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Interview Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Interview Result</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Comments</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
      case 'hiringManager':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Hiring Manager</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Days with HM</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">HM Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Comments</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
      case 'offer':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Offer Amount</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Offer Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Comments</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
      case 'hired':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Hire Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Start Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Hire Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Comments</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
      case 'rejected':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Rejection Stage</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Rejection Reason</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
      default:
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Applied Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Source</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50">Actions</th>
          </>
        )
    }
  }

  const renderTableRows = () => {
    const data = applicationsData[activeBucket] || []
    const filteredData = applyFilters(data)
    
    return filteredData.map((application: any, index: number) => (
      <tr key={index} className="hover:bg-gray-50 transition-colors border-b">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {application?.name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <button 
              onClick={() => {
                setEditableCandidate({...application})
                setCandidateDetailsOpen(true)
              }}
              className="font-medium text-blue-600 hover:text-blue-800 text-sm underline decoration-dotted cursor-pointer transition-colors"
            >
              {application?.name}
            </button>
          </div>
        </td>
        <td className="px-6 py-4">
          <button 
            onClick={() => {
              setSelectedCandidate(application)
              setJdDetailsOpen(true)
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline decoration-dotted cursor-pointer transition-colors"
          >
            {application?.position}
          </button>
        </td>
        
        {activeBucket === 'screening' && (
          <>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.appliedDate}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.source}</td>
            <td className="px-6 py-4">
              <Badge className="bg-blue-100 text-blue-800 font-semibold">
                {application?.screeningScore}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <Badge className={application?.screeningStatus === 'Qualified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {application?.screeningStatus}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleViewCandidate(application)}>
                  Action
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  title="CV Report"
                  onClick={() => {
                    window.open(`/report/${application?.jobId}/${application?.candidateId}`, '_blank')
                  }}
                >
                  <FileTextIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" title="Download CV & Report">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </>
        )}
        
        {activeBucket === 'interview' && (
          <>
            <td className="px-6 py-4">
              <Badge className="bg-blue-100 text-blue-800 font-semibold">
                {application?.cvScore}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <Badge className={application?.interviewScore !== 'N/A' ? 'bg-purple-100 text-purple-800 font-semibold' : 'bg-gray-100 text-gray-800'}>
                {application?.interviewScore}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <Badge className={
                application?.interviewStatus === 'Completed' ? 'bg-green-100 text-green-800' : 
                application?.interviewStatus === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 
                'bg-gray-100 text-gray-800'
              }>
                {application?.interviewStatus}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <Badge className={
                application?.interviewResult === 'Qualified' ? 'bg-green-100 text-green-800' : 
                application?.interviewResult === 'Pending' ? 'bg-amber-100 text-amber-800' : 
                'bg-gray-100 text-gray-800'
              }>
                {application?.interviewResult}
              </Badge>
            </td>
            <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
              {application?.comments}
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleViewCandidate(application)}>
                  Action
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  title="Interview Report"
                  onClick={() => {
                    window.open(`/report/${application?.jobId}/${application?.candidateId}`, '_blank')
                  }}
                >
                  <FileTextIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" title="Download Reports & CV">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </>
        )}
        
        {activeBucket === 'hiringManager' && (
          <>
            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{application?.hiringManager}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.daysWithHM}</td>
            <td className="px-6 py-4">
              <Badge className={application?.hmStatus === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                {application?.hmStatus}
              </Badge>
            </td>
            <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">{application?.comments}</td>
            <td className="px-6 py-4">
              <Button size="sm" onClick={() => handleViewCandidate(application)}>
                Action
              </Button>
            </td>
          </>
        )}
        
        {activeBucket === 'offer' && (
          <>
            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{application?.offerAmount}</td>
            <td className="px-6 py-4">
              <Badge className="bg-amber-100 text-amber-800">{application?.offerStatus}</Badge>
            </td>
            <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">{application?.comments}</td>
            <td className="px-6 py-4">
              <Button size="sm" onClick={() => handleViewCandidate(application)}>
                Action
              </Button>
            </td>
          </>
        )}
        
        {activeBucket === 'hired' && (
          <>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.hireDate}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.startDate}</td>
            <td className="px-6 py-4">
              <Badge className={application?.hireStatus === 'Onboarded' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {application?.hireStatus}
              </Badge>
            </td>
            <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">{application?.comments}</td>
            <td className="px-6 py-4">
              <Button size="sm" onClick={() => handleViewCandidate(application)}>
                Action
              </Button>
            </td>
          </>
        )}
        
        {activeBucket === 'rejected' && (
          <>
            <td className="px-6 py-4">
              <Badge className="bg-red-100 text-red-800">{application?.rejectionStage}</Badge>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.rejectionReason}</td>
            <td className="px-6 py-4">
              <Button size="sm" onClick={() => handleViewCandidate(application)}>
                Action
              </Button>
            </td>
          </>
        )}
        
        {activeBucket === 'all' && (
          <>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.appliedDate}</td>
            <td className="px-6 py-4">
              <Badge className="bg-blue-100 text-blue-800">{application?.status}</Badge>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.source}</td>
            <td className="px-6 py-4">
              <Button size="sm" variant="outline" onClick={() => handleViewCandidate(application)}>
                View
              </Button>
            </td>
          </>
        )}
      </tr>
    ))
  }

  return (
    <div className="space-y-3 p-4">
      {/* Header with Filters */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Applications</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage candidate applications across all stages</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* View As Filter */}
            <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-blue-50">
              <span className="text-xs font-medium text-gray-700">View as:</span>
              <select
                value={viewAsRole}
                onChange={(e) => setViewAsRole(e.target.value as UserRole)}
                className="text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="recruiter">Recruiter</option>
                <option value="admin">Admin</option>
                <option value="manager">TA Manager</option>
                <option value="director">Director</option>
              </select>
              {viewAsRole === 'recruiter' && (
                <>
                  <span className="text-xs text-gray-400">|</span>
                  <select
                    value={viewAsRecruiter}
                    onChange={(e) => setViewAsRecruiter(e.target.value)}
                    className="text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {recruiters.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {!canModify && (
              <Badge variant="secondary" className="text-xs">View Only</Badge>
            )}
            <Button variant="outline" size="sm" className="gap-1 bg-transparent">
              <Download className="h-3 w-3" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {/* Filters - Slim Design */}
      <div className="bg-white rounded-lg border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search applications..."
              className="w-full pl-3 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Sources</option>
            {sources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Skills"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[100px]"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setPositionFilter('all')
              setSourceFilter('all')
              setSkillFilter('')
              setDateFilter('')
              console.log('[v0] Filters reset')
            }}
            className="bg-transparent"
            title="Reset all filters"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Application Buckets - Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {(Object.keys(bucketData) as BucketType[]).map((bucket) => {
          const data = bucketData[bucket]
          const Icon = data.icon
          const stats = bucketStats[bucket as keyof typeof bucketStats] || null
          
          return (
            <Card
              key={bucket}
              className={`p-3 md:p-4 cursor-pointer transition-all hover:shadow-lg ${
                activeBucket === bucket ? 'ring-2 ring-blue-600 shadow-lg bg-blue-50' : 'shadow hover:bg-gray-50'
              }`}
              onClick={() => {
                handleBucketClick(bucket)
                setIsCollapsed(true)
              }}
            >
              <div className="space-y-2 md:space-y-3">
                {/* Header with Count */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xs md:text-sm font-bold text-gray-900 leading-tight">
                      {data.label}
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 md:mt-1 flex items-center gap-1">
                      <Icon className="h-2.5 md:h-3 w-2.5 md:w-3" />
                      <span className="hidden sm:inline">{data.description}</span>
                    </p>
                  </div>
                  <div className="text-xl md:text-3xl font-bold text-blue-600">
                    {dynamicBucketCounts[bucket as BucketType]}
                  </div>
                </div>
                
                {/* Stats - Always Visible with Success Rate */}
                {stats && (
                  <div className="pt-2 md:pt-3 border-t border-gray-200 space-y-1 md:space-y-2">
                    {Object.entries(stats).map(([key, value]) => {
                      const displayKey = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())
                        .trim()
                      
                      // Color code success rate
                      const isSuccessRate = key === 'successRate'
                      let valueColor = 'text-gray-900'
                      if (isSuccessRate && typeof value === 'number') {
                        if (value >= 75) valueColor = 'text-green-600'
                        else if (value >= 50) valueColor = 'text-amber-600'
                        else valueColor = 'text-red-600'
                      }
                      
                      return (
                        <div key={key} className="flex justify-between items-center gap-1">
                          <span className="text-[9px] md:text-[10px] text-gray-600 leading-tight truncate">
                            {displayKey}
                          </span>
                          <span className={`text-[10px] md:text-xs font-bold ${valueColor} whitespace-nowrap`}>
                            {isSuccessRate ? `${value}%` : String(value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Applications Table - Mobile Responsive */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <div className="min-w-[800px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr>{renderTableHeaders()}</tr>
              </thead>
              <tbody>{renderTableRows()}</tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Candidate Action Dialog */}
      <CandidateActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidate={selectedCandidate}
        bucketType={activeBucket}
        onMoved={fetchCandidates}
        canModify={canModify}
      />

      {/* Candidate Details Dialog */}
      <Dialog open={candidateDetailsOpen} onOpenChange={setCandidateDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Candidate Details</DialogTitle>
          </DialogHeader>
          {editableCandidate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input 
                    id="edit-name"
                    value={editableCandidate.name || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input 
                    id="edit-email"
                    type="email"
                    value={editableCandidate.email || 'candidate@email.com'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input 
                    id="edit-phone"
                    type="tel"
                    value={editableCandidate.phone || '+1 (555) 123-4567'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input 
                    id="edit-location"
                    value={editableCandidate.location || 'San Francisco, CA'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-position">Position Applied</Label>
                  <Input 
                    id="edit-position"
                    value={editableCandidate.position || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, position: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-experience">Years of Experience</Label>
                  <Input 
                    id="edit-experience"
                    type="number"
                    value={editableCandidate.experience || '5'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, experience: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-current-company">Current Company</Label>
                  <Input 
                    id="edit-current-company"
                    value={editableCandidate.currentCompany || 'Tech Corp'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, currentCompany: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-current-role">Current Role</Label>
                  <Input 
                    id="edit-current-role"
                    value={editableCandidate.currentRole || 'Senior Developer'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, currentRole: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-salary">Expected Salary</Label>
                  <Input 
                    id="edit-salary"
                    value={editableCandidate.expectedSalary || '$120,000'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, expectedSalary: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notice">Notice Period (days)</Label>
                  <Input 
                    id="edit-notice"
                    type="number"
                    value={editableCandidate.noticePeriod || '30'} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, noticePeriod: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-skills">Skills (comma-separated)</Label>
                <Input 
                  id="edit-skills"
                  value={editableCandidate.skills || 'React, Node.js, TypeScript, Python'} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, skills: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-education">Education</Label>
                <Input 
                  id="edit-education"
                  value={editableCandidate.education || 'BS in Computer Science - Stanford University'} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, education: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-linkedin">LinkedIn Profile</Label>
                <Input 
                  id="edit-linkedin"
                  value={editableCandidate.linkedin || 'https://linkedin.com/in/candidate'} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, linkedin: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <Textarea 
                  id="edit-notes"
                  value={editableCandidate.notes || 'Strong technical background with excellent communication skills.'} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, notes: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => {
                  console.log('[v0] Saving candidate details:', editableCandidate)
                  setCandidateDetailsOpen(false)
                }} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setCandidateDetailsOpen(false)} className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Job Description Dialog */}
      <Dialog open={jdDetailsOpen} onOpenChange={setJdDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Job Description</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedCandidate.position}</h3>
                <p className="text-gray-600 mt-1">Full-time • Remote/Hybrid • Posted: Jan 1, 2024</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">About the Role</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  We are seeking a talented {selectedCandidate.position} to join our growing team. This role offers an 
                  exciting opportunity to work on cutting-edge projects and make a significant impact on our products 
                  and services. You will collaborate with cross-functional teams to deliver high-quality solutions.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Key Responsibilities</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Design, develop, and maintain scalable applications and systems</li>
                  <li>Collaborate with product managers and designers to define requirements</li>
                  <li>Write clean, maintainable, and well-documented code</li>
                  <li>Participate in code reviews and contribute to technical discussions</li>
                  <li>Mentor junior team members and share best practices</li>
                  <li>Stay up-to-date with industry trends and emerging technologies</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Required Qualifications</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Bachelor's degree in Computer Science or related field</li>
                  <li>5+ years of professional experience in software development</li>
                  <li>Strong proficiency in modern programming languages and frameworks</li>
                  <li>Experience with cloud platforms (AWS, Azure, or GCP)</li>
                  <li>Excellent problem-solving and analytical skills</li>
                  <li>Strong communication and teamwork abilities</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Preferred Qualifications</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Master's degree in Computer Science or related field</li>
                  <li>Experience with microservices architecture</li>
                  <li>Knowledge of CI/CD pipelines and DevOps practices</li>
                  <li>Contributions to open-source projects</li>
                  <li>Experience leading technical projects</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">What We Offer</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Competitive salary and equity package</li>
                  <li>Comprehensive health, dental, and vision insurance</li>
                  <li>401(k) with company match</li>
                  <li>Flexible work arrangements (remote/hybrid options)</li>
                  <li>Professional development budget ($2,000/year)</li>
                  <li>Generous PTO and paid holidays</li>
                  <li>Modern tech stack and latest equipment</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Technical Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'GraphQL'].map(tech => (
                    <Badge key={tech} className="bg-blue-100 text-blue-800">{tech}</Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={() => setJdDetailsOpen(false)} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

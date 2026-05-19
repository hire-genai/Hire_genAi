'use client'

export const dynamic = 'force-dynamic';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Filter, Calendar, UserCheck, FileText, CheckCircle, XCircle, Database, Download, FileTextIcon, Search, ChevronLeft, ArrowRight } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { CandidateActionDialog } from '@/components/dashboard/candidate-action-dialogs'
import { useMobileMenu } from '@/components/dashboard/mobile-menu-context'
import { useAuth } from '@/contexts/auth-context'
import { StatCardGridLoader, TableLoader, ErrorState } from '@/components/ui/skeleton-loader'

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

type UserRole = 'recruiter' | 'manager' | 'director'

export default function CandidatesPage() {
  const { company, user } = useAuth()
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
  
  // Date filter state
  const [selectedDateFilter, setSelectedDateFilter] = useState('last90Days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [viewAsRole, setViewAsRole] = useState<UserRole | ''>('')
  const [viewAsRecruiter, setViewAsRecruiter] = useState('')
  const [recruiters, setRecruiters] = useState<{id: string, name: string}[]>([])

  // Data state from API
  const [bucketData, setBucketData] = useState(defaultBucketData)
  const [applicationsData, setApplicationsData] = useState<Record<string, any[]>>(defaultApplicationsData)
  const [bucketStats, setBucketStats] = useState<Record<string, any>>(defaultBucketStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range based on filter
  const getDateRange = useCallback((overrideStart?: string, overrideEnd?: string) => {
    // If override dates are provided, use them directly
    if (overrideStart && overrideEnd) {
      return {
        startDate: overrideStart,
        endDate: overrideEnd
      }
    }

    const today = new Date()
    let startDate: Date
    let endDate: Date

    switch (selectedDateFilter) {
      case 'weekToDate':
        const dayOfWeek = today.getDay()
        startDate = new Date(today)
        startDate.setDate(today.getDate() - dayOfWeek)
        endDate = new Date(today)
        break
      case 'monthToDate':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today)
        break
      case 'last7Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 7)
        endDate = new Date(today)
        break
      case 'last14Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 14)
        endDate = new Date(today)
        break
      case 'last30Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 30)
        endDate = new Date(today)
        break
      case 'last90Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 90)
        endDate = new Date(today)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
        } else {
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 90)
          endDate = new Date(today)
        }
        break
      default:
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 90)
        endDate = new Date(today)
    }

    // Use local date format
    const startYear = startDate.getFullYear()
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
    const startDay = String(startDate.getDate()).padStart(2, '0')
    const endYear = endDate.getFullYear()
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const endDay = String(endDate.getDate()).padStart(2, '0')

    return {
      startDate: `${startYear}-${startMonth}-${startDay}`,
      endDate: `${endYear}-${endMonth}-${endDay}`
    }
  }, [selectedDateFilter, customStartDate, customEndDate])

  // Fetch data from API
  const fetchCandidates = useCallback(async (overrideStart?: string, overrideEnd?: string) => {
    if (!company?.id) return
    try {
      setIsLoading(true)
      setError(null)
      
      // Get date range for API call (with override support)
      const dateRange = getDateRange(overrideStart, overrideEnd)

      // Pick userId filter based on "View As" selection:
      //   - recruiter: filter by the chosen recruiter (ownership + delegation)
      //   - manager/director: no user filter, show all company data
      const effectiveUserId = viewAsRole === 'recruiter' ? viewAsRecruiter : ''

      console.log('DEBUG - Candidate Date Filter:', {
        overrideStart,
        overrideEnd,
        dateRange,
        selectedDateFilter,
        viewAsRole,
        effectiveUserId
      })

      const apiUrl = `/api/candidates?companyId=${company.id}${effectiveUserId ? `&userId=${effectiveUserId}` : ''}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      console.log('DEBUG - Candidates API URL:', apiUrl)
      
      const res = await fetch(apiUrl)
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
      } else {
        setError(data.error || 'Failed to load candidates')
      }
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err)
      setError(err.message || 'Failed to load candidates')
    } finally {
      setIsLoading(false)
    }
  }, [company?.id, getDateRange, viewAsRole, viewAsRecruiter])

  // Initialize viewAsRole from logged-in user's role
  useEffect(() => {
    if (user?.role) {
      setViewAsRole(user.role as UserRole)
    }
  }, [user?.role])

  // Fetch company users for the recruiter dropdown
  useEffect(() => {
    if (!company?.id) return
    fetch(`/api/settings/users?companyId=${company.id}`)
      .then(res => res.json())
      .then(data => {
        const users = data.users || []
        setRecruiters(users)
        // Default to current logged-in user if found, else first user
        const currentUser = users.find((u: any) => u.id === user?.id)
        if (currentUser) setViewAsRecruiter(currentUser.id)
        else if (users.length > 0) setViewAsRecruiter(users[0].id)
      })
      .catch(() => {})
  }, [company?.id, user?.id])
  
  // Refetch when company, view-as role, or selected recruiter changes.
  // Wait until role is initialized, and (if recruiter view) until a recruiter is chosen,
  // so we don't fire a fetch with an empty userId and then immediately fire another.
  useEffect(() => {
    if (!company?.id) return
    if (!viewAsRole) return
    if (viewAsRole === 'recruiter' && !viewAsRecruiter) return
    fetchCandidates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, viewAsRole, viewAsRecruiter])
  
  // Permission check - only recruiters can modify
  const canModify = viewAsRole === 'recruiter'

  // Calendar functions
  const handlePresetDateFilter = (preset: string) => {
    const today = new Date()
    let startDate: Date
    let endDate = new Date(today)

    switch (preset) {
      case 'weekToDate':
        const dayOfWeek = today.getDay()
        startDate = new Date(today)
        startDate.setDate(today.getDate() - dayOfWeek)
        break
      case 'monthToDate':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'last7Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 7)
        break
      case 'last14Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 14)
        break
      case 'last30Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 30)
        break
      case 'last90Days':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 90)
        break
      default:
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 90)
    }

    // Use local date format
    const startYear = startDate.getFullYear()
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
    const startDay = String(startDate.getDate()).padStart(2, '0')
    const endYear = endDate.getFullYear()
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const endDay = String(endDate.getDate()).padStart(2, '0')
    
    const startDateStr = `${startYear}-${startMonth}-${startDay}`
    const endDateStr = `${endYear}-${endMonth}-${endDay}`
    
    setCustomStartDate(startDateStr)
    setCustomEndDate(endDateStr)
    setSelectedDateFilter(preset)
    setShowDatePicker(false)
    
    // Auto-fetch for preset filters
    fetchCandidates(startDateStr, endDateStr)
  }

  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, monthIndex, i))
    }
    
    return days
  }

  const isDateInFuture = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate > today
  }

  const handleDateClick = (date: Date) => {
    // Prevent selection of future dates
    if (isDateInFuture(date)) {
      return
    }
    
    // Use local date format to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    if (!customStartDate || (customStartDate && customEndDate)) {
      // Start new selection
      setCustomStartDate(dateStr)
      setCustomEndDate('')
      setSelectedDateFilter('custom')
    } else {
      // Complete selection
      if (date < new Date(customStartDate)) {
        setCustomEndDate(customStartDate)
        setCustomStartDate(dateStr)
      } else {
        setCustomEndDate(dateStr)
      }
      setSelectedDateFilter('custom')
    }
  }

  const isDateInRange = (date: Date) => {
    if (!customStartDate) return false
    // Use local date format to match stored dates
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const start = customStartDate
    const end = customEndDate || customStartDate
    return dateStr >= start && dateStr <= end
  }

  const isRangeEdge = (date: Date) => {
    // Use local date format to match stored dates
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return dateStr === customStartDate || dateStr === customEndDate
  }

  const getDateRangeDisplay = () => {
    // Show custom date range when dates are selected
    if (customStartDate && customEndDate) {
      // Parse the local date strings and format them
      const [startYear, startMonth, startDay] = customStartDate.split('-')
      const [endYear, endMonth, endDay] = customEndDate.split('-')
      const startStr = `${startDay}/${startMonth}/${startYear.slice(-2)}`
      const endStr = `${endDay}/${endMonth}/${endYear.slice(-2)}`
      return `${startStr} - ${endStr}`
    }
    
    // Show single date when only start date is selected
    if (customStartDate && !customEndDate) {
      // Parse the local date string and format it
      const [year, month, day] = customStartDate.split('-')
      return `${day}/${month}/${year.slice(-2)}`
    }
    
    // Show preset filter names
    switch (selectedDateFilter) {
      case 'weekToDate':
        return 'Week to date'
      case 'monthToDate':
        return 'Month to date'
      case 'last7Days':
        return 'Last 7 days'
      case 'last14Days':
        return 'Last 14 days'
      case 'last30Days':
        return 'Last 30 days'
      case 'last90Days':
      default:
        return 'Last 90 Days'
    }
  }

  // Function to apply filters to data
  const applyFilters = (data: any[]) => {
    return data.filter((application: any) => {
      // Position filter
      if (positionFilter !== 'all' && application.position !== positionFilter) {
        return false
      }
      
      // Source filter - handle source_type based filtering
      if (sourceFilter !== 'all') {
        // Debug logging to see actual source values
        if (sourceFilter === 'Agency' || sourceFilter === 'Referrals') {
          console.log('DEBUG - Source Filter:', {
            sourceFilter,
            applicationSource: application.source,
            applicationName: application.name
          })
        }
        
        if (sourceFilter === 'Direct') {
          // Include all Direct sources: Direct, LinkedIn, Indeed, Naukri, and other sub_sources
          const isDirectSource = application.source === 'Direct' || 
                                application.source === 'LinkedIn' || 
                                application.source === 'Indeed' || 
                                application.source === 'Naukri' ||
                                application.source === 'direct_application' ||
                                (application.source && application.source !== 'Referrals' && application.source !== 'Agency')
          if (!isDirectSource) {
            return false
          }
        }
        if (sourceFilter === 'Referrals' && application.source !== 'Referrals') {
          return false
        }
        if (sourceFilter === 'Agency' && application.source !== 'Agency') {
          return false
        }
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
    let filteredData = applyFilters(data)
    
    // Sort interview bucket: 'Maybe' at top, then others
    if (activeBucket === 'interview') {
      filteredData = filteredData.sort((a: any, b: any) => {
        const aResult = a.interviewResult || ''
        const bResult = b.interviewResult || ''
        
        // Priority: Maybe > Recommend > Strongly Recommend > Reject > Pending
        const getPriority = (result: string) => {
          if (result === 'Maybe') return 0
          if (result === 'Recommend') return 1
          if (result === 'Strongly Recommend') return 2
          if (result === 'Reject') return 3
          return 4 // Pending
        }
        
        return getPriority(aResult) - getPriority(bResult)
      })
    }
    
    return filteredData.map((application: any, index: number) => (
      <tr key={index} className="hover:bg-gray-50 transition-colors border-b">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {application?.name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <button 
              onClick={() => {
                setEditableCandidate({...application})
                setCandidateDetailsOpen(true)
              }}
              className="font-medium text-emerald-600 hover:text-emerald-800 text-sm underline decoration-dotted cursor-pointer transition-colors"
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
            className="text-sm text-emerald-600 hover:text-emerald-800 underline decoration-dotted cursor-pointer transition-colors"
          >
            {application?.position}
          </button>
        </td>
        
        {activeBucket === 'screening' && (
          <>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.appliedDate}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.source}</td>
            <td className="px-6 py-4">
              <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
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
              <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
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
                application?.interviewStatus === 'Scheduled' ? 'bg-emerald-100 text-emerald-800' : 
                'bg-gray-100 text-gray-800'
              }>
                {application?.interviewStatus}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <Badge className={
                application?.interviewResult === 'Strongly Recommend' ? 'bg-purple-600 text-white font-bold' : 
                application?.interviewResult === 'Recommend' ? 'bg-blue-600 text-white font-semibold' : 
                application?.interviewResult === 'Maybe' ? 'bg-orange-500 text-white font-medium' : 
                application?.interviewResult === 'Reject' ? 'bg-red-600 text-white font-medium' : 
                'bg-amber-100 text-amber-800'
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
              <Badge className={application?.hireStatus === 'Onboarded' ? 'bg-green-100 text-green-800' : 'bg-emerald-100 text-emerald-800'}>
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
              <Badge className="bg-red-100 text-red-800">{application?.rejectionStage || 'N/A'}</Badge>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{application?.rejectionReason || <span className="text-gray-400 italic">Not specified</span>}</td>
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
              <Badge className="bg-emerald-100 text-emerald-800">{application?.status}</Badge>
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
    <div className="space-y-3 p-3 md:p-4 w-full">
      {/* Header with Filters */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Applications</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage candidate applications across all stages</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* View As Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">View as:</span>
              <Select value={viewAsRole} onValueChange={(v) => setViewAsRole(v as UserRole)}>
                <SelectTrigger className="h-10 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                </SelectContent>
              </Select>
              {viewAsRole === 'recruiter' && (
                <Select value={viewAsRecruiter} onValueChange={setViewAsRecruiter}>
                  <SelectTrigger className="h-10 w-[140px]">
                    <SelectValue placeholder="All Recruiters" />
                  </SelectTrigger>
                  <SelectContent>
                    {recruiters.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.id === user?.id ? `${r.name} (You)` : r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
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
              className="w-full pl-3 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-[140px]">
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px]">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Referrals">Referrals</SelectItem>
                <SelectItem value="Agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <input
            type="text"
            placeholder="Skills"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[100px]"
          />
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="bg-transparent gap-1"
            >
              <Calendar className="h-3 w-3" />
              {getDateRangeDisplay()}
            </Button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-10 z-50 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 p-2 w-[calc(100vw-2rem)] max-w-[330px] sm:w-[330px]">
                <div className="flex gap-2">
                  {/* Preset Options Sidebar */}
                  <div className="w-[88px] border-r border-gray-200 pr-1.5 shrink-0">
                    <div className="space-y-0.5">
                      <button
                        onClick={() => handlePresetDateFilter('weekToDate')}
                        className="w-full text-left px-1.5 py-1 text-[11px] rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Week to date
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('monthToDate')}
                        className="w-full text-left px-1.5 py-1 text-[11px] rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Month to date
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last7Days')}
                        className="w-full text-left px-1.5 py-1 text-[11px] rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 7 days
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last14Days')}
                        className="w-full text-left px-1.5 py-1 text-[11px] rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 14 days
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last30Days')}
                        className="w-full text-left px-1.5 py-1 text-[11px] rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 30 days
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last90Days')}
                        className="w-full text-left px-1.5 py-1 text-[11px] rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 90 days
                      </button>
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="flex-1 min-w-0">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-1.5">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <h3 className="text-[11px] font-medium">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                      {/* Weekday headers */}
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="text-center text-gray-500 font-medium py-0.5">
                          {day}
                        </div>
                      ))}

                      {/* Calendar days */}
                      {getCalendarDays(currentMonth).map((date, idx) => (
                        <div key={idx}>
                          {date ? (
                            <button
                              onClick={() => handleDateClick(date)}
                              onMouseEnter={() => setHoveredDate(date)}
                              onMouseLeave={() => setHoveredDate(null)}
                              disabled={isDateInFuture(date)}
                              style={!isDateInFuture(date) ? { border: '1px solid transparent' } : {}}
                              className={`w-full aspect-square text-[10px] rounded flex items-center justify-center transition-all duration-200 ${
                                isDateInFuture(date)
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : isRangeEdge(date)
                                  ? 'bg-emerald-600 text-white font-semibold'
                                  : isDateInRange(date)
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300'
                              }`}
                            >
                              {date.getDate()}
                            </button>
                          ) : (
                            <div className="w-full aspect-square" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Apply/Cancel Buttons */}
                    <div className="flex gap-1.5 mt-1.5 pt-1.5 border-t border-gray-200">
                      <Button
                        onClick={() => {
                          if (customStartDate && customEndDate) {
                            setShowDatePicker(false)
                            fetchCandidates(customStartDate, customEndDate)
                          }
                        }}
                        disabled={!customStartDate || !customEndDate}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-6 px-2"
                        size="sm"
                      >
                        Apply
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDatePicker(false)
                          setCustomStartDate('')
                          setCustomEndDate('')
                          setSelectedDateFilter('last90Days')
                        }}
                        variant="outline"
                        className="flex-1 text-[11px] h-6 px-2"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setPositionFilter('all')
              setSourceFilter('all')
              setSkillFilter('')
              setDateFilter('')
              setCustomStartDate('')
              setCustomEndDate('')
              setSelectedDateFilter('last90Days')
              console.log('[v0] Filters reset')
            }}
            className="bg-transparent"
            title="Reset all filters"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <>
          <StatCardGridLoader count={7} />
          <TableLoader rows={6} columns={6} />
        </>
      )}

      {/* Error State */}
      {!isLoading && error && <ErrorState message={error} onRetry={fetchCandidates} />}

      {/* Application Buckets - Mobile Responsive */}
      {!isLoading && !error && (<>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {(Object.keys(bucketData) as BucketType[]).map((bucket) => {
          const data = bucketData[bucket]
          const Icon = data.icon
          const stats = bucketStats[bucket as keyof typeof bucketStats] || null
          
          return (
            <Card
              key={bucket}
              className={`p-3 md:p-4 cursor-pointer transition-all hover:shadow-lg ${
                activeBucket === bucket ? 'ring-2 ring-emerald-600 shadow-lg bg-emerald-50' : 'shadow hover:bg-gray-50'
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
                  <div className="text-xl md:text-3xl font-bold text-emerald-600">
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
      </>)}

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
                    value={editableCandidate.email || ''} 
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
                    value={editableCandidate.phone || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input 
                    id="edit-location"
                    value={editableCandidate.candidateLocation || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, candidateLocation: e.target.value})}
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
                    value={editableCandidate.experience || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, experience: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-current-company">Current Company</Label>
                  <Input 
                    id="edit-current-company"
                    value={editableCandidate.currentCompany || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, currentCompany: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-current-role">Current Role</Label>
                  <Input 
                    id="edit-current-role"
                    value={editableCandidate.currentRole || ''} 
                    onChange={(e) => setEditableCandidate({...editableCandidate, currentRole: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-salary">Expected Salary</Label>
                  <Input 
                    id="edit-salary"
                    value={editableCandidate.expectedSalary || ''} 
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
                  value={editableCandidate.skills || ''} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, skills: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-education">Education</Label>
                <Input 
                  id="edit-education"
                  value={editableCandidate.education || ''} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, education: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-linkedin">LinkedIn Profile</Label>
                <Input 
                  id="edit-linkedin"
                  value={editableCandidate.linkedinUrl || ''} 
                  onChange={(e) => setEditableCandidate({...editableCandidate, linkedinUrl: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <Textarea 
                  id="edit-notes"
                  value={editableCandidate.comments || editableCandidate.notes || ''} 
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
                    <Badge key={tech} className="bg-emerald-100 text-emerald-800">{tech}</Badge>
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
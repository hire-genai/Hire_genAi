'use client';

export const dynamic = 'force-dynamic';

import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import { useState, useEffect, useCallback } from "react"
import { 
  Users, 
  Briefcase, 
  Calendar,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  Target,
  Activity,
  Gauge,
  MessageSquare,
  BarChart3,
  LineChart,
  DollarSign,
  PieChart,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import OnboardingTour from '@/components/onboarding/onboarding-tour'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/contexts/auth-context'
import { StatCardGridLoader, ErrorState, CardLoader, TableLoader } from '@/components/ui/skeleton-loader'

type UserRole = 'recruiter' | 'manager' | 'director'

interface DashboardData {
  kpis: {
    openJobs: number
    totalJobs: number
    draftJobs: number
    closedJobs: number
    totalApplications: number
    activeCandidates: number
    screeningCount: number
    interviewCount: number
    hmCount: number
    offerCount: number
    hiredCount: number
    rejectedCount: number
    newThisWeek: number
    avgInterviewScore: number
    offerAcceptanceRate: number
    avgTimeToFill: number
    totalCandidates: number
    teamMembers: number
  }
  recentCandidates: Array<{
    id: string
    name: string
    email: string
    position: string
    status: string
    experience: string
    appliedDate: string
    cvScore: number | null
    interviewScore: number | null
  }>
  pipelineByJob: Array<{
    id: string
    title: string
    department: string
    status: string
    totalCandidates: number
    screening: number
    aiInterview: number
    hiringManager: number
    offer: number
    hired: number
    rejected: number
    openDays: number
  }>
  stageTimeAvgs: Array<{
    stage: string
    avgDays: number
    bottleneck: boolean
  }>
  sourceEffectiveness: Array<{
    source: string
    total: number
    advanced: number
    hired: number
    conversionRate: number
  }>
  sourcingActivity: Array<{
    channel: string
    outreach: string
    responses: string
    conversionRate: string
    quality: string
  }>
  recruiters: Array<{
    id: string
    name: string
    email: string
    activeJobs: number
    activeCandidates: number
    hiredCount?: number
  }>
  teamPipelineHealth: Array<{
    recruiter: string
    total_candidates: number
    bottlenecks: number
    avg_time_in_stage: string
    efficiency: string
  }>
  teamOfferAcceptance: Array<{
    id: string
    name: string
    email: string
    offers: number
    accepted: number
    rate: string
  }>
  teamCapacityLoad: Array<{
    id: string
    name: string
    email: string
    activeReqs: number
    capacity: number
    loadPercent: string
    status: string
  }>
  hiringManagerStats: Array<{
    id: string
    managerName: string
    email: string
    approved: number
    pending: number
    rejected: number
    userRole?: string
  }>
  hiringManagerSatisfaction: {
    currentRating: string
    previousRating: string
    change: string
  }
  hiringVelocity: {
    totalHires: number
    totalApplications: number
  }
  hiringVelocityMonthly: Array<{
    month: string
    plan: number
    hires: number
    variance: number
    trend: string
    fillRate: string
  }>
  qualityOfHire: {
    avgRating: string
    retentionRate: number
    totalCount: number
  }
  qualityOfHireDetailed: Array<{
    cohort: string
    avgRating: number
    retention3mo: number
    performanceIndex: string
    count: number
  }>
  totalCandidatesDetailed: Array<{
    cohort: string
    totalCandidates: number
    activeCandidates: number
    activePercentage: number
  }>
  costAnalysis: {
    costPerHire: number
    currency: string
    totalSpend: number
    recruitmentCost: number
    jobBoardCost: number
    agencyCost: number
    clientRevenue: number
    hiredCount: number
  }
  quarterlyCostBreakdown: Array<{
    quarter: string
    hired: number
    recruitmentCost: number
    jobBoardCost: number
    agencyCost: number
    costToCompany: number
    clientRevenue: number
    totalSpend: number
  }>
  recruitmentROI: Array<{
    metric: string
    value: string
    period: string
    benchmark: string
  }>
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { className: string }> = {
    New: { className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    Screening: { className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
    Interview: { className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
    Offer: { className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    Hired: { className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    Rejected: { className: 'bg-red-100 text-red-700 hover:bg-red-100' },
    'HM Review': { className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
  }
  return variants[status] || variants.New
}

  export default function DashboardPage() {
  const { company, user } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole>('recruiter')
  const [selectedRecruiter, setSelectedRecruiter] = useState('all')
  const [selectedDateFilter, setSelectedDateFilter] = useState('last90Days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>((user?.role as UserRole) || null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range based on filter
  const getDateRange = useCallback((overrideStart?: string, overrideEnd?: string) => {
    if (overrideStart && overrideEnd) {
      return { startDate: overrideStart, endDate: overrideEnd }
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

  const fetchDashboard = useCallback(async (overrideStart?: string, overrideEnd?: string) => {
    try {
      setLoading(true)
      setError(null)
      const dateRange = getDateRange(overrideStart, overrideEnd)
      const params = new URLSearchParams()
      if (company?.id) params.append('companyId', company.id)
      params.append('startDate', dateRange.startDate)
      params.append('endDate', dateRange.endDate)
      
      // Add recruiter filter for manager/director roles
      if (selectedRecruiter && selectedRecruiter !== 'all') {
        params.append('recruiterId', selectedRecruiter)
      }
      
      const res = await fetch(`/api/dashboard?${params.toString()}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch dashboard data')
      }
      const json = await res.json()
      setDashboardData(json.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [company?.id, getDateRange, selectedRecruiter])

  // Derive effective role directly (avoids null→value layout shift)
  const effectiveUserRole = userRole || (user?.role as UserRole | null)

  // Set user role from auth context and restrict view
  useEffect(() => {
    if (user?.role) {
      const role = user.role as UserRole
      setUserRole(role)
      // If user is recruiter, lock them to recruiter view only
      if (role === 'recruiter') {
        setSelectedRole('recruiter')
      }
    }
  }, [user])

  // Only fetch on initial mount; re-fetch is triggered by Apply button or preset selection
  useEffect(() => {
    fetchDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch dashboard when recruiter selection changes (for manager/director)
  useEffect(() => {
    if (selectedRecruiter && userRole && (userRole === 'manager' || userRole === 'director')) {
      fetchDashboard()
    }
  }, [selectedRecruiter, userRole, fetchDashboard])

  // Note: Data will only be fetched when Apply button is clicked

  // Handle preset date filter selection
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
    
    // Pass dates directly to avoid stale state in fetchDashboard
    fetchDashboard(startDateStr, endDateStr)
  }

  // Generate calendar days for current month
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
    
    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, monthIndex, day))
    }
    
    return days
  }

  // Check if date is in the future (after today)
  const isDateInFuture = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of day for comparison
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate > today
  }

  // Handle date selection in calendar
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

  // Check if date is in selected range
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

  // Check if date is start or end of range
  const isRangeEdge = (date: Date) => {
    // Use local date format to match stored dates
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return dateStr === customStartDate || dateStr === customEndDate
  }

  // Format date range for display
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

  // Handle role change with restriction
  const handleRoleChange = (value: UserRole) => {
    // Prevent recruiter from changing view
    if (userRole === 'recruiter') {
      return
    }
    setSelectedRole(value)
  }

const roleDescriptions = {
  recruiter: 'My Focus - Am I hitting my goals and keeping candidates moving?',
  manager: 'Team Effectiveness - How is my team performing and where can I help?',
  director: 'Strategic Impact & ROI - Is our TA strategy supporting business growth with quality hires?',
}

  // Helper function to get currency symbol from currency code
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥',
      'CAD': '$',
      'AUD': '$'
    }
    return symbols[currency] || '$'
  }

  const kpis = dashboardData?.kpis
  const recruiters = dashboardData?.recruiters || []

  // Build KPIs from real data
  const buildRoleKPIs = () => {
    // Static mock data for Manager and Director (but update Team Pipeline Health, Offer Acceptance Rate, and Team Capacity Load with real data)
    const totalTeamCandidates = dashboardData?.teamPipelineHealth?.reduce((sum, recruiter) => sum + recruiter.total_candidates, 0) || 0
    const totalScreening = dashboardData?.teamPipelineHealth?.reduce((sum, recruiter) => sum + recruiter.bottlenecks, 0) || 0
    
    // Calculate real team offer acceptance rate
    const totalOffersGiven = dashboardData?.teamOfferAcceptance?.reduce((sum, recruiter) => sum + recruiter.offers, 0) || 0
    const totalOffersAccepted = dashboardData?.teamOfferAcceptance?.reduce((sum, recruiter) => sum + recruiter.accepted, 0) || 0
    const teamOfferRate = totalOffersGiven > 0 ? Math.round((totalOffersAccepted / totalOffersGiven) * 100) : 0
    
    // Calculate real team capacity load
    const totalActiveReqs = dashboardData?.teamCapacityLoad?.reduce((sum, recruiter) => sum + recruiter.activeReqs, 0) || 0
    const totalCapacity = dashboardData?.teamCapacityLoad?.reduce((sum, recruiter) => sum + recruiter.capacity, 0) || 7
    const teamCapacityLoad = totalCapacity > 0 ? Math.round((totalActiveReqs / totalCapacity) * 100) : 0
    const overloadedRecruiter = dashboardData?.teamCapacityLoad?.find(r => r.status === 'Overloaded')?.name || 'Recruiter A'
    
    // Get real hiring manager satisfaction data
    const hmSatisfaction = dashboardData?.hiringManagerSatisfaction
    const hmRating = hmSatisfaction?.currentRating || '0.0'
    const hmChangeNum = parseFloat(hmSatisfaction?.change || '0.0')
    const hmTrend = hmChangeNum > 0 ? 'up' as const : hmChangeNum < 0 ? 'down' as const : 'neutral' as const
    
    // Get real source quality data for manager KPI
    const sourceQualityData = dashboardData?.sourceEffectiveness || []
    const bestSource = sourceQualityData.length > 0 
      ? sourceQualityData.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        )
      : null
    
    const managerKPIs = [
      { title: 'Team Pipeline Health', value: String(totalTeamCandidates), change: `${totalScreening} in bottleneck`, trend: 'neutral' as const, icon: Users, color: 'orange' as const, subtitle: 'Total candidates across team' },
            { title: 'Offer Acceptance Rate', value: `${teamOfferRate}%`, change: 'Target: 80%', trend: teamOfferRate >= 80 ? 'up' as const : teamOfferRate >= 60 ? 'neutral' as const : 'down' as const, icon: MessageSquare, color: 'green' as const, subtitle: 'All time' },
      { title: 'Team Capacity Load', value: `${teamCapacityLoad}%`, change: `${overloadedRecruiter} overloaded`, trend: teamCapacityLoad > 100 ? 'down' as const : teamCapacityLoad >= 70 ? 'neutral' as const : 'up' as const, icon: Gauge, color: 'red' as const, subtitle: 'Team capacity utilization' },
      { title: 'Hiring Manager', value: hmRating, change: `${hmChangeNum > 0 ? '+' : ''}${hmChangeNum} vs last quarter`, trend: hmTrend, icon: MessageSquare, color: 'green' as const, subtitle: 'Hiring manager satisfaction score' },
      { title: 'Source Quality', value: bestSource?.source || 'N/A', change: `${bestSource?.conversionRate || 0}% conversion`, trend: 'up' as const, icon: BarChart3, color: 'emerald' as const, subtitle: 'Best performing channel' },
    ]

    const directorKPIs = [
      { title: 'Hiring Velocity', value: String(dashboardData?.hiringVelocity?.totalHires || 0), change: `${dashboardData?.hiringVelocity?.totalApplications || 0} total apps`, trend: 'up' as const, icon: TrendingUp, color: 'orange' as const, subtitle: 'Total hires' },
      { title: 'Quality of Hire', value: dashboardData?.qualityOfHire?.avgRating || '0.0', change: `${dashboardData?.qualityOfHire?.retentionRate || 0}% retention @ 3mo`, trend: 'up' as const, icon: MessageSquare, color: 'green' as const, subtitle: 'Performance rating + retention' },
            { title: 'Cost Per Hire', value: `${getCurrencySymbol(dashboardData?.costAnalysis?.currency || 'USD')}${(dashboardData?.costAnalysis?.costPerHire || 0).toLocaleString()}`, change: `${dashboardData?.costAnalysis?.hiredCount || 0} hires this period`, trend: 'neutral' as const, icon: DollarSign, color: 'orange' as const, subtitle: 'Total cost per successful hire' },
      { title: 'Recruitment ROI', value: (() => {
        const roiData = dashboardData?.recruitmentROI || []
        if (!roiData || roiData.length === 0) return '0.0x'
        
        const roiMetric = roiData.find((m: { metric: string; value: string; period: string; benchmark: string }) => m.metric === 'ROI')
        if (roiMetric?.benchmark) return roiMetric.benchmark
        
        const valueCreated = roiData.find((m: { metric: string; value: string; period: string; benchmark: string }) => m.metric === 'Value Created')
        if (valueCreated?.benchmark) return valueCreated.benchmark
        
        return '0.0x'
      })(), change: 'Quality/retention rising', trend: 'up' as const, icon: PieChart, color: 'green' as const, subtitle: 'Return on investment' },
      { title: 'Total Candidates', value: String(dashboardData?.kpis?.totalCandidates || '0'), change: `${dashboardData?.kpis?.activeCandidates || '0'} active`, trend: 'neutral' as const, icon: Users, color: 'emerald' as const, subtitle: 'In database' },
    ]

    // Recruiter uses backend data
    if (selectedRole === 'recruiter') {
      if (!kpis) return []
      // Calculate candidates who advanced to interview OR beyond (hired)
      const advancedCandidates = (kpis.interviewCount || 0) + (kpis.hmCount || 0) + (kpis.offerCount || 0) + (kpis.hiredCount || 0)
      const submittedToInterview = kpis.totalApplications > 0
        ? Math.round((advancedCandidates / kpis.totalApplications) * 100)
        : 0

      // Calculate real sourcing activity conversion rate
      const sourcingActivityData = dashboardData?.sourcingActivity || []
      const avgSourcingConversion = sourcingActivityData.length > 0
        ? Math.round(sourcingActivityData.reduce((sum, s) => {
            const rate = parseFloat(s.conversionRate) || 0
            return sum + rate
          }, 0) / sourcingActivityData.length)
        : 0

      return [
        { title: 'My Open Reqs', value: String(kpis.openJobs), change: `${kpis.draftJobs} drafts`, trend: kpis.openJobs > 0 ? 'neutral' as const : 'alert' as const, icon: Briefcase, color: 'emerald' as const, subtitle: 'Active open positions' },
        { title: 'Candidates in Pipeline', value: String(kpis.activeCandidates), change: `${kpis.newThisWeek} new this week`, trend: kpis.newThisWeek > 0 ? 'up' as const : 'neutral' as const, icon: Users, color: 'orange' as const, subtitle: 'Across all stages' },
        { title: 'Screening', value: String(kpis.screeningCount), change: `${kpis.interviewCount} in interview`, trend: 'neutral' as const, icon: Target, color: 'green' as const, subtitle: 'CV screening stage' },
        { title: 'Avg Interview Score', value: kpis.avgInterviewScore > 0 ? `${kpis.avgInterviewScore}` : 'N/A', change: `${kpis.interviewCount} interviewed`, trend: kpis.avgInterviewScore >= 70 ? 'up' as const : 'neutral' as const, icon: Clock, color: 'purple' as const, subtitle: 'Average AI interview score' },
        { title: 'Submittal Quality', value: `${submittedToInterview}%`, change: `${kpis.interviewCount} advanced`, trend: submittedToInterview >= 40 ? 'up' as const : 'down' as const, icon: CheckCircle, color: 'emerald' as const, subtitle: 'Screening to interview rate' },
        { title: 'Sourcing Activity', value: `${avgSourcingConversion}%`, change: 'Target: 80%', trend: avgSourcingConversion >= 80 ? 'up' as const : avgSourcingConversion >= 60 ? 'neutral' as const : 'down' as const, icon: Activity, color: 'emerald' as const, subtitle: 'Current bottleneck' },
      ]
    }

    // Return static data for Manager and Director
    if (selectedRole === 'manager') return managerKPIs
    return directorKPIs
  }

  const currentKPIs = buildRoleKPIs()

  // KPI calculation explanations
  const kpiExplanations: Record<string, { calculation: string; dataContext: string }> = {
    'My Open Reqs': {
      calculation: 'Count of all active job requisitions currently open and accepting applications.',
      dataContext: 'Each row shows a job posting with days open, number of candidates in pipeline, and current status.',
    },
    'Candidates in Pipeline': {
      calculation: 'Total number of active candidates across all stages, excluding rejected/hired/withdrawn.',
      dataContext: 'Shows recent candidates, their current stage, and application date.',
    },
    'Screening': {
      calculation: 'Count of candidates currently in the CV screening stage.',
      dataContext: 'Candidates awaiting or undergoing CV evaluation.',
    },
    'Avg Interview Score': {
      calculation: 'Average AI interview score across all completed interviews.',
      dataContext: 'Recent candidates with their interview scores.',
    },
    'Submittal Quality': {
      calculation: 'Percentage of submitted candidates who advance to interview stage.',
      dataContext: 'Pipeline breakdown by job showing conversion rates.',
    },
    'Sourcing Activity': {
      calculation: 'Average conversion rate across all sourcing channels (responses ÷ outreach × 100).',
      dataContext: 'Breakdown by channel showing outreach volume, responses received, conversion rates, and quality assessment.',
    },
    'Team Pipeline Health': {
      calculation: 'Total active candidates across all team members.',
      dataContext: 'Per-recruiter metrics showing workload and active candidates.',
    },
    'Time to Fill (Avg)': {
      calculation: 'Average days from application to hire for completed hires.',
      dataContext: 'Pipeline breakdown by job with days open.',
    },
    'Offer Acceptance Rate': {
      calculation: 'Percentage of offers accepted out of all decided offers.',
      dataContext: 'Offer stage metrics.',
    },
    'Team Capacity Load': {
      calculation: 'Team capacity utilization as percentage (Active Reqs ÷ Standard Capacity × 100). Over 100% indicates overload.',
      dataContext: 'Individual recruiter workloads showing active requisitions vs capacity with load percentage and status flags.',
    },
    'Total Hired': {
      calculation: 'Total number of candidates who reached the hired stage.',
      dataContext: 'Recent hires with details.',
    },
    'Source Quality': {
      calculation: 'Effectiveness ranking of sourcing channels by conversion rate.',
      dataContext: 'Channel performance showing candidate volume and conversion.',
    },
    'Hiring Velocity': {
      calculation: 'Total hires completed.',
      dataContext: 'Hiring performance overview.',
    },
    'Pipeline Conversion': {
      calculation: 'Percentage of applications that result in a hire.',
      dataContext: 'Pipeline funnel metrics.',
    },
    'Open Positions': {
      calculation: 'Count of currently open job postings.',
      dataContext: 'Active job postings with candidate counts.',
    },
    'Offer Acceptance': {
      calculation: 'Percentage of offers accepted.',
      dataContext: 'Offer stage details.',
    },
    'Total Candidates': {
      calculation: 'Total unique candidates in the database for this company.',
      dataContext: 'Candidate overview.',
    },
    'Quality of Hire': {
      calculation: 'Average performance rating of new hires combined with 3-month retention rate as quality indicator.',
      dataContext: 'Cohort analysis showing performance ratings, retention metrics, and quality index by hiring period.',
    },
    'Recruitment ROI': {
      calculation: 'Investment = Sum of Cost To Company across all quarters. Value Created = Sum of Total Spend across all quarters. ROI = Value Created ÷ Investment.',
      dataContext: 'Annual financial metrics showing total investment costs, net spend after client revenue, quality ratings of hired candidates, and 3-month retention rates.',
    },
  }

  // Build KPI drill-down data from real API data (Recruiter/Manager) or static data (Director)
  const getKPIDetails = (kpiTitle: string): any[] => {
    // Static mock data for Manager and Director drill-downs (except Team Pipeline Health for Manager)
    if (selectedRole === 'manager') {
      // Use real data for Team Pipeline Health
      if (kpiTitle === 'Team Pipeline Health' && dashboardData?.teamPipelineHealth && dashboardData.teamPipelineHealth.length > 0) {
        return dashboardData.teamPipelineHealth.map(t => ({
          recruiter: t.recruiter,
          totalCandidates: t.total_candidates,
          bottlenecks: t.bottlenecks,
          avgTimeInStage: t.avg_time_in_stage,
          efficiency: t.efficiency,
        }))
      }

      if (kpiTitle === 'Offer Acceptance Rate' && dashboardData?.teamOfferAcceptance && dashboardData.teamOfferAcceptance.length > 0) {
        return dashboardData.teamOfferAcceptance.map(o => ({
          recruiter: o.name,
          offers: o.offers,
          accepted: o.accepted,
          rate: o.rate
        }))
      }

      if (kpiTitle === 'Team Capacity Load' && dashboardData?.teamCapacityLoad && dashboardData.teamCapacityLoad.length > 0) {
        return dashboardData.teamCapacityLoad.map(c => ({
          recruiter: c.name,
          email: c.email,
          activeReqs: c.activeReqs,
          capacity: c.capacity,
          loadPercent: c.loadPercent,
          status: c.status
        }))
      }

      if (kpiTitle === 'Hiring Manager' && dashboardData?.hiringManagerStats && dashboardData.hiringManagerStats.length > 0) {
        return dashboardData.hiringManagerStats.map(hm => ({
          managerName: hm.managerName,
          email: hm.email,
          approved: hm.approved,
          pending: hm.pending,
          rejected: hm.rejected
        }))
      }

      // Use real source effectiveness data for Source Quality
      if (kpiTitle === 'Source Quality' && dashboardData?.sourceEffectiveness && dashboardData.sourceEffectiveness.length > 0) {
        return dashboardData.sourceEffectiveness.map((s: any) => ({
          source: s.source,
          candidates: s.total,
          advanced: s.advanced,
          hired: s.hired,
          conversionRate: s.total > 0 ? `${Math.round((s.advanced / s.total) * 100)}%` : '0%'
        }))
      }

      // Return empty array for any other manager KPI
      return []
    } else if (selectedRole === 'director') {
      if (kpiTitle === 'Hiring Velocity' && dashboardData?.hiringVelocityMonthly && dashboardData.hiringVelocityMonthly.length > 0) {
        return dashboardData.hiringVelocityMonthly.map(m => ({
          month: m.month,
          plan: m.plan,
          hires: m.hires,
          variance: m.variance,
          trend: m.trend,
          fillRate: m.fillRate
        }))
      }

      if (kpiTitle === 'Quality of Hire') {
        // Always show columns, even if no data
        if (dashboardData?.qualityOfHireDetailed && dashboardData.qualityOfHireDetailed.length > 0) {
          return dashboardData.qualityOfHireDetailed.map(q => ({
            cohort: q.cohort,
            avgRating: q.avgRating,
            retention3mo: `${q.retention3mo}%`,
            performanceIndex: q.performanceIndex,
            count: q.count
          }))
        }
        // Return empty array to show columns with no data
        return []
      }

      if (kpiTitle === 'Total Candidates') {
        // Always show columns, even if no data
        if (dashboardData?.totalCandidatesDetailed && dashboardData.totalCandidatesDetailed.length > 0) {
          return dashboardData.totalCandidatesDetailed.map(t => ({
            cohort: t.cohort,
            totalCandidates: t.totalCandidates,
            activeCandidates: t.activeCandidates,
            activePercentage: `${t.activePercentage}%`
          }))
        }
        // Return empty array to show columns with no data
        return []
      }

      const directorDetails: Record<string, any[]> = {
                'Cost Per Hire': dashboardData?.quarterlyCostBreakdown || [],
        'Recruitment ROI': dashboardData?.recruitmentROI || [],
        'Total Candidates': [
          { total: 342, active: 156, hired: 28, rejected: 158 },
        ],
      }
      return directorDetails[kpiTitle] || []
    }

    // Recruiter uses backend data
    if (!dashboardData) return []

    console.log('Dashboard Data for Recruiter:', {
      recentCandidates: dashboardData.recentCandidates?.length || 0,
      recentCandidatesData: dashboardData.recentCandidates
    })

    const detailData: Record<string, any[]> = {
      'My Open Reqs': (dashboardData.pipelineByJob || []).map(j => ({
        position: j.title,
        department: j.department,
        openDays: j.openDays,
        candidates: j.totalCandidates,
        status: j.status === 'open' ? 'Active' : j.status,
      })),
      'Candidates in Pipeline': (dashboardData.recentCandidates || []).map(c => ({
        name: c.name,
        position: c.position,
        stage: c.status,
        applied: c.appliedDate,
      })),
      'Screening': (dashboardData.recentCandidates || []).filter(c => c.status === 'Screening').map(c => ({
        name: c.name,
        position: c.position,
        cvScore: c.cvScore != null ? `${c.cvScore}/100` : 'Pending',
        applied: c.appliedDate,
      })),
      'Avg Interview Score': (dashboardData.recentCandidates || []).filter(c => c.interviewScore != null).map(c => ({
        name: c.name,
        position: c.position,
        interviewScore: `${c.interviewScore}/100`,
        stage: c.status,
      })),
      'Submittal Quality': (dashboardData.pipelineByJob || []).map(j => ({
        position: j.title,
        submitted: j.totalCandidates,
        interviewed: j.aiInterview + j.hiringManager + j.offer + j.hired,
        rate: j.totalCandidates > 0 ? `${Math.round(((j.aiInterview + j.hiringManager + j.offer + j.hired) / j.totalCandidates) * 100)}%` : '0%',
      })),
      'Sourcing Activity': (dashboardData.sourcingActivity || []).map(s => ({
        channel: s.channel,
        outreach: s.outreach,
        responses: s.responses,
        conversionRate: s.conversionRate,
        quality: s.quality,
      })),
      'Team Pipeline Health': (dashboardData.teamPipelineHealth || []).map(t => ({
        recruiter: t.recruiter,
        totalCandidates: t.total_candidates,
        bottlenecks: t.bottlenecks,
        avgTimeInStage: t.avg_time_in_stage,
        efficiency: t.efficiency,
      })),
      'Time to Fill (Avg)': (dashboardData.pipelineByJob || []).map(j => ({
        position: j.title,
        openDays: j.openDays,
        hired: j.hired,
        status: j.hired > 0 ? 'Filled' : 'Open',
      })),
      'Offer Acceptance Rate': [{
        metric: 'Acceptance Rate',
        value: `${dashboardData.kpis.offerAcceptanceRate}%`,
        offersInProgress: dashboardData.kpis.offerCount,
        hired: dashboardData.kpis.hiredCount,
      }],
      'Team Capacity': (dashboardData.recruiters || []).map(r => ({
        recruiter: r.name,
        email: r.email,
        activeJobs: r.activeJobs,
        activeCandidates: r.activeCandidates,
      })),
      'Total Hired': (dashboardData.recentCandidates || []).filter(c => c.status === 'Hired').map(c => ({
        name: c.name,
        position: c.position,
        applied: c.appliedDate,
      })),
      'Source Quality': (dashboardData.sourceEffectiveness || []).map(s => ({
        source: s.source,
        candidates: s.total,
        advanced: s.advanced,
        hired: s.hired,
        conversionRate: `${s.conversionRate}%`,
      })),
      'Hiring Velocity': [{
        totalHires: dashboardData.kpis.hiredCount,
        totalApplications: dashboardData.kpis.totalApplications,
        conversionRate: dashboardData.kpis.totalApplications > 0 ? `${Math.round((dashboardData.kpis.hiredCount / dashboardData.kpis.totalApplications) * 100)}%` : '0%',
      }],
      'Pipeline Conversion': (dashboardData.pipelineByJob || []).map(j => ({
        position: j.title,
        total: j.totalCandidates,
        hired: j.hired,
        rate: j.totalCandidates > 0 ? `${Math.round((j.hired / j.totalCandidates) * 100)}%` : '0%',
      })),
      'Open Positions': (dashboardData.pipelineByJob || []).map(j => ({
        position: j.title,
        department: j.department,
        candidates: j.totalCandidates,
        openDays: j.openDays,
      })),
      'Offer Acceptance': [{
        rate: `${dashboardData.kpis.offerAcceptanceRate}%`,
        inOfferStage: dashboardData.kpis.offerCount,
        hired: dashboardData.kpis.hiredCount,
      }],
      'Total Candidates': [{
        total: dashboardData.kpis.totalCandidates,
        active: dashboardData.kpis.activeCandidates,
        hired: dashboardData.kpis.hiredCount,
        rejected: dashboardData.kpis.rejectedCount,
      }],
    }
    return detailData[kpiTitle] || []
  }

  return (
    <>
      <OnboardingTour />
      <div className="space-y-4 p-3 md:p-4 w-full overflow-x-hidden">
      {/* Header with Role Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1 hidden sm:block">{roleDescriptions[selectedRole]}</p>
        </div>
        {/* Filters Row - all in one row with proper responsive spacing */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 pb-1">
          {/* Only show View As dropdown for manager/director */}
          {effectiveUserRole && (effectiveUserRole === 'manager' || effectiveUserRole === 'director') && (
            <>
              <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">View as:</span>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-xs sm:text-sm flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {/* Show All Recruiters filter only when viewing as Recruiter */}
          {effectiveUserRole && (effectiveUserRole === 'manager' || effectiveUserRole === 'director') && selectedRole === 'recruiter' && (
            <>
              <span className="text-sm text-gray-400 hidden sm:inline">|</span>
              <Select value={selectedRecruiter} onValueChange={setSelectedRecruiter}>
                <SelectTrigger className="w-auto min-w-[100px] sm:min-w-[120px] h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recruiters</SelectItem>
                  {recruiters.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="h-8 px-3 text-sm font-normal bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {getDateRangeDisplay()}
            </Button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-10 z-50 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 p-3 w-[calc(100vw-2rem)] max-w-[480px] sm:w-[480px]">
                <div className="flex gap-3">
                  {/* Preset Options Sidebar */}
                  <div className="w-32 border-r border-gray-200 pr-3">
                    <div className="space-y-1">
                      <button
                        onClick={() => handlePresetDateFilter('weekToDate')}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Week to date
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('monthToDate')}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Month to date
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last7Days')}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 7 days
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last14Days')}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 14 days
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last30Days')}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 30 days
                      </button>
                      <button
                        onClick={() => handlePresetDateFilter('last90Days')}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        Last 90 days
                      </button>
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="flex-1">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-medium text-sm">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs text-gray-500 py-1 font-medium">
                          {day}
                        </div>
                      ))}
                      {getCalendarDays(currentMonth).map((date, idx) => (
                        <div key={idx}>
                          {date ? (
                            <button
                              onClick={() => handleDateClick(date)}
                              onMouseEnter={() => setHoveredDate(date)}
                              onMouseLeave={() => setHoveredDate(null)}
                              disabled={isDateInFuture(date)}
                              style={!isDateInFuture(date) ? { border: '1px solid transparent' } : {}}
                              className={`w-full aspect-square text-xs rounded flex items-center justify-center transition-all duration-200 ${
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

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDatePicker(false)
                          handlePresetDateFilter('last90Days')
                        }}
                        className="bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (customStartDate && customEndDate) {
                            setShowDatePicker(false)
                            fetchDashboard(customStartDate, customEndDate)
                          }
                        }}
                        disabled={!customStartDate || !customEndDate}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 h-7 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
      </div>

      {/* Loading State */}
      {loading && <StatCardGridLoader count={6} />}

      {/* Error State */}
      {!loading && error && <ErrorState message={error} onRetry={fetchDashboard} />}

      {/* Role-Based KPI Cards - Compact with proper mobile spacing */}
      {!loading && !error && (<>
      <div className={`grid grid-cols-2 gap-2 sm:gap-1.5 justify-items-stretch ${
          currentKPIs.length === 6 ? 'sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6' : 'sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5'
        }`}>
        {currentKPIs.map((kpi) => {
          const Icon = kpi.icon
          const colorClasses = {
            blue: 'bg-emerald-100 text-emerald-700',
            green: 'bg-green-100 text-green-700',
            emerald: 'bg-emerald-100 text-emerald-700',
            purple: 'bg-purple-100 text-purple-700',
            orange: 'bg-orange-100 text-orange-700',
            red: 'bg-red-100 text-red-700',
          }[kpi.color]

          const getTrendIcon = () => {
            if (kpi.trend === 'up') return <TrendingUp className="w-3 h-3 text-green-600" />
            if (kpi.trend === 'down') return <TrendingDown className="w-3 h-3 text-red-600" />
            return <Activity className="w-3 h-3 text-gray-600" />
          }

          return (
            <Card 
              key={kpi.title} 
              className={`hover:shadow-lg transition-all cursor-pointer h-full ${
                selectedKPI === kpi.title ? 'ring-2 ring-emerald-600 shadow-lg' : ''
              }`}
              onClick={() => setSelectedKPI(selectedKPI === kpi.title ? null : kpi.title)}
            >
              <CardContent className="p-1.5 h-full">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-gray-600 mb-0.5 truncate">
                        {kpi.title}
                      </div>
                      <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                    </div>
                    <div className={`w-6 h-6 ${colorClasses} rounded-md flex items-center justify-center shrink-0 ml-1`}>
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] mt-auto">
                    {getTrendIcon()}
                    <span className={`font-medium truncate ${
                      kpi.trend === 'up' ? 'text-green-600' : 
                      kpi.trend === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* KPI Detail View */}
      {selectedKPI && (
        <Card className="border-2 border-emerald-200">
          <CardHeader className="bg-emerald-50 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedKPI} - Detailed View
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedKPI(null)}
                className="bg-transparent"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {/* KPI Explanation Section */}
            {kpiExplanations[selectedKPI] && (
              <div className="mb-2 p-2 bg-emerald-50 border-l-2 border-emerald-500 rounded text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="font-semibold text-gray-900">How calculated:</span>{' '}
                    <span className="text-gray-700">{kpiExplanations[selectedKPI].calculation}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Data represents:</span>{' '}
                    <span className="text-gray-700">{kpiExplanations[selectedKPI].dataContext}</span>
                  </div>
                </div>
              </div>
            )}
            {/* Table with horizontal scroll for mobile - smooth minimal scrollbar */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-gray-50 text-xs">
                    {(() => {
                      const details = getKPIDetails(selectedKPI)
                      if (details.length > 0) {
                        return Object.keys(details[0]).map((key) => (
                          <TableHead key={key} className="font-semibold capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </TableHead>
                        ))
                      }
                      // Show default columns even with no data
                      const defaultColumns: Record<string, string[]> = {
                        'Quality of Hire': ['Cohort', 'Avg Rating', 'Retention3mo', 'Performance Index', 'Count'],
                        'Total Candidates': ['Cohort', 'Total Candidates', 'Active Candidates', 'Active Percentage'],
                        'Team Pipeline Health': ['Recruiter', 'Total Candidates', 'Bottlenecks', 'Avg Time In Stage', 'Efficiency'],
                        'Offer Acceptance Rate': ['Recruiter', 'Offers', 'Accepted', 'Rate'],
                        'Team Capacity Load': ['Recruiter', 'Email', 'Active Reqs', 'Capacity', 'Load Percent', 'Status'],
                        'Hiring Manager': ['Manager Name', 'Email', 'Approved', 'Pending', 'Rejected'],
                        'Source Quality': ['Source', 'Candidates', 'Advanced', 'Hired', 'Conversion Rate'],
                        // Recruiter tabs
                        'My Open Reqs': ['Job Title', 'Department', 'Status', 'Days Open', 'Candidates'],
                        'Candidates in Pipeline': ['Name', 'Job Title', 'Stage', 'Application Date'],
                        'Screening': ['Name', 'Job Title', 'Status', 'Screening Date', 'Score'],
                        'Avg Interview Score': ['Name', 'Job Title', 'Interview Date', 'Score', 'Stage'],
                        'Submittal Quality': ['Job Title', 'Submitted', 'Advanced', 'Interview', 'Conversion Rate'],
                        'Sourcing Activity': ['Source', 'Contacted', 'Responses', 'Conversion Rate', 'Quality'],
                        // Director tabs
                        'Hiring Velocity': ['Month', 'Plan', 'Hires', 'Variance', 'Trend', 'Fill Rate'],
                        'Cost Per Hire': ['Quarter', 'Hired', 'Recruitment Cost', 'Job Board Cost', 'Agency Cost', 'Cost To Company', 'Client Revenue', 'Total Spend'],
                        'Recruitment ROI': ['Metric', 'Value', 'Period', 'Benchmark']
                      }
                      
                      if (defaultColumns[selectedKPI]) {
                        return defaultColumns[selectedKPI].map((col) => (
                          <TableHead key={col} className="font-semibold capitalize">{col}</TableHead>
                        ))
                      }
                      return null
                    })()}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getKPIDetails(selectedKPI).map((item: any, index: number) => (
                    <TableRow key={index} className="hover:bg-gray-50 text-xs">
                      {Object.entries(item).map(([key, value]: [string, any], cellIndex) => (
                        <TableCell key={cellIndex} className={cellIndex === 0 ? 'font-medium' : ''}>
                          {typeof value === 'string' && 
                           (value.includes('High') || value.includes('Critical') || value.includes('Overloaded')) ? (
                            <Badge variant="destructive" className="text-xs">{value}</Badge>
                          ) : typeof value === 'string' && 
                             (value.includes('Good') || value.includes('Excellent') || value.includes('up')) ? (
                            <span className="text-green-600 font-medium">{value}</span>
                          ) : typeof value === 'string' && 
                             (value.includes('Behind') || value.includes('down') || value.includes('Fair')) ? (
                            <span className="text-red-600 font-medium">{value}</span>
                          ) : typeof value === 'string' && value.includes('%') ? (
                            <span className="font-medium">{value}</span>
                          ) : (
                            value
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedKPI && (
        <Card className="p-8 text-center bg-gray-50">
          <div className="text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Click on any KPI card above to view detailed data</p>
            <p className="text-sm mt-2">Get insights into your metrics with drill-down views</p>
          </div>
        </Card>
      )}
      </>)}
    </div>
    </>
  )
}

'use client';

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
    id: string
    name: string
    email: string
    activeJobs: number
    activeCandidates: number
    totalHired: number
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
  const { company } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole>('recruiter')
  const [selectedRecruiter, setSelectedRecruiter] = useState('all')
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    // Fetch for recruiter and manager roles - Director uses static data
    if (selectedRole === 'director') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const params = company?.id ? `?companyId=${company.id}` : ''
      const res = await fetch(`/api/dashboard${params}`)
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
  }, [company?.id, selectedRole])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

const roleDescriptions = {
  recruiter: 'My Focus - Am I hitting my goals and keeping candidates moving?',
  manager: 'Team Effectiveness - How is my team performing and where can I help?',
  director: 'Strategic Impact & ROI - Is our TA strategy supporting business growth with quality hires?',
}

  const kpis = dashboardData?.kpis
  const recruiters = dashboardData?.recruiters || []

  // Build KPIs from real data
  const buildRoleKPIs = () => {
    // Static mock data for Manager and Director (but update Team Pipeline Health, Offer Acceptance Rate, and Team Capacity Load with real data)
    const totalTeamCandidates = dashboardData?.teamPipelineHealth?.reduce((sum, recruiter) => sum + recruiter.activeCandidates, 0) || 0
    const totalScreening = dashboardData?.teamPipelineHealth?.reduce((sum, recruiter) => sum + recruiter.activeCandidates, 0) || 0
    
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
    
    const managerKPIs = [
      { title: 'Team Pipeline Health', value: String(totalTeamCandidates), change: `${totalScreening} in screening`, trend: 'neutral' as const, icon: Users, color: 'orange' as const, subtitle: 'Total candidates across team' },
            { title: 'Offer Acceptance Rate', value: `${teamOfferRate}%`, change: 'Target: 80%', trend: teamOfferRate >= 80 ? 'up' as const : teamOfferRate >= 60 ? 'neutral' as const : 'down' as const, icon: MessageSquare, color: 'green' as const, subtitle: 'All time' },
      { title: 'Team Capacity Load', value: `${teamCapacityLoad}%`, change: `${overloadedRecruiter} overloaded`, trend: teamCapacityLoad > 100 ? 'down' as const : teamCapacityLoad >= 70 ? 'neutral' as const : 'up' as const, icon: Gauge, color: 'red' as const, subtitle: 'Team capacity utilization' },
      { title: 'Hiring Manager', value: hmRating, change: `${hmChangeNum > 0 ? '+' : ''}${hmChangeNum} vs last quarter`, trend: hmTrend, icon: MessageSquare, color: 'green' as const, subtitle: 'Hiring manager satisfaction score' },
      { title: 'Source Quality', value: 'LinkedIn', change: '42% conversion', trend: 'up' as const, icon: BarChart3, color: 'emerald' as const, subtitle: 'Best performing channel' },
    ]

    const directorKPIs = [
      { title: 'Hiring Velocity', value: '28', change: '234 total apps', trend: 'up' as const, icon: TrendingUp, color: 'orange' as const, subtitle: 'Total hires' },
      { title: 'Quality of Hire', value: '4.5', change: '92% retention @ 3mo', trend: 'up' as const, icon: MessageSquare, color: 'green' as const, subtitle: 'Performance rating + retention' },
            { title: 'Cost Per Hire', value: '$4,200', change: '+$300 vs last quarter', trend: 'up' as const, icon: DollarSign, color: 'orange' as const, subtitle: 'Average recruitment cost' },
      { title: 'Recruitment ROI', value: '3.2x', change: 'Quality/retention rising', trend: 'up' as const, icon: PieChart, color: 'green' as const, subtitle: 'Return on investment' },
      { title: 'Total Candidates', value: '342', change: '156 active', trend: 'neutral' as const, icon: Users, color: 'emerald' as const, subtitle: 'In database' },
    ]

    // Recruiter uses backend data
    if (selectedRole === 'recruiter') {
      if (!kpis) return []
      const submittedToInterview = kpis.totalApplications > 0
        ? Math.round((kpis.interviewCount / kpis.totalApplications) * 100)
        : 0

      return [
        { title: 'My Open Reqs', value: String(kpis.openJobs), change: `${kpis.draftJobs} drafts`, trend: kpis.openJobs > 0 ? 'neutral' as const : 'alert' as const, icon: Briefcase, color: 'emerald' as const, subtitle: 'Active open positions' },
        { title: 'Candidates in Pipeline', value: String(kpis.activeCandidates), change: `${kpis.newThisWeek} new this week`, trend: kpis.newThisWeek > 0 ? 'up' as const : 'neutral' as const, icon: Users, color: 'orange' as const, subtitle: 'Across all stages' },
        { title: 'Screening', value: String(kpis.screeningCount), change: `${kpis.interviewCount} in interview`, trend: 'neutral' as const, icon: Target, color: 'green' as const, subtitle: 'CV screening stage' },
        { title: 'Avg Interview Score', value: kpis.avgInterviewScore > 0 ? `${kpis.avgInterviewScore}` : 'N/A', change: `${kpis.interviewCount} interviewed`, trend: kpis.avgInterviewScore >= 70 ? 'up' as const : 'neutral' as const, icon: Clock, color: 'purple' as const, subtitle: 'Average AI interview score' },
        { title: 'Submittal Quality', value: `${submittedToInterview}%`, change: `${kpis.interviewCount} advanced`, trend: submittedToInterview >= 40 ? 'up' as const : 'down' as const, icon: CheckCircle, color: 'emerald' as const, subtitle: 'Screening to interview rate' },
        { title: 'Sourcing Activity', value: '87%', change: 'Target: 80%', trend: 'up' as const, icon: Activity, color: 'emerald' as const, subtitle: 'Current bottleneck' },
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
      calculation: 'Percentage of successful responses from outreach attempts across all sourcing channels this week.',
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
  }

  // Build KPI drill-down data from real API data (Recruiter/Manager) or static data (Director)
  const getKPIDetails = (kpiTitle: string): any[] => {
    // Static mock data for Manager and Director drill-downs (except Team Pipeline Health for Manager)
    if (selectedRole === 'manager') {
      // Use real data for Team Pipeline Health
      if (kpiTitle === 'Team Pipeline Health' && dashboardData?.teamPipelineHealth && dashboardData.teamPipelineHealth.length > 0) {
        return dashboardData.teamPipelineHealth.map(t => ({
          recruiter: t.name,
          email: t.email,
          activeJobs: t.activeJobs,
          activeCandidates: t.activeCandidates,
          totalHired: t.totalHired,
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
          approved: hm.approved,
          pending: hm.pending,
          rejected: hm.rejected
        }))
      }

      const managerDetails: Record<string, any[]> = {
        'Source Quality': [
          { source: 'LinkedIn', candidates: 85, advanced: 42, hired: 12, conversionRate: '42%' },
          { source: 'Indeed', candidates: 62, advanced: 28, hired: 8, conversionRate: '38%' },
          { source: 'Referrals', candidates: 24, advanced: 18, hired: 6, conversionRate: '75%' },
          { source: 'GitHub', candidates: 31, advanced: 15, hired: 2, conversionRate: '48%' },
        ],
      }
      return managerDetails[kpiTitle] || []
    }

    if (selectedRole === 'director') {
      const directorDetails: Record<string, any[]> = {
        'Hiring Velocity': [
          { month: 'January', hires: 8, plan: 7, variance: '+1', trend: 'up', fillRate: '114%' },
          { month: 'February', hires: 6, plan: 7, variance: '-1', trend: 'down', fillRate: '86%' },
          { month: 'March', hires: 10, plan: 7, variance: '+3', trend: 'up', fillRate: '143%' },
          { month: 'April (Projected)', hires: 5, plan: 7, variance: '-2', trend: 'down', fillRate: '71%' },
        ],
        'Quality of Hire': [
          { cohort: 'Q1 2024 Hires', avgRating: '4.5', retention3mo: '92%', performanceIndex: 'High', count: 24 },
          { cohort: 'Q4 2023 Hires', avgRating: '4.3', retention3mo: '88%', performanceIndex: 'Medium-High', count: 18 },
          { cohort: 'Q3 2023 Hires', avgRating: '4.6', retention3mo: '94%', performanceIndex: 'High', count: 21 },
          { cohort: 'Q2 2023 Hires', avgRating: '4.2', retention3mo: '85%', performanceIndex: 'Medium', count: 19 },
        ],
                'Cost Per Hire': [
          { 
            quarter: 'Q1 2024', 
            hired: 30, 
            recruitmentCost: 30000, 
            jobBoardCost: 3000, 
            agencyCost: 100000, 
            costToCompany: 133000, 
            clientRevenue: 200000, 
            totalSpend: -67000 
          },
        ],
        'Recruitment ROI': [
          { metric: 'Investment', value: '$320K', period: 'Annual', benchmark: 'Industry Avg' },
          { metric: 'Value Created', value: '$1.02M', period: 'Annual', benchmark: '3.2x ROI' },
          { metric: 'Quality Score', value: '4.5/5', period: 'YTD', benchmark: 'Top Quartile' },
          { metric: 'Retention Impact', value: '92%', period: '6 months', benchmark: 'Above Target' },
        ],
        'Total Candidates': [
          { total: 342, active: 156, hired: 28, rejected: 158 },
        ],
      }
      return directorDetails[kpiTitle] || []
    }

    // Recruiter uses backend data
    if (!dashboardData) return []

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
        experience: c.experience,
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
        status: c.status,
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
      'Team Pipeline Health': (dashboardData.recruiters || []).map(r => ({
        recruiter: r.name,
        activeJobs: r.activeJobs,
        activeCandidates: r.activeCandidates,
        totalHired: r.hiredCount || 0,
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
      <div className="space-y-4 p-4">
      {/* Header with Role Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">{roleDescriptions[selectedRole]}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">View as:</span>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="director">Director</SelectItem>
            </SelectContent>
          </Select>
          {selectedRole === 'recruiter' && (
            <>
              <span className="text-sm text-gray-400">|</span>
              <Select value={selectedRecruiter} onValueChange={setSelectedRecruiter}>
                <SelectTrigger className="w-[160px]">
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
        </div>
      </div>

      {/* Loading State */}
      {loading && <StatCardGridLoader count={6} />}

      {/* Error State */}
      {!loading && error && <ErrorState message={error} onRetry={fetchDashboard} />}

      {/* Role-Based KPI Cards - Compact */}
      {!loading && !error && (<>
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-1.5 justify-items-stretch ${
          currentKPIs.length === 6 ? 'lg:grid-cols-6 xl:grid-cols-6' : 'lg:grid-cols-5 xl:grid-cols-5'
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 text-xs">
                    {getKPIDetails(selectedKPI).length > 0 && 
                      Object.keys(getKPIDetails(selectedKPI)[0]).map((key) => (
                        <TableHead key={key} className="font-semibold capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </TableHead>
                      ))
                    }
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

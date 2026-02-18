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
  recruiters: Array<{
    id: string
    name: string
    email: string
    activeJobs: number
    activeCandidates: number
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
  const { company } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole>('recruiter')
  const [selectedRecruiter, setSelectedRecruiter] = useState('all')
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
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
  }, [company?.id])

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
    if (!kpis) return []
    const submittedToInterview = kpis.totalApplications > 0
      ? Math.round((kpis.interviewCount / kpis.totalApplications) * 100)
      : 0
    const bottleneckStage = dashboardData?.stageTimeAvgs?.[0]

    const recruiterKPIs = [
      { title: 'My Open Reqs', value: String(kpis.openJobs), change: `${kpis.draftJobs} drafts`, trend: kpis.openJobs > 0 ? 'neutral' as const : 'alert' as const, icon: Briefcase, color: 'blue' as const, subtitle: 'Active open positions' },
      { title: 'Candidates in Pipeline', value: String(kpis.activeCandidates), change: `${kpis.newThisWeek} new this week`, trend: kpis.newThisWeek > 0 ? 'up' as const : 'neutral' as const, icon: Users, color: 'orange' as const, subtitle: 'Across all stages' },
      { title: 'Screening', value: String(kpis.screeningCount), change: `${kpis.interviewCount} in interview`, trend: 'neutral' as const, icon: Target, color: 'green' as const, subtitle: 'CV screening stage' },
      { title: 'Avg Interview Score', value: kpis.avgInterviewScore > 0 ? `${kpis.avgInterviewScore}` : 'N/A', change: `${kpis.interviewCount} interviewed`, trend: kpis.avgInterviewScore >= 70 ? 'up' as const : 'neutral' as const, icon: Clock, color: 'purple' as const, subtitle: 'Average AI interview score' },
      { title: 'Submittal Quality', value: `${submittedToInterview}%`, change: `${kpis.interviewCount} advanced`, trend: submittedToInterview >= 40 ? 'up' as const : 'down' as const, icon: CheckCircle, color: 'emerald' as const, subtitle: 'Screening to interview rate' },
      { title: 'Time in Stage (Avg)', value: bottleneckStage ? `${bottleneckStage.avgDays}d` : 'N/A', change: bottleneckStage ? bottleneckStage.stage : 'No data', trend: bottleneckStage?.bottleneck ? 'alert' as const : 'neutral' as const, icon: Activity, color: 'blue' as const, subtitle: 'Current bottleneck' },
    ]

    const bestSource = dashboardData?.sourceEffectiveness?.[0]
    const managerKPIs = [
      { title: 'Team Pipeline Health', value: String(kpis.activeCandidates), change: `${kpis.screeningCount} in screening`, trend: kpis.activeCandidates > 0 ? 'neutral' as const : 'alert' as const, icon: Users, color: 'orange' as const, subtitle: 'Total candidates across team' },
      { title: 'Time to Fill (Avg)', value: kpis.avgTimeToFill > 0 ? `${kpis.avgTimeToFill}d` : 'N/A', change: 'Target: 28d', trend: kpis.avgTimeToFill > 28 ? 'down' as const : 'up' as const, icon: Clock, color: kpis.avgTimeToFill > 28 ? 'red' as const : 'green' as const, subtitle: 'Team average' },
      { title: 'Offer Acceptance Rate', value: `${kpis.offerAcceptanceRate}%`, change: 'Target: 80%', trend: kpis.offerAcceptanceRate >= 80 ? 'up' as const : 'down' as const, icon: MessageSquare, color: kpis.offerAcceptanceRate >= 80 ? 'green' as const : 'orange' as const, subtitle: 'All time' },
      { title: 'Team Capacity', value: `${kpis.teamMembers}`, change: `${kpis.openJobs} open reqs`, trend: kpis.openJobs > kpis.teamMembers * 6 ? 'alert' as const : 'neutral' as const, icon: Gauge, color: kpis.openJobs > kpis.teamMembers * 6 ? 'red' as const : 'green' as const, subtitle: 'Active team members' },
      { title: 'Total Hired', value: String(kpis.hiredCount), change: `${kpis.rejectedCount} rejected`, trend: kpis.hiredCount > 0 ? 'up' as const : 'neutral' as const, icon: MessageSquare, color: 'green' as const, subtitle: 'All time hires' },
      { title: 'Source Quality', value: bestSource ? bestSource.source : 'N/A', change: bestSource ? `${bestSource.conversionRate}% conversion` : 'No data', trend: 'up' as const, icon: BarChart3, color: 'blue' as const, subtitle: 'Best performing channel' },
    ]

    const directorKPIs = [
      { title: 'Hiring Velocity', value: String(kpis.hiredCount), change: `${kpis.totalApplications} total apps`, trend: kpis.hiredCount > 0 ? 'up' as const : 'down' as const, icon: TrendingUp, color: 'orange' as const, subtitle: 'Total hires' },
      { title: 'Avg Interview Score', value: kpis.avgInterviewScore > 0 ? `${kpis.avgInterviewScore}/100` : 'N/A', change: `${kpis.interviewCount} interviews`, trend: kpis.avgInterviewScore >= 70 ? 'up' as const : 'neutral' as const, icon: MessageSquare, color: 'green' as const, subtitle: 'Quality indicator' },
      { title: 'Pipeline Conversion', value: kpis.totalApplications > 0 ? `${Math.round((kpis.hiredCount / kpis.totalApplications) * 100)}%` : '0%', change: `${kpis.offerCount} in offer stage`, trend: 'neutral' as const, icon: LineChart, color: 'blue' as const, subtitle: 'Application to hire rate' },
      { title: 'Open Positions', value: String(kpis.openJobs), change: `${kpis.closedJobs} closed`, trend: 'neutral' as const, icon: DollarSign, color: 'orange' as const, subtitle: 'Active job postings' },
      { title: 'Offer Acceptance', value: `${kpis.offerAcceptanceRate}%`, change: 'Target: 80%', trend: kpis.offerAcceptanceRate >= 80 ? 'up' as const : 'down' as const, icon: PieChart, color: kpis.offerAcceptanceRate >= 80 ? 'green' as const : 'orange' as const, subtitle: 'Offer acceptance rate' },
      { title: 'Total Candidates', value: String(kpis.totalCandidates), change: `${kpis.activeCandidates} active`, trend: 'neutral' as const, icon: Users, color: 'blue' as const, subtitle: 'In database' },
    ]

    if (selectedRole === 'recruiter') return recruiterKPIs
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
    'Time in Stage (Avg)': {
      calculation: 'Average number of days candidates spend in each stage.',
      dataContext: 'Stage-by-stage breakdown identifying bottlenecks.',
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
    'Team Capacity': {
      calculation: 'Number of active team members and their workload.',
      dataContext: 'Per-recruiter active jobs and candidates.',
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

  // Build KPI drill-down data from real API data
  const getKPIDetails = (kpiTitle: string): any[] => {
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
      'Time in Stage (Avg)': (dashboardData.stageTimeAvgs || []).map(s => ({
        stage: s.stage,
        avgDays: `${s.avgDays}d`,
        bottleneck: s.bottleneck ? 'Yes' : 'No',
      })),
      'Team Pipeline Health': (dashboardData.recruiters || []).map(r => ({
        recruiter: r.name,
        activeJobs: r.activeJobs,
        activeCandidates: r.activeCandidates,
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
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {currentKPIs.map((kpi) => {
          const Icon = kpi.icon
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-700',
            green: 'bg-green-100 text-green-700',
            emerald: 'bg-emerald-100 text-emerald-700',
            purple: 'bg-purple-100 text-purple-700',
            orange: 'bg-orange-100 text-orange-700',
            red: 'bg-red-100 text-red-700',
          }[kpi.color]

          const getTrendIcon = () => {
            if (kpi.trend === 'up') return <TrendingUp className="w-3 h-3 text-green-600" />
            if (kpi.trend === 'down') return <TrendingDown className="w-3 h-3 text-red-600" />
            if (kpi.trend === 'alert') return <AlertCircle className="w-3 h-3 text-orange-600" />
            return <Activity className="w-3 h-3 text-gray-600" />
          }

          return (
            <Card 
              key={kpi.title} 
              className={`hover:shadow-lg transition-all cursor-pointer ${
                selectedKPI === kpi.title ? 'ring-2 ring-blue-600 shadow-lg' : ''
              }`}
              onClick={() => setSelectedKPI(selectedKPI === kpi.title ? null : kpi.title)}
            >
              <CardContent className="p-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-gray-600 mb-0.5 truncate">
                      {kpi.title}
                    </div>
                    <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                  </div>
                  <div className={`w-7 h-7 ${colorClasses} rounded-md flex items-center justify-center shrink-0 ml-1`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-[10px]">
                  {getTrendIcon()}
                  <span className={`font-medium truncate ${
                    kpi.trend === 'up' ? 'text-green-600' : 
                    kpi.trend === 'down' ? 'text-red-600' : 
                    kpi.trend === 'alert' ? 'text-orange-600' : 
                    'text-gray-600'
                  }`}>
                    {kpi.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* KPI Detail View */}
      {selectedKPI && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50 pb-2">
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
              <div className="mb-2 p-2 bg-blue-50 border-l-2 border-blue-500 rounded text-xs">
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
  )
}

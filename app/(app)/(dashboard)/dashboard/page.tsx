'use client';

import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import { useState } from "react"
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

type UserRole = 'recruiter' | 'manager' | 'director'

// Recruiters list
const recruiters = [
  { id: '1', name: 'Sarah Johnson' },
  { id: '2', name: 'Mike Davis' },
  { id: '3', name: 'Emily Chen' },
  { id: '4', name: 'John Williams' },
]

// Role-based KPI configurations
const roleKPIs = {
  recruiter: [
    { title: 'My Open Reqs', value: '8', change: '+2 this week', trend: 'neutral', icon: Briefcase, color: 'blue', subtitle: 'Active roles assigned to me' },
    { title: 'Candidates in Pipeline', value: '42', change: '12 need action', trend: 'alert', icon: Users, color: 'orange', subtitle: 'Across all stages' },
    { title: 'Sourcing Activity', value: '87%', change: 'Target: 80%', trend: 'up', icon: Target, color: 'green', subtitle: 'Outreach & responses this week' },
    { title: 'Avg Response Time', value: '2.3h', change: '-0.5h vs last week', trend: 'up', icon: Clock, color: 'purple', subtitle: 'To candidate inquiries' },
    { title: 'Submittal Quality', value: '45%', change: '+5% improvement', trend: 'up', icon: CheckCircle, color: 'emerald', subtitle: 'Submissions to interview rate' },
    { title: 'Time in Stage (Avg)', value: '4.2d', change: 'Interview stage', trend: 'neutral', icon: Activity, color: 'blue', subtitle: 'Current bottleneck' },
  ],
  manager: [
    { title: 'Team Pipeline Health', value: '156', change: '23 in bottleneck', trend: 'alert', icon: Users, color: 'orange', subtitle: 'Total candidates across team' },
    { title: 'Time to Fill (Avg)', value: '32d', change: 'Target: 28d', trend: 'down', icon: Clock, color: 'red', subtitle: 'Team average this quarter' },
    { title: 'Offer Acceptance Rate', value: '72%', change: 'Target: 80%', trend: 'down', icon: MessageSquare, color: 'orange', subtitle: 'Last 30 days' },
    { title: 'Team Capacity Load', value: '135%', change: 'Recruiter A overloaded', trend: 'alert', icon: Gauge, color: 'red', subtitle: 'Avg load per recruiter' },
    { title: 'HM Satisfaction', value: '4.2', change: '+0.3 vs last quarter', trend: 'up', icon: MessageSquare, color: 'green', subtitle: 'Out of 5.0' },
    { title: 'Source Quality (Team)', value: 'GitHub', change: '3x more effective', trend: 'up', icon: BarChart3, color: 'blue', subtitle: 'Best performing channel' },
  ],
  director: [
    { title: 'Hiring Velocity', value: '24', change: 'Plan: 28/month', trend: 'down', icon: TrendingUp, color: 'orange', subtitle: 'Hires this month vs plan' },
    { title: 'Quality of Hire', value: '4.5', change: '92% retention @ 6mo', trend: 'up', icon: MessageSquare, color: 'green', subtitle: 'Performance rating avg' },
    { title: 'Forecast vs Actual', value: '85%', change: 'Q3 projection: -15%', trend: 'alert', icon: LineChart, color: 'red', subtitle: 'On track to miss headcount' },
    { title: 'Cost Per Hire', value: '$4,200', change: '+$300 vs last quarter', trend: 'down', icon: DollarSign, color: 'orange', subtitle: 'Total TA cost trend' },
    { title: 'Recruitment ROI', value: '3.2x', change: 'Quality/retention rising', trend: 'up', icon: PieChart, color: 'green', subtitle: 'Investment effectiveness' },
    { title: 'Diversity Pipeline', value: '42%', change: 'Target: 50%', trend: 'neutral', icon: Users, color: 'blue', subtitle: 'Underrepresented groups' },
  ],
}

const recentCandidates = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    position: 'Senior Frontend Developer',
    status: 'Interview',
    experience: '5 years',
    appliedDate: '2 hours ago',
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'mchen@email.com',
    position: 'Product Manager',
    status: 'Screening',
    experience: '7 years',
    appliedDate: '5 hours ago',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    position: 'UX Designer',
    status: 'Offer',
    experience: '4 years',
    appliedDate: '1 day ago',
  },
  {
    id: 4,
    name: 'David Kim',
    email: 'david.kim@email.com',
    position: 'Backend Engineer',
    status: 'New',
    experience: '6 years',
    appliedDate: '2 days ago',
  },
  {
    id: 5,
    name: 'Jessica Brown',
    email: 'jbrown@email.com',
    position: 'Data Scientist',
    status: 'Hired',
    experience: '8 years',
    appliedDate: '3 days ago',
  },
]

const upcomingInterviews = [
  {
    candidate: 'Sarah Johnson',
    position: 'Senior Frontend Developer',
    time: 'Today, 2:00 PM',
    type: 'Technical Interview',
    interviewer: 'John Smith',
  },
  {
    candidate: 'Michael Chen',
    position: 'Product Manager',
    time: 'Today, 4:30 PM',
    type: 'Behavioral Interview',
    interviewer: 'Jane Doe',
  },
  {
    candidate: 'Emily Rodriguez',
    position: 'UX Designer',
    time: 'Tomorrow, 10:00 AM',
    type: 'Portfolio Review',
    interviewer: 'Alex Wilson',
  },
]

const getStatusBadge = (status: string) => {
  const variants: Record<string, { className: string }> = {
    New: { className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    Screening: { className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
    Interview: { className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
    Offer: { className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    Hired: { className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    Rejected: { className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  }
  return variants[status] || variants.New
}

const statsCards = [
  // Example stats card data
  { title: 'Example Card', value: '100', change: '+10 this week', trend: 'up', icon: Briefcase, color: 'blue', subtitle: 'Example subtitle' },
]

  export default function DashboardPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('recruiter')
  const [selectedRecruiter, setSelectedRecruiter] = useState('all')
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)

const roleDescriptions = {
  recruiter: 'My Focus - Am I hitting my goals and keeping candidates moving?',
  manager: 'Team Effectiveness - How is my team performing and where can I help?',
  director: 'Strategic Impact & ROI - Is our TA strategy supporting business growth with quality hires?',
}

  const currentKPIs = roleKPIs[selectedRole]

  // KPI calculation explanations
  const kpiExplanations: Record<string, { calculation: string; dataContext: string }> = {
    'My Open Reqs': {
      calculation: 'Count of all active job requisitions currently assigned to you that are accepting applications.',
      dataContext: 'Each row shows a job posting with days open, number of candidates in pipeline, and current status.',
    },
    'Candidates in Pipeline': {
      calculation: 'Total number of active candidates across all stages of your assigned roles, excluding rejected/hired.',
      dataContext: 'Shows each candidate, their current stage, days in that stage, and priority level for action.',
    },
    'Sourcing Activity': {
      calculation: 'Percentage of successful responses from outreach attempts across all sourcing channels this week.',
      dataContext: 'Breakdown by channel showing outreach volume, responses received, conversion rates, and quality assessment.',
    },
    'Avg Response Time': {
      calculation: 'Average time taken to respond to candidate inquiries, calculated from inquiry timestamp to response sent.',
      dataContext: 'Response times by inquiry type with volume count and performance against target SLA.',
    },
    'Submittal Quality': {
      calculation: 'Percentage of submitted candidates who advance to interview stage (Submissions → Interviews ratio).',
      dataContext: 'Shows submittal-to-interview conversion rate by position with trend indicators.',
    },
    'Time in Stage (Avg)': {
      calculation: 'Average number of days candidates spend in each stage before moving to next stage or disposition.',
      dataContext: 'Stage-by-stage breakdown identifying bottlenecks where candidates are spending excessive time.',
    },
    'Team Pipeline Health': {
      calculation: 'Aggregate view of team capacity showing total candidates managed and stages with delays (bottlenecks).',
      dataContext: 'Per-recruiter metrics showing workload, bottleneck count, average stage time, and overall efficiency rating.',
    },
    'Time to Fill (Avg)': {
      calculation: 'Average days from job posting date to offer acceptance, measured across all closed positions.',
      dataContext: 'Time to fill by position type compared to target goals with variance and status indicators.',
    },
    'Offer Acceptance Rate': {
      calculation: 'Percentage of offers extended that are accepted by candidates (Accepted Offers ÷ Total Offers).',
      dataContext: 'Monthly trend showing offers made, acceptances, rate percentage, and directional trend.',
    },
    'Team Capacity Load': {
      calculation: 'Team capacity utilization as percentage (Active Reqs ÷ Standard Capacity × 100). Over 100% indicates overload.',
      dataContext: 'Individual recruiter workloads showing active requisitions vs capacity with load percentage and status flags.',
    },
    'HM Satisfaction': {
      calculation: 'Average satisfaction rating from hiring manager surveys on a 5-point scale, weighted by recency.',
      dataContext: 'Satisfaction scores by hiring manager with verbatim feedback and survey timing.',
    },
    'Source Quality (Team)': {
      calculation: 'Effectiveness ranking of sourcing channels based on interview rate and offer rate combined metrics.',
      dataContext: 'Channel performance showing candidate volume, interview conversion, offer conversion, and effectiveness rating.',
    },
    'Hiring Velocity': {
      calculation: 'Number of hires completed per month compared to hiring plan targets.',
      dataContext: 'Monthly hiring performance vs plan with variance calculation and fill rate percentage.',
    },
    'Quality of Hire': {
      calculation: 'Average performance rating of new hires combined with 6-month retention rate as quality indicator.',
      dataContext: 'Cohort analysis showing performance ratings, retention metrics, and quality index by hiring period.',
    },
    'Forecast vs Actual': {
      calculation: 'Comparison of forecasted headcount growth vs actual hires closed, showing plan attainment percentage.',
      dataContext: 'Departmental forecast accuracy with variance from plan and business impact assessment.',
    },
    'Cost Per Hire': {
      calculation: 'Total recruitment costs divided by number of hires (Agency fees + Job boards + Internal costs ÷ Hires).',
      dataContext: 'Quarterly cost trends showing per-hire expense, total hiring volume, and aggregate spend.',
    },
    'Recruitment ROI': {
      calculation: 'Value created by quality hires divided by total recruitment investment (Quality × Retention ÷ Cost).',
      dataContext: 'ROI components showing investment, value created, quality metrics, and retention impact.',
    },
    'Diversity Pipeline': {
      calculation: 'Percentage of candidates from underrepresented groups in active pipeline compared to target goals.',
      dataContext: 'Diversity metrics by category showing current percentage, candidate count, target, and progress trend.',
    },
  }

  // Comprehensive data for all KPI drill-downs
  const getKPIDetails = (kpiTitle: string) => {
    const detailData: Record<string, any[]> = {
      // Recruiter KPIs
      'My Open Reqs': [
        { position: 'Senior Full Stack Developer', department: 'Engineering', openDays: 12, candidates: 8, status: 'Active' },
        { position: 'Product Manager', department: 'Product', openDays: 8, candidates: 5, status: 'Active' },
        { position: 'UX Designer', department: 'Design', openDays: 15, candidates: 12, status: 'Active' },
        { position: 'DevOps Engineer', department: 'Engineering', openDays: 5, candidates: 3, status: 'Active' },
      ],
      'Candidates in Pipeline': [
        { name: 'Sarah Chen', position: 'Senior Developer', stage: 'CV Screening', daysInStage: 2, priority: 'High' },
        { name: 'Michael Brown', position: 'Product Manager', stage: 'AI Interview', daysInStage: 1, priority: 'Medium' },
        { name: 'Emma Wilson', position: 'UX Designer', stage: 'Hiring Manager', daysInStage: 5, priority: 'High' },
        { name: 'John Davis', position: 'DevOps Engineer', stage: 'Offer Stage', daysInStage: 3, priority: 'High' },
      ],
      'Sourcing Activity': [
        { channel: 'LinkedIn', outreach: 45, responses: 38, conversionRate: '84%', quality: 'High' },
        { channel: 'GitHub', outreach: 32, responses: 28, conversionRate: '87%', quality: 'High' },
        { channel: 'Indeed', outreach: 28, responses: 18, conversionRate: '64%', quality: 'Medium' },
        { channel: 'Referrals', outreach: 12, responses: 11, conversionRate: '92%', quality: 'High' },
      ],
      'Avg Response Time': [
        { inquiryType: 'Application Status', avgTime: '1.5h', count: 23, target: '2h', status: 'Good' },
        { inquiryType: 'Interview Scheduling', avgTime: '2.8h', count: 15, target: '3h', status: 'Good' },
        { inquiryType: 'General Questions', avgTime: '3.2h', count: 18, target: '4h', status: 'Good' },
        { inquiryType: 'Offer Discussions', avgTime: '1.2h', count: 8, target: '2h', status: 'Excellent' },
      ],
      'Submittal Quality': [
        { position: 'Senior Developer', submitted: 12, interviewed: 8, rate: '67%', trend: 'up' },
        { position: 'Product Manager', submitted: 8, interviewed: 5, rate: '62%', trend: 'stable' },
        { position: 'UX Designer', submitted: 15, interviewed: 7, rate: '47%', trend: 'down' },
        { position: 'DevOps Engineer', submitted: 6, interviewed: 4, rate: '67%', trend: 'up' },
      ],
      'Time in Stage (Avg)': [
        { stage: 'CV Screening', avgDays: '2.3d', count: 18, bottleneck: false },
        { stage: 'AI Interview', avgDays: '3.1d', count: 12, bottleneck: false },
        { stage: 'Hiring Manager', avgDays: '6.8d', count: 8, bottleneck: true },
        { stage: 'Offer Stage', avgDays: '2.5d', count: 3, bottleneck: false },
      ],
      
      // Manager KPIs
      'Team Pipeline Health': [
        { recruiter: 'Sarah Johnson', totalCandidates: 42, bottlenecks: 8, avgTimeInStage: '4.2d', efficiency: '85%' },
        { recruiter: 'Mike Davis', totalCandidates: 38, bottlenecks: 5, avgTimeInStage: '3.8d', efficiency: '90%' },
        { recruiter: 'Jennifer Chen', totalCandidates: 45, bottlenecks: 10, avgTimeInStage: '5.1d', efficiency: '78%' },
        { recruiter: 'Alex Kumar', totalCandidates: 31, bottlenecks: 3, avgTimeInStage: '3.5d', efficiency: '92%' },
      ],
      'Time to Fill (Avg)': [
        { position: 'Engineering Roles', avgDays: 35, target: 28, variance: '+7', status: 'Behind' },
        { position: 'Product Roles', avgDays: 28, target: 28, variance: '0', status: 'On Track' },
        { position: 'Design Roles', avgDays: 42, target: 28, variance: '+14', status: 'Critical' },
        { position: 'Sales Roles', avgDays: 25, target: 28, variance: '-3', status: 'Ahead' },
      ],
      'Offer Acceptance Rate': [
        { month: 'January', offers: 8, accepted: 6, rate: '75%', trend: 'up' },
        { month: 'February', offers: 10, accepted: 7, rate: '70%', trend: 'down' },
        { month: 'March', offers: 12, accepted: 9, rate: '75%', trend: 'up' },
        { month: 'April (MTD)', offers: 5, accepted: 3, rate: '60%', trend: 'down' },
      ],
      'Team Capacity Load': [
        { recruiter: 'Sarah Johnson', activeReqs: 8, capacity: 6, loadPercent: '133%', status: 'Overloaded' },
        { recruiter: 'Mike Davis', activeReqs: 7, capacity: 6, loadPercent: '117%', status: 'High' },
        { recruiter: 'Jennifer Chen', activeReqs: 9, capacity: 6, loadPercent: '150%', status: 'Critical' },
        { recruiter: 'Alex Kumar', activeReqs: 5, capacity: 6, loadPercent: '83%', status: 'Optimal' },
      ],
      'HM Satisfaction': [
        { hiringManager: 'David Lee (Eng)', rating: 4.5, feedback: 'Excellent communication', lastSurvey: '2 weeks ago' },
        { hiringManager: 'Maria Garcia (Product)', rating: 4.2, feedback: 'Good quality candidates', lastSurvey: '1 week ago' },
        { hiringManager: 'Tom Wilson (Design)', rating: 3.8, feedback: 'Needs faster response', lastSurvey: '3 days ago' },
        { hiringManager: 'Lisa Chen (Sales)', rating: 4.6, feedback: 'Outstanding service', lastSurvey: '1 week ago' },
      ],
      'Source Quality (Team)': [
        { source: 'GitHub', candidates: 45, interviewRate: '78%', offerRate: '42%', effectiveness: 'Excellent' },
        { source: 'LinkedIn', candidates: 82, interviewRate: '52%', offerRate: '28%', effectiveness: 'Good' },
        { source: 'Referrals', candidates: 28, interviewRate: '85%', offerRate: '55%', effectiveness: 'Excellent' },
        { source: 'Indeed', candidates: 64, interviewRate: '38%', offerRate: '15%', effectiveness: 'Fair' },
      ],
      
      // Director KPIs
      'Hiring Velocity': [
        { month: 'January', hires: 8, plan: 7, variance: '+1', trend: 'up', fillRate: '114%' },
        { month: 'February', hires: 6, plan: 7, variance: '-1', trend: 'down', fillRate: '86%' },
        { month: 'March', hires: 10, plan: 7, variance: '+3', trend: 'up', fillRate: '143%' },
        { month: 'April (Projected)', hires: 5, plan: 7, variance: '-2', trend: 'down', fillRate: '71%' },
      ],
      'Quality of Hire': [
        { cohort: 'Q1 2024 Hires', avgRating: 4.5, retention6mo: '92%', performanceIndex: 'High', count: 24 },
        { cohort: 'Q4 2023 Hires', avgRating: 4.3, retention6mo: '88%', performanceIndex: 'Medium-High', count: 18 },
        { cohort: 'Q3 2023 Hires', avgRating: 4.6, retention6mo: '94%', performanceIndex: 'High', count: 21 },
        { cohort: 'Q2 2023 Hires', avgRating: 4.2, retention6mo: '85%', performanceIndex: 'Medium', count: 19 },
      ],
      'Forecast vs Actual': [
        { department: 'Engineering', forecast: 12, actual: 9, variance: '-25%', impact: 'High' },
        { department: 'Product', forecast: 6, actual: 5, variance: '-17%', impact: 'Medium' },
        { department: 'Sales', forecast: 10, actual: 11, variance: '+10%', impact: 'Low' },
        { department: 'Design', forecast: 4, actual: 3, variance: '-25%', impact: 'Medium' },
      ],
      'Cost Per Hire': [
        { quarter: 'Q1 2024', cost: '$4,200', volume: 24, totalSpend: '$100,800', trend: 'up' },
        { quarter: 'Q4 2023', cost: '$3,900', volume: 18, totalSpend: '$70,200', trend: 'stable' },
        { quarter: 'Q3 2023', cost: '$3,750', volume: 21, totalSpend: '$78,750', trend: 'down' },
        { quarter: 'Q2 2023', cost: '$4,100', volume: 19, totalSpend: '$77,900', trend: 'up' },
      ],
      'Recruitment ROI': [
        { metric: 'Investment', value: '$320K', period: 'Annual', benchmark: 'Industry Avg' },
        { metric: 'Value Created', value: '$1.02M', period: 'Annual', benchmark: '3.2x ROI' },
        { metric: 'Quality Score', value: '4.5/5', period: 'YTD', benchmark: 'Top Quartile' },
        { metric: 'Retention Impact', value: '92%', period: '6 months', benchmark: 'Above Target' },
      ],
      'Diversity Pipeline': [
        { category: 'Women in Tech', percentage: '45%', count: 38, target: '50%', trend: 'up' },
        { category: 'Underrepresented Minorities', percentage: '38%', count: 32, target: '40%', trend: 'stable' },
        { category: 'Veterans', percentage: '12%', count: 10, target: '10%', trend: 'up' },
        { category: 'LGBTQ+', percentage: '15%', count: 13, target: '15%', trend: 'stable' },
      ],
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

      {/* Role-Based KPI Cards - Compact */}
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
    </div>
  )
}

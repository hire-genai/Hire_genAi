'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
	Search,
	Plus,
	Briefcase,
	MapPin,
	DollarSign,
	Users,
	Clock,
	Eye,
	FolderOpen,
	FolderClosed,
	PauseCircle,
	XCircle,
	FileEdit,
	Database,
	Filter,
	Loader2,
	RefreshCw,
	Share2,
	Check,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMobileMenu } from '@/components/dashboard/mobile-menu-context'
import { JobPostingForm } from '@/components/dashboard/job-posting-form'
import { useAuth } from '@/contexts/auth-context'

type JobStatusType = 'all' | 'open' | 'closed' | 'onhold' | 'cancelled' | 'draft'
type UserRole = 'recruiter' | 'admin' | 'manager' | 'director'

interface Job {
	id: string
	title: string
	department: string
	location: string
	type: string
	salary: string
	applicants: number
	status: string
	recruiter: string
	posted: string
	companySlug: string
	description?: string
	workMode?: string
	jobOpenDate?: string
	applicationDeadline?: string
	expectedStartDate?: string
	salaryMin?: number | null
	salaryMax?: number | null
	currency?: string
	responsibilities?: string[]
	requiredSkills?: string[]
	preferredSkills?: string[]
	experienceYears?: string
	requiredEducation?: string
	certificationsRequired?: string
	languagesRequired?: string
	recruiterAssigned?: string
	hiringManager?: string
	hiringManagerEmail?: string
	interviewPanelMembers?: string[]
	numberOfOpenings?: string
	hiringPriority?: string
	targetTimeToFill?: string
	budgetAllocated?: string
	targetSources?: string[]
	diversityGoals?: boolean
	diversityTargetPercentage?: string
	selectedCriteriaIds?: string[]
	generatedQuestions?: any[]
	expectedHiresPerMonth?: string
	targetOfferAcceptanceRate?: string
	candidateResponseTimeSLA?: string
	interviewScheduleSLA?: string
	costPerHireBudget?: string
	agencyFeePercentage?: string
	jobBoardCosts?: string
	autoScheduleInterview?: boolean
	interviewLinkExpiryHours?: number
	enableScreeningQuestions?: boolean
	screeningQuestions?: any
	stages: {
		cvScreened: number
		aiInterview: number
		hiringManager: number
		offerStage: number
		hired: number
		rejected: number
	}
}

export default function JobsPage() {
	const { company } = useAuth()
	const [activeStatus, setActiveStatus] = useState<JobStatusType>('all')
	const [searchQuery, setSearchQuery] = useState('')
	const [departmentFilter, setDepartmentFilter] = useState('all')
	const [locationFilter, setLocationFilter] = useState('all')
	const [recruiterFilter, setRecruiterFilter] = useState('all')
	const { setIsCollapsed } = useMobileMenu()
	const [showJobPostingDialog, setShowJobPostingDialog] = useState(false)
	const [viewAsRole, setViewAsRole] = useState<UserRole>('recruiter')
	const [viewAsRecruiter, setViewAsRecruiter] = useState('all')
	const [jobFormInitialData, setJobFormInitialData] = useState<any>(null)
	const [jobFormMode, setJobFormMode] = useState<'create' | 'view'>('create')
	const [jobFormJobId, setJobFormJobId] = useState<string | null>(null)
	const [jobFormCompanySlug, setJobFormCompanySlug] = useState<string | null>(null)
	
	// Data fetching states
	const [jobs, setJobs] = useState<Job[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [copiedJobId, setCopiedJobId] = useState<string | null>(null)
	
	// Permission check - only recruiters can modify
	const canModify = viewAsRole === 'recruiter'

	// Copy JD link to clipboard
	const copyJDLink = async (job: Job) => {
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
		const jdLink = `${baseUrl}/jobs/${job.companySlug}/${job.id}`
		
		try {
			await navigator.clipboard.writeText(jdLink)
			setCopiedJobId(job.id)
			setTimeout(() => setCopiedJobId(null), 2000) // Reset after 2 seconds
		} catch (err) {
			console.error('Failed to copy link:', err)
		}
	}

	// Format date to relative time
	const formatRelativeTime = (dateString: string) => {
		if (!dateString) return 'Just now'
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
		
		if (diffDays === 0) return 'Today'
		if (diffDays === 1) return '1 day ago'
		if (diffDays < 7) return `${diffDays} days ago`
		if (diffDays < 14) return '1 week ago'
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
		return `${Math.floor(diffDays / 30)} months ago`
	}

	// Format salary range
	const formatSalary = (min: number | null, max: number | null, currency: string) => {
		if (!min && !max) return 'Not specified'
		const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 })
		if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
		if (min) return `From ${formatter.format(min)}`
		if (max) return `Up to ${formatter.format(max)}`
		return 'Not specified'
	}

	// Fetch jobs from API
	const fetchJobs = useCallback(async () => {
		if (!company?.id) return
		setIsLoading(true)
		setError(null)
		
		try {
			const response = await fetch(`/api/jobs?companyId=${company.id}`)
			const result = await response.json()
			
			if (!response.ok) {
				throw new Error(result.error || 'Failed to fetch jobs')
			}
			
			// Map API response to UI format
			const mappedJobs: Job[] = (result.data || []).map((job: any) => ({
				id: job.id,
				title: job.title || '',
				department: job.department || 'Unspecified',
				location: job.location || 'Unspecified',
				type: job.job_type || 'Full-time',
				salary: formatSalary(job.salary_min, job.salary_max, job.currency),
				applicants: parseInt(job.total_candidates) || 0,
				status: job.status || 'draft',
				recruiter: job.recruiter_name || 'Unassigned',
				posted: formatRelativeTime(job.created_at),
				companySlug: job.company_slug,
				description: job.description || '',
				workMode: job.work_mode || 'Hybrid',
				jobOpenDate: job.job_open_date,
				applicationDeadline: job.application_deadline,
				expectedStartDate: job.expected_start_date,
				salaryMin: job.salary_min,
				salaryMax: job.salary_max,
				currency: job.currency,
				responsibilities: job.responsibilities || [],
				requiredSkills: job.required_skills || [],
				preferredSkills: job.preferred_skills || [],
				experienceYears: job.experience_years || '',
				requiredEducation: job.required_education || '',
				certificationsRequired: job.certifications_required || '',
				languagesRequired: job.languages_required || '',
				recruiterAssigned: job.recruiter_name || '',
				hiringManager: job.hiring_manager_name || '',
				hiringManagerEmail: job.hiring_manager_email || '',
				interviewPanelMembers: job.interview_panel_members || [],
				numberOfOpenings: job.number_of_openings?.toString?.() || '',
				hiringPriority: job.hiring_priority || '',
				targetTimeToFill: job.target_time_to_fill_days?.toString?.() || '',
				budgetAllocated: job.budget_allocated?.toString?.() || '',
				targetSources: job.target_sources || [],
				diversityGoals: job.diversity_goals || false,
				diversityTargetPercentage: job.diversity_target_pct?.toString?.() || '',
				selectedCriteriaIds: job.selected_criteria_ids || job.selected_criteria,
				generatedQuestions: job.interview_questions || job.questions,
				expectedHiresPerMonth: job.expected_hires_per_month?.toString?.(),
				targetOfferAcceptanceRate: job.target_offer_acceptance_pct?.toString?.(),
				candidateResponseTimeSLA: job.candidate_response_sla_hrs?.toString?.(),
				interviewScheduleSLA: job.interview_schedule_sla_hrs?.toString?.(),
				costPerHireBudget: job.cost_per_hire_budget?.toString?.(),
				agencyFeePercentage: job.agency_fee_pct?.toString?.(),
				jobBoardCosts: job.job_board_costs?.toString?.(),
				autoScheduleInterview: job.auto_schedule_interview ?? false,
				interviewLinkExpiryHours: job.interview_link_expiry_hours ?? 48,
				enableScreeningQuestions: job.enable_screening_questions ?? false,
				screeningQuestions: job.screening_questions,
				stages: {
					cvScreened: parseInt(job.screening_count) || 0,
					aiInterview: parseInt(job.ai_interview_count) || 0,
					hiringManager: parseInt(job.hiring_manager_count) || 0,
					offerStage: parseInt(job.offer_count) || 0,
					hired: parseInt(job.hired_count) || 0,
					rejected: parseInt(job.rejected_count) || 0,
				}
			}))
			
			setJobs(mappedJobs)
		} catch (err) {
			console.error('Error fetching jobs:', err)
			setError(err instanceof Error ? err.message : 'Failed to load jobs')
		} finally {
			setIsLoading(false)
		}
	}, [company?.id])

	// Fetch jobs on mount
	useEffect(() => {
		fetchJobs()
	}, [fetchJobs])

	// Handle job posting dialog close - refresh data
	const handleJobPostingClose = () => {
		setShowJobPostingDialog(false)
		setJobFormInitialData(null)
		setJobFormMode('create')
		setJobFormJobId(null)
		setJobFormCompanySlug(null)
		fetchJobs() // Refresh jobs list after add/update
	}

	// Function to apply filters to jobs (excluding status filter)
	const applyJobFilters = (jobList: Job[]) => {
		return jobList.filter(job => {
			const matchesSearch = searchQuery === '' || 
				job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
				job.location.toLowerCase().includes(searchQuery.toLowerCase())
			const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter
			const matchesLocation = locationFilter === 'all' || job.location === locationFilter
			const matchesRecruiter = recruiterFilter === 'all' || job.recruiter === recruiterFilter
			
			return matchesSearch && matchesDepartment && matchesLocation && matchesRecruiter
		})
	}

	// Calculate dynamic counts for each status based on filters
	const getFilteredJobCount = (status: JobStatusType) => {
		const jobsToCount = status === 'all' ? jobs : jobs.filter(job => job.status === status)
		return applyJobFilters(jobsToCount).length
	}

	const statusBuckets = {
		open: { count: getFilteredJobCount('open'), icon: FolderOpen, color: 'green', label: 'Open Jobs', description: 'Currently accepting applications' },
		closed: { count: getFilteredJobCount('closed'), icon: FolderClosed, color: 'gray', label: 'Closed Jobs', description: 'Position filled' },
		onhold: { count: getFilteredJobCount('onhold'), icon: PauseCircle, color: 'orange', label: 'On Hold', description: 'Temporarily paused' },
		cancelled: { count: getFilteredJobCount('cancelled'), icon: XCircle, color: 'red', label: 'Cancelled', description: 'No longer hiring' },
		draft: { count: getFilteredJobCount('draft'), icon: FileEdit, color: 'blue', label: 'Draft Jobs', description: 'Not yet published' },
		all: { count: getFilteredJobCount('all'), icon: Database, color: 'slate', label: 'All Jobs', description: 'All job postings' }
	}

	const filteredJobs = jobs.filter(job => {
		const matchesStatus = activeStatus === 'all' || job.status === activeStatus
		const matchesSearch = searchQuery === '' || 
			job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
			job.location.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter
		const matchesLocation = locationFilter === 'all' || job.location === locationFilter
		const matchesRecruiter = recruiterFilter === 'all' || job.recruiter === recruiterFilter
		
		return matchesStatus && matchesSearch && matchesDepartment && matchesLocation && matchesRecruiter
	})

	const departments = [...new Set(jobs.map(job => job.department))]
	const locations = [...new Set(jobs.map(job => job.location))]
	const recruiters = [...new Set(jobs.map(job => job.recruiter))]

	const openJobs = jobs.filter(job => job.status === 'open')
	const totalApplicants = jobs.reduce((sum, job) => sum + job.applicants, 0)
	const totalHired = jobs.reduce((sum, job) => sum + job.stages.hired, 0)

	const stats = [
		{
			title: 'Active Open Jobs',
			value: openJobs.length.toString(),
			icon: FolderOpen,
			change: 'Currently accepting applications',
			color: 'text-green-600',
		},
		{
			title: 'Total Applicants',
			value: totalApplicants.toString(),
			icon: Users,
			change: 'Across all positions',
			color: 'text-blue-600',
		},
		{
			title: 'Total Hired',
			value: totalHired.toString(),
			icon: Users,
			change: 'Successful placements',
			color: 'text-emerald-600',
		},
		{
			title: 'Avg. Time to Fill',
			value: '28 days',
			icon: Clock,
			change: '3 days faster than last month',
			color: 'text-purple-600',
		},
	]

	return (
		<div className="flex flex-col gap-2 p-4">
			{/* Header */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-xl font-bold tracking-tight">Job Openings</h1>
					<p className="text-xs text-gray-600">
						Manage and track all your open positions
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					{/* View As Filter */}
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-medium text-gray-700">View as:</span>
						<Select value={viewAsRole} onValueChange={(value) => setViewAsRole(value as UserRole)}>
							<SelectTrigger className="w-[140px] h-9">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="recruiter">Recruiter</SelectItem>
								<SelectItem value="manager">Manager</SelectItem>
								<SelectItem value="director">Director</SelectItem>
							</SelectContent>
						</Select>
						{viewAsRole === 'recruiter' && recruiters.length > 0 && (
							<>
								<span className="text-sm text-gray-400">|</span>
								<Select value={viewAsRecruiter} onValueChange={setViewAsRecruiter}>
									<SelectTrigger className="w-[140px] h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Recruiters</SelectItem>
										{recruiters.map(r => (
											<SelectItem key={r} value={r}>{r}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</>
						)}
					</div>
					<Button
						className="gap-2"
						size="sm"
						onClick={() => {
							setJobFormInitialData(null)
							setJobFormMode('create')
							setJobFormJobId(null)
							setShowJobPostingDialog(true)
						}}
					>
						<Plus className="h-3 w-3" />
						Post New Job
					</Button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => {
					const Icon = stat.icon
					return (
						<Card key={stat.title} className="p-2">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<p className="text-xs font-medium text-gray-600">{stat.title}</p>
									<div className="text-xl font-bold mt-0.5">{stat.value}</div>
									<p className="text-[10px] text-gray-500 mt-0.5">{stat.change}</p>
								</div>
								<Icon className={`h-6 w-6 ${stat.color}`} />
							</div>
						</Card>
					)
				})}
			</div>

			{/* Filters and Search - Slim Design */}
			<div className="bg-white rounded-lg border p-2">
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative flex-1 min-w-[200px]">
						<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
						<Input
							type="text"
							placeholder="Search jobs..."
							className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Select
						value={departmentFilter}
						onValueChange={(e) => setDepartmentFilter(e)}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Select department" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Departments</SelectItem>
							{departments.map(dept => (
								<SelectItem key={dept} value={dept}>{dept}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={locationFilter}
						onValueChange={(e) => setLocationFilter(e)}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Select location" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Locations</SelectItem>
							{locations.map(loc => (
								<SelectItem key={loc} value={loc}>{loc}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={recruiterFilter}
						onValueChange={(e) => setRecruiterFilter(e)}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Select recruiter" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Recruiters</SelectItem>
							{recruiters.map(rec => (
								<SelectItem key={rec} value={rec}>{rec}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button 
						variant="outline" 
						size="sm"
						onClick={() => {
							setSearchQuery('')
							setDepartmentFilter('all')
							setLocationFilter('all')
							setRecruiterFilter('all')
						}}
					>
						Clear
					</Button>
				</div>
			</div>

			{/* Status Buckets */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
				{(Object.keys(statusBuckets) as JobStatusType[]).map((status) => {
					const data = statusBuckets[status]
					const Icon = data.icon
					
					return (
						<Card
							key={status}
							className={`p-2 cursor-pointer transition-all hover:shadow-lg ${
								activeStatus === status ? 'ring-2 ring-blue-600 shadow-lg bg-blue-50' : 'shadow hover:bg-gray-50'
							}`}
							onClick={() => {
								setActiveStatus(status)
							}}
						>
							<div className="flex flex-col items-center text-center gap-1">
								<div className={`w-7 h-7 rounded-full bg-${data.color}-100 flex items-center justify-center shrink-0`}>
									<Icon className={`h-4 w-4 text-${data.color}-600`} />
								</div>
								<div>
									<div className="text-xl font-bold text-gray-900">{data.count}</div>
									<div className="text-[10px] font-medium text-gray-700 mt-0.5">{data.label}</div>
								</div>
							</div>
						</Card>
					)
				})}
			</div>

			{/* Jobs List - Mobile Responsive */}
			<div className="space-y-2 md:space-y-3">
				{isLoading ? (
					<Card className="p-8 text-center">
						<div className="text-gray-500">
							<Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-blue-600" />
							<p className="text-base font-medium">Loading jobs...</p>
						</div>
					</Card>
				) : error ? (
					<Card className="p-6 text-center">
						<div className="text-red-500">
							<XCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
							<p className="text-base font-medium">Failed to load jobs</p>
							<p className="text-sm mt-1">{error}</p>
							<Button 
								variant="outline" 
								size="sm" 
								className="mt-3"
								onClick={fetchJobs}
							>
								<RefreshCw className="h-3 w-3 mr-1" />
								Try Again
							</Button>
						</div>
					</Card>
				) : filteredJobs.length === 0 ? (
					<Card className="p-6 text-center">
						<div className="text-gray-500">
							<Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
							<p className="text-base font-medium">{jobs.length === 0 ? 'No jobs yet' : 'No jobs found'}</p>
							<p className="text-sm mt-1">{jobs.length === 0 ? 'Click "Post New Job" to create your first job posting' : 'Try adjusting your filters or search query'}</p>
							{jobs.length === 0 && (
								<Button 
									size="sm" 
									className="mt-3"
									onClick={() => {
										setJobFormInitialData(null)
										setJobFormMode('create')
										setJobFormJobId(null)
										setShowJobPostingDialog(true)
									}}
								>
									<Plus className="h-3 w-3 mr-1" />
									Post New Job
								</Button>
							)}
						</div>
					</Card>
				) : (
					filteredJobs.map((job) => (
						<Card key={job.id} className="p-3 md:p-4">
							<div className="space-y-3">
								{/* Job Header */}
								<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
									<div className="flex-1">
										<div className="flex items-start gap-2 mb-2">
											<div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
												<Briefcase className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1 flex-wrap">
													<h3 className="text-sm md:text-base font-semibold text-gray-900">
														{job.title}
													</h3>
													<Badge variant={
														job.status === 'open' ? 'default' : 
														job.status === 'closed' ? 'secondary' : 
														job.status === 'cancelled' ? 'destructive' : 
														'outline'
													}>
														{job.status.charAt(0).toUpperCase() + job.status.slice(1)}
													</Badge>
												</div>
												<p className="text-xs text-gray-600">{job.department}</p>
												<p className="text-xs text-gray-500 mt-0.5">Recruiter: {job.recruiterAssigned || job.recruiter}</p>
											</div>
										</div>
										
										<div className="flex flex-wrap gap-2 md:gap-3 text-xs text-gray-600">
											<span className="flex items-center gap-1">
												<MapPin className="h-3 w-3" />
												{job.location}
											</span>
											<span className="flex items-center gap-1">
												<DollarSign className="h-3 w-3" />
												{job.salary}
											</span>
											<span className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{job.posted}
											</span>
										</div>
									</div>

									<div className="flex gap-2">
										{/* Share / Get JD Link Button */}
										{job.status === 'open' && (
											<Button 
												variant="outline" 
												size="sm"
												title="Copy shareable JD link"
												onClick={() => copyJDLink(job)}
												className={copiedJobId === job.id ? 'bg-green-50 border-green-300' : ''}
											>
												{copiedJobId === job.id ? (
													<>
														<Check className="h-3 w-3 mr-1 text-green-600" />
														<span className="text-green-600">Copied!</span>
													</>
												) : (
													<>
														<Share2 className="h-3 w-3 mr-1" />
														Share
													</>
												)}
											</Button>
										)}
										
										<Button 
											variant="outline" 
											size="sm" 
											title={job.status === 'draft' ? 'Edit job draft' : 'View job details'}
											onClick={() => {
												setJobFormInitialData({
													jobTitle: job.title || '',
													department: job.department || '',
													location: job.location || '',
													jobType: job.type || 'Full-time',
													workMode: job.workMode || 'Hybrid',
													jobStatus: job.status || 'open',
													salaryMin: job.salaryMin?.toString?.() || '',
													salaryMax: job.salaryMax?.toString?.() || '',
													currency: job.currency || 'USD',
													description: job.description || '',
													jobDescription: job.description || '',
													responsibilities: job.responsibilities || [],
													requiredSkills: job.requiredSkills || [],
													preferredSkills: job.preferredSkills || [],
													experienceYears: job.experienceYears || '',
													requiredEducation: job.requiredEducation || '',
													certificationsRequired: job.certificationsRequired || '',
													languagesRequired: job.languagesRequired || '',
													interviewPanelMembers: job.interviewPanelMembers || [],
													numberOfOpenings: job.numberOfOpenings || '1',
													hiringPriority: job.hiringPriority || 'Medium',
													targetTimeToFill: job.targetTimeToFill || '30',
													budgetAllocated: job.budgetAllocated || '',
													targetSources: job.targetSources || [],
													diversityGoals: job.diversityGoals || false,
													diversityTargetPercentage: job.diversityTargetPercentage || '',
													applicationDeadline: job.applicationDeadline || '',
													expectedStartDate: job.expectedStartDate || '',
													selectedCriteriaIds: job.selectedCriteriaIds || [],
													generatedQuestions: job.generatedQuestions || [],
													expectedHiresPerMonth: job.expectedHiresPerMonth || '',
													targetOfferAcceptanceRate: job.targetOfferAcceptanceRate || '',
													candidateResponseTimeSLA: job.candidateResponseTimeSLA || '',
													interviewScheduleSLA: job.interviewScheduleSLA || '',
													costPerHireBudget: job.costPerHireBudget || '',
													agencyFeePercentage: job.agencyFeePercentage || '',
													jobBoardCosts: job.jobBoardCosts || '',
													autoScheduleInterview: job.autoScheduleInterview ?? false,
													interviewLinkExpiryHours: job.interviewLinkExpiryHours ?? 48,
													enableScreeningQuestions: job.enableScreeningQuestions ?? false,
													screeningQuestions: job.screeningQuestions,
												})
												// Drafts should open in edit mode; published stay in view mode
												setJobFormMode(job.status === 'draft' ? 'create' : 'view')
												setJobFormJobId(job.id)
												setJobFormCompanySlug(job.companySlug)
												setShowJobPostingDialog(true)
											}}
										>
											{job.status === 'draft' ? (
												<>
													<FileEdit className="h-3 w-3 mr-1" />
													Edit
												</>
											) : (
												<>
													<Eye className="h-3 w-3 mr-1" />
													View
												</>
											)}
										</Button>
									</div>
								</div>

								{/* Application Stages - Hide for Draft Jobs */}
								{job.status !== 'draft' && (
									<div className="border-t pt-4">
										<h4 className="text-sm font-semibold text-gray-700 mb-3">Application Pipeline</h4>
										<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
											<div className="text-center p-2 bg-gray-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-gray-900">{job.applicants}</div>
												<div className="text-xs text-gray-600 mt-1">Total</div>
											</div>
											<div className="text-center p-2 bg-amber-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-amber-700">{job.stages.cvScreened}</div>
												<div className="text-xs text-gray-600 mt-1">CV Screened</div>
											</div>
											<div className="text-center p-2 bg-orange-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-orange-700">{job.stages.aiInterview}</div>
												<div className="text-xs text-gray-600 mt-1">AI Interview</div>
											</div>
											<div className="text-center p-2 bg-pink-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-pink-700">{job.stages.hiringManager}</div>
												<div className="text-xs text-gray-600 mt-1">Hiring Manager</div>
											</div>
											<div className="text-center p-2 bg-green-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-green-700">{job.stages.offerStage}</div>
												<div className="text-xs text-gray-600 mt-1">Offer Stage</div>
											</div>
											<div className="text-center p-2 bg-emerald-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-emerald-700">{job.stages.hired}</div>
												<div className="text-xs text-gray-600 mt-1">Hired</div>
											</div>
											<div className="text-center p-2 bg-red-50 rounded-lg">
												<div className="text-lg md:text-xl font-bold text-red-700">{job.stages.rejected}</div>
												<div className="text-xs text-gray-600 mt-1">Rejected</div>
											</div>
										</div>
									</div>
								)}
							</div>
						</Card>
					))
				)}
			</div>

			{/* Job Posting Dialog (create / prefilled view) */}
			{showJobPostingDialog && (
				<JobPostingForm
					onClose={handleJobPostingClose}
					initialData={jobFormInitialData || undefined}
					mode={jobFormMode}
					jobId={jobFormJobId || undefined}
					companySlug={jobFormCompanySlug || undefined}
				/>
			)}
		</div>
	)
}

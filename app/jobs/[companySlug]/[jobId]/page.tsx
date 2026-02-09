'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Calendar,
  GraduationCap,
  Languages,
  Award,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react'

interface JobData {
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
  responsibilities: string[]
  requiredSkills: string[]
  preferredSkills: string[]
  experienceYears: number | null
  requiredEducation: string
  certificationsRequired: string
  languagesRequired: string
  applicationDeadline: string | null
  expectedStartDate: string | null
  status: string
  publishedAt: string
  screeningEnabled: boolean
  screeningConfig: any
  company: {
    name: string
    slug: string
    website: string
    industry: string
    size: string
  }
}

export default function PublicJobDescriptionPage() {
  const params = useParams()
  const router = useRouter()
  const companySlug = params.companySlug as string
  const jobId = params.jobId as string

  const [job, setJob] = useState<JobData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJob() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/jobs/${companySlug}/${jobId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch job')
        }

        setJob(result.data)
      } catch (err) {
        console.error('Error fetching job:', err)
        setError(err instanceof Error ? err.message : 'Failed to load job')
      } finally {
        setIsLoading(false)
      }
    }

    if (companySlug && jobId) {
      fetchJob()
    }
  }, [companySlug, jobId])

  const handleApply = () => {
    if (!job) return

    if (job.screeningEnabled) {
      router.push(`/jobs/${companySlug}/${jobId}/screening`)
    } else {
      router.push(`/apply/${companySlug}/${jobId}`)
    }
  }

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
    if (min) return `From ${formatter.format(min)}`
    if (max) return `Up to ${formatter.format(max)}`
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-4">{error || 'The job you are looking for does not exist or is no longer available.'}</p>
          <Button onClick={() => router.push('/')} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const salaryDisplay = formatSalary(job.salaryMin, job.salaryMax, job.currency)

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Green heading card */}
        <section className="mb-6 rounded-2xl bg-emerald-600/95 text-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-emerald-700/20 motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{job.title}</h1>
            <p className="mt-2 text-emerald-50">{job.company.name}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-emerald-100 text-sm">
              {job.department && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.department}</span>
              )}
              {job.jobType && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.jobType}</span>
              )}
              {job.workMode && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.workMode}</span>
              )}
              {job.location && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">
                  <MapPin className="h-3.5 w-3.5 mr-1" />{job.location}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Job Details Card */}
            <section className="w-full rounded-2xl border border-emerald-200 bg-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden">
              <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4 md:px-8">
                <h2 className="font-semibold text-slate-900">Job Description</h2>
                <p className="text-sm text-emerald-700">Role: <span className="font-medium">{job.title}</span></p>
              </div>
              <div className="p-6 md:p-8 space-y-8">
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {salaryDisplay && (
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-center">
                      <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Salary</p>
                      <p className="text-sm font-semibold text-slate-900">{salaryDisplay}</p>
                    </div>
                  )}
                  {job.experienceYears && (
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-center">
                      <Clock className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Experience</p>
                      <p className="text-sm font-semibold text-slate-900">{job.experienceYears}+ years</p>
                    </div>
                  )}
                  {job.applicationDeadline && (
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-center">
                      <Calendar className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Deadline</p>
                      <p className="text-sm font-semibold text-slate-900">{new Date(job.applicationDeadline).toLocaleDateString()}</p>
                    </div>
                  )}
                  {job.expectedStartDate && (
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-center">
                      <Briefcase className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Start Date</p>
                      <p className="text-sm font-semibold text-slate-900">{new Date(job.expectedStartDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* About the Role */}
                {job.description && (
                  <section>
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">About the Role</h3>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
                  </section>
                )}

                {/* Key Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Key Responsibilities</h3>
                    <ul className="space-y-2.5">
                      {job.responsibilities.filter(r => r.trim()).map((resp, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Skills & Qualifications */}
                {(job.requiredSkills?.length > 0 || job.preferredSkills?.length > 0) && (
                  <section>
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Skills & Qualifications</h3>
                    <div className="space-y-4">
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Required Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.requiredSkills.filter(s => s.trim()).map((skill, index) => (
                              <span key={index} className="inline-flex items-center rounded-full bg-emerald-600 text-white px-3 py-1 text-sm font-medium">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {job.preferredSkills && job.preferredSkills.length > 0 && (
                        <div>
                          <h4 className="font-medium text-slate-900 mb-2">Preferred Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.preferredSkills.filter(s => s.trim()).map((skill, index) => (
                              <span key={index} className="inline-flex items-center rounded-full bg-white text-slate-700 border border-slate-300 px-3 py-1 text-sm font-medium">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Requirements */}
                {(job.requiredEducation || job.certificationsRequired || job.languagesRequired) && (
                  <section>
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Requirements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {job.requiredEducation && (
                        <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
                          <GraduationCap className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-900">Education</p>
                            <p className="text-sm text-slate-600">{job.requiredEducation}</p>
                          </div>
                        </div>
                      )}
                      {job.certificationsRequired && (
                        <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
                          <Award className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-900">Certifications</p>
                            <p className="text-sm text-slate-600">{job.certificationsRequired}</p>
                          </div>
                        </div>
                      )}
                      {job.languagesRequired && (
                        <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
                          <Languages className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-900">Languages</p>
                            <p className="text-sm text-slate-600">{job.languagesRequired}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="sticky top-8 rounded-2xl border border-emerald-200 bg-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden">
              <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4">
                <h3 className="font-semibold text-slate-900">Interested?</h3>
                <p className="text-sm text-emerald-700">Apply for this position now</p>
              </div>
              <div className="p-6 space-y-4">
                <Button 
                  onClick={handleApply} 
                  className="w-full bg-emerald-600 hover:bg-emerald-600/90 text-white text-base px-5 py-3 rounded-md font-semibold shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300"
                  size="lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Apply Now
                </Button>
                
                {job.applicationDeadline && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span>Apply by {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                  </div>
                )}

                {job.expectedStartDate && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    <span>Start date: {new Date(job.expectedStartDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building2, 
  Calendar,
  GraduationCap,
  Languages,
  Award,
  Users,
  Globe,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The job you are looking for does not exist or is no longer available.'}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const salaryDisplay = formatSalary(job.salaryMin, job.salaryMax, job.currency)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{job.company.name}</h1>
              <p className="text-sm text-gray-500">{job.company.industry}</p>
            </div>
          </div>
          <Button onClick={handleApply} size="lg">
            Apply Now
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Title Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{job.department}</Badge>
                      <Badge variant="outline">{job.jobType}</Badge>
                      <Badge variant="outline">{job.workMode}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {job.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                  )}
                  {salaryDisplay && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      {salaryDisplay}
                    </div>
                  )}
                  {job.experienceYears && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {job.experienceYears}+ years experience
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Complete Job Details Card */}
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* About the Role */}
                {job.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">About the Role</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                  </div>
                )}

                {/* Key Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Responsibilities</h3>
                    <ul className="space-y-2">
                      {job.responsibilities.filter(r => r.trim()).map((resp, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills & Qualifications */}
                {(job.requiredSkills?.length > 0 || job.preferredSkills?.length > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills & Qualifications</h3>
                    <div className="space-y-4">
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Required Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.requiredSkills.filter(s => s.trim()).map((skill, index) => (
                              <Badge key={index} variant="default">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {job.preferredSkills && job.preferredSkills.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Preferred Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.preferredSkills.filter(s => s.trim()).map((skill, index) => (
                              <Badge key={index} variant="outline">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {(job.requiredEducation || job.certificationsRequired || job.languagesRequired) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                    <div className="space-y-3">
                      {job.requiredEducation && (
                        <div className="flex items-start gap-3">
                          <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Education</p>
                            <p className="text-gray-600">{job.requiredEducation}</p>
                          </div>
                        </div>
                      )}
                      {job.certificationsRequired && (
                        <div className="flex items-start gap-3">
                          <Award className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Certifications</p>
                            <p className="text-gray-600">{job.certificationsRequired}</p>
                          </div>
                        </div>
                      )}
                      {job.languagesRequired && (
                        <div className="flex items-start gap-3">
                          <Languages className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Languages</p>
                            <p className="text-gray-600">{job.languagesRequired}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card className="sticky top-24">
              <CardContent className="pt-6">
                <Button onClick={handleApply} className="w-full mb-4" size="lg">
                  Apply for this Position
                </Button>
                
                {job.applicationDeadline && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Apply by {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                  </div>
                )}

                {job.expectedStartDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>Start date: {new Date(job.expectedStartDate).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

                      </div>
        </div>
      </main>
    </div>
  )
}

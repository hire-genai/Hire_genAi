'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Building2, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ClipboardList
} from 'lucide-react'

interface JobData {
  id: string
  title: string
  company: {
    name: string
    slug: string
  }
  screeningEnabled: boolean
  screeningConfig: {
    minExperience?: number | null
    expectedSkills?: string[]
    expectedSalary?: number | null
    noticePeriodNegotiable?: boolean | null
  }
}

interface ScreeningAnswers {
  experience: string
  skills: string[]
  expectedSalary: string
  noticePeriod: string
  noticePeriodNegotiable: boolean | null
  additionalInfo: string
}

export default function ScreeningPage() {
  const params = useParams()
  const router = useRouter()
  const companySlug = params.companySlug as string
  const jobId = params.jobId as string

  const [job, setJob] = useState<JobData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [answers, setAnswers] = useState<ScreeningAnswers>({
    experience: '',
    skills: [],
    expectedSalary: '',
    noticePeriod: '',
    noticePeriodNegotiable: null,
    additionalInfo: ''
  })

  const [skillInput, setSkillInput] = useState('')

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

        // Check if screening is enabled
        if (!result.data.screeningEnabled) {
          // Redirect to apply page if screening is not enabled
          router.replace(`/apply/${companySlug}/${jobId}`)
          return
        }

        setJob(result.data)
      } catch (err) {
        console.error('Error fetching job:', err)
        setError(err instanceof Error ? err.message : 'Failed to load screening questions')
      } finally {
        setIsLoading(false)
      }
    }

    if (companySlug && jobId) {
      fetchJob()
    }
  }, [companySlug, jobId, router])

  const addSkill = () => {
    if (skillInput.trim() && !answers.skills.includes(skillInput.trim())) {
      setAnswers(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }))
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setAnswers(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }))
  }

  const handleSubmit = async () => {
    if (!job) return

    try {
      setIsSubmitting(true)

      // Submit screening answers
      const response = await fetch('/api/screening/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          companySlug,
          answers: {
            experience: answers.experience ? parseInt(answers.experience) : null,
            skills: answers.skills,
            expectedSalary: answers.expectedSalary ? parseFloat(answers.expectedSalary) : null,
            noticePeriod: answers.noticePeriod,
            noticePeriodNegotiable: answers.noticePeriodNegotiable,
            additionalInfo: answers.additionalInfo
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit screening answers')
      }

      // Redirect to apply page after successful screening
      router.push(`/apply/${companySlug}/${jobId}?screening=completed`)
    } catch (err) {
      console.error('Error submitting screening:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit screening answers')
    } finally {
      setIsSubmitting(false)
    }
  }

  const screeningConfig = job?.screeningConfig || {}

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading screening questions...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Screening</h2>
            <p className="text-gray-600 mb-4">{error || 'Something went wrong.'}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Job
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium text-gray-900">{job.company.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 select-text">
        {/* Title Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Screening Questions</h1>
                <p className="text-gray-600">
                  Please answer the following questions for <strong>{job.title}</strong> at {job.company.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Screening Form */}
        <Card>
          <CardContent className="pt-6 space-y-6 select-text">
            {/* Experience Question */}
            {screeningConfig.minExperience !== undefined && (
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-base font-medium">
                  Years of relevant experience <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-500">
                  Minimum required: {screeningConfig.minExperience || 0} years
                </p>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={answers.experience}
                  onChange={(e) => setAnswers(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="Enter years of experience"
                  className="max-w-xs cursor-text focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Skills Question */}
            {screeningConfig.expectedSkills && screeningConfig.expectedSkills.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Which of the following skills do you have? <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-500">
                  Select all that apply from: {screeningConfig.expectedSkills.join(', ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {screeningConfig.expectedSkills.map((skill: string) => (
                    <Button
                      key={skill}
                      type="button"
                      variant={answers.skills.includes(skill) ? 'default' : 'outline'}
                      size="sm"
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => {
                        if (answers.skills.includes(skill)) {
                          removeSkill(skill)
                        } else {
                          setAnswers(prev => ({ ...prev, skills: [...prev.skills, skill] }))
                        }
                      }}
                    >
                      {answers.skills.includes(skill) && <CheckCircle className="h-3 w-3 mr-1" />}
                      {skill}
                    </Button>
                  ))}
                </div>
                
                {/* Custom skill input */}
                <div className="flex gap-2 mt-3">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add other skill..."
                    className="max-w-xs cursor-text focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" variant="outline" onClick={addSkill}>
                    Add
                  </Button>
                </div>

                {/* Added skills */}
                {answers.skills.filter(s => !screeningConfig.expectedSkills?.includes(s)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {answers.skills
                      .filter(s => !screeningConfig.expectedSkills?.includes(s))
                      .map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-1"
                        >
                          {skill}
                          <button 
                            onClick={() => removeSkill(skill)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Expected Salary Question */}
            {screeningConfig.expectedSalary !== undefined && (
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-base font-medium">
                  Expected annual salary (USD)
                </Label>
                <p className="text-sm text-gray-500">
                  Budget range: Up to ${screeningConfig.expectedSalary?.toLocaleString() || 'Not specified'}
                </p>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  value={answers.expectedSalary}
                  onChange={(e) => setAnswers(prev => ({ ...prev, expectedSalary: e.target.value }))}
                  placeholder="Enter expected salary"
                  className="max-w-xs cursor-text focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Notice Period Question */}
            {screeningConfig.noticePeriodNegotiable !== undefined && (
              <div className="space-y-2">
                <Label htmlFor="noticePeriod" className="text-base font-medium">
                  Notice period
                </Label>
                <Input
                  id="noticePeriod"
                  type="text"
                  value={answers.noticePeriod}
                  onChange={(e) => setAnswers(prev => ({ ...prev, noticePeriod: e.target.value }))}
                  placeholder="e.g., 2 weeks, 1 month, Immediate"
                  className="max-w-xs cursor-text focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-3 mt-2">
                  <Label className="text-sm text-gray-600">Is your notice period negotiable?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={answers.noticePeriodNegotiable === true ? 'default' : 'outline'}
                      size="sm"
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setAnswers(prev => ({ ...prev, noticePeriodNegotiable: true }))}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={answers.noticePeriodNegotiable === false ? 'default' : 'outline'}
                      size="sm"
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setAnswers(prev => ({ ...prev, noticePeriodNegotiable: false }))}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="space-y-2">
              <Label htmlFor="additionalInfo" className="text-base font-medium">
                Anything else you'd like us to know? (Optional)
              </Label>
              <textarea
                id="additionalInfo"
                value={answers.additionalInfo}
                onChange={(e) => setAnswers(prev => ({ ...prev, additionalInfo: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-text resize-y"
                placeholder="Share any additional information relevant to your application..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Continue to Apply
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

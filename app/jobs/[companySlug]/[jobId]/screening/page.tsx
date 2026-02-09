'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  XCircle,
  User,
  Mail,
  ShieldCheck,
  Send
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
    workAuthorization?: string | null
    noticePeriod?: string | null
  }
}

interface ScreeningAnswers {
  candidateName: string
  candidateEmail: string
  experience: string
  skills: string[]
  expectedSalary: string
  noticePeriod: string
  noticePeriodNegotiable: boolean | null
  workAuthorization: string
  additionalInfo: string
}

interface ScreeningResult {
  eligible: boolean
  message: string
  reasons?: string[]
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
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null)

  // OTP state
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpMessage, setOtpMessage] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)
  
  const [answers, setAnswers] = useState<ScreeningAnswers>({
    candidateName: '',
    candidateEmail: '',
    experience: '',
    skills: [],
    expectedSalary: '',
    noticePeriod: '',
    noticePeriodNegotiable: null,
    workAuthorization: '',
    additionalInfo: ''
  })

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

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const startCooldown = () => {
    setOtpCooldown(60)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendOtp = async () => {
    if (!answers.candidateName.trim()) {
      setOtpError('Please enter your name first.')
      return
    }
    if (!answers.candidateEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.candidateEmail)) {
      setOtpError('Please enter a valid email address.')
      return
    }

    try {
      setSendingOtp(true)
      setOtpError(null)
      setOtpMessage(null)

      const response = await fetch('/api/screening/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: answers.candidateEmail.trim(),
          candidateName: answers.candidateName.trim(),
          jobTitle: job?.title || '',
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code')
      }

      setOtpSent(true)
      setOtpMessage('Verification code sent to your email. Please check your inbox.')
      startCooldown()
    } catch (err) {
      console.error('Error sending OTP:', err)
      setOtpError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code.')
      return
    }

    try {
      setVerifyingOtp(true)
      setOtpError(null)

      const response = await fetch('/api/screening/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: answers.candidateEmail.trim(),
          otp: otpCode.trim(),
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Invalid verification code')
      }

      setEmailVerified(true)
      setOtpMessage(null)
      setOtpError(null)
    } catch (err) {
      console.error('Error verifying OTP:', err)
      setOtpError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Reset OTP state when email changes
  const handleEmailChange = (newEmail: string) => {
    setAnswers(prev => ({ ...prev, candidateEmail: newEmail }))
    if (emailVerified || otpSent) {
      setEmailVerified(false)
      setOtpSent(false)
      setOtpCode('')
      setOtpMessage(null)
      setOtpError(null)
    }
  }

  const toggleSkill = (skill: string) => {
    setAnswers(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  // Check if all mandatory fields are filled
  const areMandatoryFieldsFilled = () => {
    // Basic info
    if (!answers.candidateName.trim() || !answers.candidateEmail.trim()) return false
    
    // Experience (if required)
    if (screeningConfig.minExperience !== undefined && !answers.experience.trim()) return false
    
    // Skills (if required)
    if (screeningConfig.expectedSkills && screeningConfig.expectedSkills.length > 0 && answers.skills.length === 0) return false
    
    // Salary (if required)
    if (screeningConfig.expectedSalary !== undefined && !answers.expectedSalary.trim()) return false
    
    // Work Authorization (if required)
    if (screeningConfig.workAuthorization && !answers.workAuthorization) return false

    // Notice Period (if required)
    if (screeningConfig.noticePeriod && !answers.noticePeriod.trim()) return false
    
    return true
  }

  const handleSubmit = async () => {
    if (!job) return

    // Validation
    if (!answers.candidateName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!emailVerified) {
      setError('Please verify your email address before submitting.')
      return
    }
    if (screeningConfig.minExperience !== undefined && !answers.experience.trim()) {
      setError('Please enter your years of experience.')
      return
    }
    if (screeningConfig.expectedSkills && screeningConfig.expectedSkills.length > 0 && answers.skills.length === 0) {
      setError('Please select at least one skill.')
      return
    }
    if (screeningConfig.expectedSalary !== undefined && !answers.expectedSalary.trim()) {
      setError('Please enter your expected salary.')
      return
    }
    if (screeningConfig.workAuthorization && !answers.workAuthorization) {
      setError('Please select your work authorization status.')
      return
    }
    if (screeningConfig.noticePeriod && !answers.noticePeriod.trim()) {
      setError('Please enter your notice period.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/screening/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          companySlug,
          candidateName: answers.candidateName.trim(),
          candidateEmail: answers.candidateEmail.trim(),
          answers: {
            experience: answers.experience ? parseInt(answers.experience) : null,
            skills: answers.skills,
            expectedSalary: answers.expectedSalary ? parseFloat(answers.expectedSalary) : null,
            noticePeriod: answers.noticePeriod,
            noticePeriodNegotiable: answers.noticePeriodNegotiable,
            workAuthorization: answers.workAuthorization,
            additionalInfo: answers.additionalInfo
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit screening answers')
      }

      if (result.eligible) {
        setScreeningResult({ eligible: true, message: result.message })
        setTimeout(() => {
          router.push(`/apply/${companySlug}/${jobId}`)
        }, 2000)
      } else {
        setScreeningResult({
          eligible: false,
          message: result.message,
          reasons: result.reasons || []
        })
      }
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-600">Loading screening questions...</p>
        </div>
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Screening</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => router.back()} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!job) return null

  // --- Eligibility Result Screen ---
  if (screeningResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-2xl border bg-white shadow-lg overflow-hidden">
          {screeningResult.eligible ? (
            <>
              <div className="bg-emerald-600 px-6 py-5 text-center">
                <CheckCircle className="h-12 w-12 text-white mx-auto mb-2" />
                <h2 className="text-xl font-bold text-white">You Are Eligible!</h2>
              </div>
              <div className="p-6 text-center">
                <p className="text-slate-700 mb-4">{screeningResult.message}</p>
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to application form...
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-500 px-6 py-5 text-center">
                <XCircle className="h-12 w-12 text-white mx-auto mb-2" />
                <h2 className="text-xl font-bold text-white">Not Eligible</h2>
              </div>
              <div className="p-6">
                <p className="text-slate-700 mb-4 text-center">{screeningResult.message}</p>
                {screeningResult.reasons && screeningResult.reasons.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h3 className="font-semibold text-slate-900 text-sm">Reasons:</h3>
                    {screeningResult.reasons.map((reason, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 p-3">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800">{reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Job
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // --- Screening Form ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Compact green heading card */}
        <section className="mb-5 rounded-xl bg-emerald-600/95 text-white shadow-md overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white/80 hover:text-white hover:bg-white/10 flex-shrink-0 h-8 px-2"
                onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight truncate">Screening Questions</h1>
                <p className="text-emerald-100 text-sm truncate">{job.title} &middot; {job.company.name}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Screening Form Card */}
        <section className="w-full rounded-2xl border border-emerald-200 bg-white shadow-lg overflow-hidden">
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              Screening Form
            </h2>
          </div>
          <div className="p-5 md:p-6 space-y-6">
            {/* Name & Email + OTP Verification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="candidateName" className="text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Full Name *
                </Label>
                <Input
                  id="candidateName"
                  type="text"
                  value={answers.candidateName}
                  onChange={(e) => setAnswers(prev => ({ ...prev, candidateName: e.target.value }))}
                  placeholder="Enter your full name"
                  className={`border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400 cursor-text ${
                    answers.candidateName ? 'border-emerald-500 ring-1 ring-emerald-500' : ''
                  }`}
                  disabled={emailVerified}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="candidateEmail" className="text-sm flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email ID *
                  {emailVerified && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium ml-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={answers.candidateEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="you@example.com"
                    className={`flex-1 border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400 cursor-text ${
                      emailVerified ? 'bg-emerald-50 border-emerald-300' : ''
                    }`}
                    disabled={emailVerified}
                    required
                  />
                  {!emailVerified && (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || otpCooldown > 0 || !answers.candidateEmail.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 flex-shrink-0"
                      size="sm"
                    >
                      {sendingOtp ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : otpCooldown > 0 ? (
                        `${otpCooldown}s`
                      ) : otpSent ? (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Resend
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Send OTP
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* OTP Input Row */}
            {otpSent && !emailVerified && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">Enter verification code</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setOtpCode(val)
                      setOtpError(null)
                    }}
                    placeholder="6-digit code"
                    maxLength={6}
                    className="max-w-[160px] text-center tracking-widest font-mono text-lg border-slate-300 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpCode.length !== 6}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4"
                    size="sm"
                  >
                    {verifyingOtp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                {otpMessage && (
                  <p className="text-xs text-emerald-700 mt-1.5">{otpMessage}</p>
                )}
                {otpError && (
                  <p className="text-xs text-red-600 mt-1.5">{otpError}</p>
                )}
              </div>
            )}

            {/* Verified badge */}
            {emailVerified && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-800">Email verified successfully</span>
              </div>
            )}

            {/* Experience & Salary - side by side */}
            {(screeningConfig.minExperience !== undefined || screeningConfig.expectedSalary !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screeningConfig.minExperience !== undefined && (
                  <div className="space-y-1.5">
                    <Label htmlFor="experience" className="text-sm">Years of relevant experience *</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      value={answers.experience}
                      onChange={(e) => setAnswers(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g. 3"
                      className={`border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400 cursor-text ${
                        answers.experience ? 'border-emerald-500 ring-1 ring-emerald-500' : ''
                      }`}
                    />
                  </div>
                )}
                {screeningConfig.expectedSalary !== undefined && (
                  <div className="space-y-1.5">
                    <Label htmlFor="salary" className="text-sm">Expected annual salary (USD) *</Label>
                    <Input
                      id="salary"
                      type="number"
                      min="0"
                      value={answers.expectedSalary}
                      onChange={(e) => setAnswers(prev => ({ ...prev, expectedSalary: e.target.value }))}
                      placeholder="e.g. 50000"
                      className={`border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400 cursor-text ${
                        answers.expectedSalary ? 'border-emerald-500 ring-1 ring-emerald-500' : ''
                      }`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Skills — pill/checkbox style */}
            {screeningConfig.expectedSkills && screeningConfig.expectedSkills.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Skills *</Label>
                <div className="flex flex-wrap gap-2">
                  {screeningConfig.expectedSkills.map((skill: string) => {
                    const selected = answers.skills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 select-none ${
                          selected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center h-4 w-4 rounded border text-[10px] flex-shrink-0 ${
                          selected
                            ? 'bg-white border-white text-emerald-600'
                            : 'border-slate-300 text-transparent'
                        }`}>
                          {selected && '✓'}
                        </span>
                        {skill}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notice Period & Negotiable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="noticePeriod" className="text-sm">Notice Period *</Label>
                <Input
                  id="noticePeriod"
                  type="text"
                  value={answers.noticePeriod}
                  onChange={(e) => setAnswers(prev => ({ ...prev, noticePeriod: e.target.value }))}
                  placeholder="e.g. 30 days, 2 months, Immediate"
                  className={`border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400 cursor-text ${
                    answers.noticePeriod ? 'border-emerald-500 ring-1 ring-emerald-500' : ''
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-600">Is your notice period negotiable?</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 ${
                      answers.noticePeriodNegotiable === true
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                    onClick={() => setAnswers(prev => ({ ...prev, noticePeriodNegotiable: true }))}
                  >
                    {answers.noticePeriodNegotiable === true && <CheckCircle className="h-3.5 w-3.5" />}
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 ${
                      answers.noticePeriodNegotiable === false
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                    onClick={() => setAnswers(prev => ({ ...prev, noticePeriodNegotiable: false }))}
                  >
                    {answers.noticePeriodNegotiable === false && <CheckCircle className="h-3.5 w-3.5" />}
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Work Authorization */}
            <div className="space-y-1.5">
              <Label className="text-sm">Work Authorization *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="candidateWorkAuth"
                    checked={answers.workAuthorization === 'visa_sponsorship'}
                    onChange={() => setAnswers(prev => ({ ...prev, workAuthorization: 'visa_sponsorship' }))}
                    className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Visa sponsorship available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="candidateWorkAuth"
                    checked={answers.workAuthorization === 'must_have_authorization'}
                    onChange={() => setAnswers(prev => ({ ...prev, workAuthorization: 'must_have_authorization' }))}
                    className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Must already have work authorization</span>
                </label>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-1.5">
              <Label htmlFor="additionalInfo" className="text-sm">Anything else you&apos;d like us to know? (Optional)</Label>
              <textarea
                id="additionalInfo"
                value={answers.additionalInfo}
                onChange={(e) => setAnswers(prev => ({ ...prev, additionalInfo: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm cursor-text resize-y transition-colors duration-200 hover:border-emerald-400"
                placeholder="Share any additional information..."
              />
            </div>

            {/* Submit bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {!emailVerified ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Verify your email to submit
                  </span>
                ) : !areMandatoryFieldsFilled() ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Fill all required fields to submit
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="h-3 w-3" />
                    Ready to submit
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                  onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !emailVerified || !areMandatoryFieldsFilled()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      Submit Screening
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

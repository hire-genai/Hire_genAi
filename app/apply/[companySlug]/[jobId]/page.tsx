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
  Send,
  Plus,
  X,
  Upload,
  FileText,
  CheckCircle2
} from 'lucide-react'
import WebcamCapture from '@/components/webcam-capture'

interface JobData {
  id: string
  title: string
  location?: string
  clientCompanyName?: string | null
  description?: string
  currency?: string
  applicationDeadline?: string | null
  company: {
    id?: string
    name: string
    slug: string
  }
}

export default function ApplyPage() {
  const params = useParams()
  const router = useRouter()
  const companySlug = params.companySlug as string
  const jobId = params.jobId as string
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [job, setJob] = useState<JobData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const [confirmationStatus, setConfirmationStatus] = useState<'agree' | 'disagree' | ''>('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [infoCorrectChecked, setInfoCorrectChecked] = useState(false)
  const [parsingOpen, setParsingOpen] = useState(false)
  const [parseStep, setParseStep] = useState<'idle' | 'uploading' | 'parsing' | 'evaluating' | 'done'>('idle')
  const appRootRef = useRef<HTMLDivElement | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    expectedCurrency: 'USD',
    expectedSalary: '',
    location: '',
    coverLetter: '',
    linkedinUrl: '',
    portfolioUrl: '',
    availableStartDate: '',
    relocate: false,
  })

  const [languages, setLanguages] = useState<Array<{ language: string; proficiency: string }>>([
    { language: '', proficiency: '' }
  ])

  // Track if data came from screening page (fields should be read-only)
  const [fromScreening, setFromScreening] = useState(false)

  const languageOptions = [
    'English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese (Mandarin)',
    'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian',
    'Dutch', 'Turkish', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
    'Gujarati', 'Punjabi', 'Urdu', 'Polish', 'Swedish'
  ]

  const proficiencyLevels = [
    { value: 'native', label: 'Native / Bilingual' },
    { value: 'fluent', label: 'Fluent' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'basic', label: 'Basic' },
  ]

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
        // Pre-fill currency from job posting
        if (result.data?.currency) {
          setFormData(prev => ({ ...prev, expectedCurrency: result.data.currency }))
        }
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

  // Load screening data from sessionStorage if coming from screening page
  useEffect(() => {
    if (jobId) {
      const screeningData = sessionStorage.getItem(`screening_${jobId}`)
      if (screeningData) {
        try {
          const parsed = JSON.parse(screeningData)
          // Split candidateName into firstName and lastName
          const nameParts = (parsed.candidateName || '').trim().split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          setFormData(prev => ({
            ...prev,
            firstName,
            lastName,
            email: parsed.candidateEmail || '',
            expectedSalary: parsed.expectedSalary || '',
          }))
          setFromScreening(true)
          // Clear the sessionStorage after reading
          sessionStorage.removeItem(`screening_${jobId}`)
        } catch (e) {
          console.error('Failed to parse screening data:', e)
        }
      }
    }
  }, [jobId])

  const addLanguage = () => {
    setLanguages([...languages, { language: '', proficiency: '' }])
  }

  const removeLanguage = (index: number) => {
    if (languages.length > 1) {
      setLanguages(languages.filter((_, i) => i !== index))
    }
  }

  const updateLanguage = (index: number, field: 'language' | 'proficiency', value: string) => {
    const updated = [...languages]
    updated[index][field] = value
    setLanguages(updated)
  }

  const handleFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (file.size > maxSize) {
      alert('File too large. Max 10MB allowed.')
      return
    }
    if (file.type && !allowed.includes(file.type)) {
      const okExt = /\.(pdf|doc|docx|txt)$/i.test(file.name)
      if (!okExt) {
        alert('Unsupported file. Please upload PDF, DOC, DOCX, or TXT.')
        return
      }
    }
    setResumeFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!job) return

      const fullName = `${formData.firstName} ${formData.lastName}`.trim()

      // Validate required fields
      const missing: string[] = []
      if (!formData.firstName.trim()) missing.push('First name')
      if (!formData.lastName.trim()) missing.push('Last name')
      if (!formData.email.trim()) missing.push('Email')
      if (!formData.phone.trim()) missing.push('Phone')
      if (!formData.expectedSalary.trim()) missing.push('Expected salary')
      if (!formData.location.trim()) missing.push('Location')
      if (!formData.availableStartDate.trim()) missing.push('Available start date')
      if (!resumeFile) missing.push('Resume')
      if (!capturedPhoto) missing.push('Photo (webcam capture)')
      if (confirmationStatus !== 'agree') missing.push('Confirmation (Agree)')

      if (missing.length > 0) {
        alert(`Please fill: ${missing.join(', ')}.`)
        setIsSubmitting(false)
        return
      }

      // Upload photo if captured
      let photoUploadUrl: string | null = null
      if (capturedPhoto) {
        try {
          const photoRes = await fetch('/api/photos/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: capturedPhoto,
              candidateId: `candidate_${Date.now()}`,
            }),
          })
          if (photoRes.ok) {
            const photoData = await photoRes.json()
            photoUploadUrl = photoData.photoUrl
          } else {
            console.warn('Photo upload failed (non-fatal)')
          }
        } catch (photoErr) {
          console.warn('Photo upload error (non-fatal):', photoErr)
        }
      }

      // Filter valid languages
      const validLanguages = languages.filter(l => l.language && l.proficiency)

      // Submit application to backend
      const submitPayload = {
        jobId: job.id,
        candidate: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          fullName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          expectedSalary: formData.expectedSalary,
          salaryCurrency: formData.expectedCurrency,
          salaryPeriod: 'month',
          linkedinUrl: formData.linkedinUrl || null,
          portfolioUrl: formData.portfolioUrl || null,
          availableStartDate: formData.availableStartDate || null,
          willingToRelocate: formData.relocate || false,
          languages: validLanguages,
        },
        resume: resumeFile ? {
          name: resumeFile.name,
          type: resumeFile.type,
          size: resumeFile.size,
        } : null,
        photoUrl: photoUploadUrl,
        coverLetter: formData.coverLetter || null,
        confirmationStatus,
        source: 'direct_application',
      }

      const submitRes = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload),
      })

      const submitData = await submitRes.json()

      if (!submitRes.ok || submitData?.error) {
        throw new Error(submitData?.error || 'Failed to submit application')
      }

      // --- CV Upload → Parse → Evaluate pipeline with progress overlay ---
      if (resumeFile && submitData?.applicationId) {
        setParsingOpen(true)
        setParseStep('uploading')
        try {
          // Step 1+2: Upload + Parse resume in a single call (avoids duplicate blob uploads)
          setParseStep('parsing')
          const parseFormData = new FormData()
          parseFormData.append('file', resumeFile)
          parseFormData.append('applicationId', submitData.applicationId)
          if (submitData.candidateId) {
            parseFormData.append('candidateId', submitData.candidateId)
          }

          const parseRes = await fetch('/api/resumes/parse', {
            method: 'POST',
            body: parseFormData,
          })

          let resumeTextForEval = ''
          if (parseRes.ok) {
            const parseData = await parseRes.json()
            resumeTextForEval = parseData.parsed?.rawText || ''
            console.log('[Apply] Resume parsed, skills found:', parseData.parsed?.skills?.length || 0)
          }

          // If parsing produced little text, build fallback from form fields
          if (!resumeTextForEval || resumeTextForEval.trim().length < 50) {
            resumeTextForEval = [
              `[Name] ${fullName}`,
              `[Email] ${formData.email}`,
              `[Phone] ${formData.phone}`,
              `[Location] ${formData.location || ''}`,
              `[Cover Letter] ${formData.coverLetter || ''}`,
            ].filter(Boolean).join('\n')
          }

          // Step 3: Evaluate CV against JD
          setParseStep('evaluating')
          try {
            const evalRes = await fetch('/api/applications/evaluate-cv', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicationId: submitData.applicationId,
                resumeText: resumeTextForEval,
                jobDescription: job?.description || '',
                passThreshold: 40,
                companyId: job?.company?.id || null,
              })
            })

            if (evalRes.ok) {
              const evalData = await evalRes.json()
              console.log('[Apply] CV Evaluation:', evalData.evaluation?.overall)
            }
          } catch (evalErr) {
            console.warn('[Apply] CV evaluation failed (non-fatal):', evalErr)
          }

          // Done
          setParseStep('done')
          await new Promise(r => setTimeout(r, 1200))
        } catch (pipelineErr) {
          console.warn('[Apply] Resume pipeline error (non-fatal):', pipelineErr)
        } finally {
          setParsingOpen(false)
          setParseStep('idle')
        }
      }

      setSubmitted(true)
    } catch (error: any) {
      console.error('Application submission error:', error)
      alert(error.message || 'Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-600">Loading application form...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Application</h2>
          <p className="text-slate-600 mb-4">{error || 'Something went wrong.'}</p>
          <Button onClick={() => router.back()} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-emerald-200 bg-white shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for applying for <strong>{job.title}</strong> at {job.company.name}. We will review your application and get back to you soon.
          </p>
          <Button 
            onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)} 
            className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-semibold shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300"
          >
            Back to Job Listing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40" ref={appRootRef}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Compact heading */}
        <div className="mb-6 rounded-xl bg-emerald-600 text-white shadow-md px-5 py-4">
          <h1 className="text-xl font-bold tracking-tight">Apply for this position</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-100">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5">{job.title}</span>
            {job.location && <span className="rounded-full bg-white/15 px-2.5 py-0.5">{job.location}</span>}
            <span className="rounded-full bg-white/15 px-2.5 py-0.5">{job.company.name}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* General Information */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">General Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName" className="text-xs">First name *</Label>
                <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))} placeholder="John" className={`h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 ${fromScreening ? 'bg-slate-100 cursor-not-allowed' : ''}`} required disabled={isSubmitting} readOnly={fromScreening} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-xs">Last name *</Label>
                <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" className={`h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 ${fromScreening ? 'bg-slate-100 cursor-not-allowed' : ''}`} required disabled={isSubmitting} readOnly={fromScreening} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className={`h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 ${fromScreening ? 'bg-slate-100 cursor-not-allowed' : ''}`} required disabled={isSubmitting} readOnly={fromScreening} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">Phone *</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 1111" className="h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={isSubmitting} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Expected salary *</Label>
                <div className="grid grid-cols-[100px_1fr_auto] gap-2">
                  <select value={formData.expectedCurrency} onChange={(e) => setFormData(p => ({ ...p, expectedCurrency: e.target.value }))} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm focus:border-emerald-600 focus:ring-emerald-600 focus:outline-none">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                  <Input inputMode="decimal" value={formData.expectedSalary} onChange={(e) => setFormData(p => ({ ...p, expectedSalary: e.target.value }))} placeholder="1000" className={`h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 ${fromScreening ? 'bg-slate-100 cursor-not-allowed' : ''}`} required disabled={isSubmitting} readOnly={fromScreening} />
                  <span className="flex items-center text-xs text-slate-500">/month</span>
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="location" className="text-xs">Location *</Label>
                <Input id="location" value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Berlin, Germany" className="h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={isSubmitting} />
              </div>
            </div>
          </section>

          {/* Resume Upload + Photo — merged into one card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Resume & Photo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume — compact file picker */}
              <div>
                <Label className="text-xs mb-1.5 block">Upload Resume *</Label>
                <div
                  className={`flex items-center gap-3 rounded-lg border border-dashed px-3 py-3 cursor-pointer transition-colors ${
                    isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f) }}
                >
                  <Upload className="h-5 w-5 text-emerald-500 shrink-0" />
                  {resumeFile ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{resumeFile.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{Math.round(resumeFile.size / 1024)} KB</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="ml-auto text-xs text-slate-400 hover:text-red-500 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">Drop file or <span className="text-emerald-600 font-medium">browse</span></span>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, DOCX, TXT — max 10 MB</p>
              </div>

              {/* Photo — compact webcam */}
              <div>
                <Label className="text-xs mb-1.5 block">Capture Photo *</Label>
                <WebcamCapture
                  onCapture={(imageData) => setCapturedPhoto(imageData)}
                  capturedImage={capturedPhoto}
                  onClear={() => setCapturedPhoto(null)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>

          {/* Cover Letter */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Cover Letter</h3>
            <textarea value={formData.coverLetter} onChange={(e) => setFormData(p => ({ ...p, coverLetter: e.target.value }))} placeholder="Tell us why you're interested in this role..." rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm resize-y hover:border-emerald-400" disabled={isSubmitting} />
          </section>

          {/* Languages */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Languages</h3>
            <div className="space-y-2">
              {languages.map((lang, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <select value={lang.language} onChange={(e) => updateLanguage(index, 'language', e.target.value)} disabled={isSubmitting} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:border-emerald-600 focus:ring-emerald-600 focus:outline-none">
                    <option value="">Language</option>
                    {languageOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select value={lang.proficiency} onChange={(e) => updateLanguage(index, 'proficiency', e.target.value)} disabled={isSubmitting} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:border-emerald-600 focus:ring-emerald-600 focus:outline-none">
                    <option value="">Proficiency</option>
                    {proficiencyLevels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" onClick={() => removeLanguage(index)} disabled={isSubmitting || languages.length === 1} className="h-9 w-9 border-slate-300 text-slate-400 hover:text-red-500 hover:border-red-300"><X className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addLanguage} disabled={isSubmitting} className="h-8 text-xs border-slate-300 text-emerald-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Language
              </Button>
            </div>
          </section>

          {/* Additional Info */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Additional Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="linkedin" className="text-xs">LinkedIn URL</Label>
                <Input id="linkedin" value={formData.linkedinUrl} onChange={(e) => setFormData(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/..." className="h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="portfolio" className="text-xs">Portfolio / Website</Label>
                <Input id="portfolio" value={formData.portfolioUrl} onChange={(e) => setFormData(p => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://yoursite.com" className="h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="start" className="text-xs">Available Start Date *</Label>
                <Input id="start" type="date" value={formData.availableStartDate} onChange={(e) => setFormData(p => ({ ...p, availableStartDate: e.target.value }))} className="h-9 text-sm border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={isSubmitting} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input id="relocate" type="checkbox" checked={formData.relocate} onChange={(e) => setFormData(p => ({ ...p, relocate: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
                  <span className="text-xs text-slate-700">Willing to relocate</span>
                </label>
              </div>
            </div>
          </section>

          {/* Confirmation */}
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">
              Kindly confirm that you have not applied to <strong>{job.clientCompanyName || job.company.name}</strong> in the last 12 months (whether direct or through another agency).
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmationStatus('agree')} className={`rounded-md border px-4 py-1.5 text-xs font-medium transition-all ${confirmationStatus === 'agree' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-emerald-400'}`}>Agree</button>
              <button type="button" onClick={() => setConfirmationStatus('disagree')} className={`rounded-md border px-4 py-1.5 text-xs font-medium transition-all ${confirmationStatus === 'disagree' ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-red-400'}`}>Disagree</button>
            </div>
          </section>

          {/* Info correctness */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={infoCorrectChecked} onChange={(e) => setInfoCorrectChecked(e.target.checked)} disabled={isSubmitting} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 shrink-0" />
              <span className="text-xs text-slate-700 leading-relaxed">All the information must be correct and must not change during later rounds of Interview or Negotiation.</span>
            </label>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="outline" className="h-9 text-sm border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-6 font-semibold shadow-md hover:shadow-lg" disabled={isSubmitting || confirmationStatus !== 'agree' || !infoCorrectChecked}>
              {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : (<><Send className="w-4 h-4 mr-2" />Submit Application</>)}
            </Button>
          </div>
        </form>

        {/* What happens next */}
        <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
          <h4 className="font-semibold text-slate-800 mb-1.5 text-sm">What happens next?</h4>
          <ul className="space-y-0.5">
            <li>• Your application will be reviewed by our team</li>
            <li>• If qualified, you&apos;ll be contacted for the next steps</li>
            <li>• The process includes multiple stages tailored to this role</li>
            <li>• You&apos;ll receive updates on your application status</li>
          </ul>
        </div>
      </div>

      {/* Parsing Overlay */}
      {parsingOpen && <ParsingOverlay step={parseStep} />}
    </div>
  )
}

function ParsingOverlay({ step }: { step: 'idle' | 'uploading' | 'parsing' | 'evaluating' | 'done' }) {
  const steps = [
    { key: 'uploading', label: 'Uploading Resume' },
    { key: 'parsing', label: 'Parsing Resume' },
    { key: 'evaluating', label: 'Evaluating CV' },
    { key: 'done', label: 'Completed' },
  ] as const

  const order: Record<string, number> = { idle: -1, uploading: 0, parsing: 1, evaluating: 2, done: 3 }
  const curIndex = order[step] ?? -1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-[90%] max-w-md rounded-2xl border border-white/20 bg-white shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2.5 rounded-full bg-emerald-100 shrink-0">
            {step === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            )}
          </div>
          <div>
            <h2 className="text-slate-900 font-semibold text-base">
              {step === 'done' ? 'All done!' : "We're processing your resume"}
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {step === 'done' ? 'Your application has been processed successfully.' : 'This takes ~10-20 seconds. Please wait.'}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-1">
          {steps.map((s, i) => {
            const myIndex = order[s.key]
            const status = myIndex < curIndex ? 'done' : myIndex === curIndex ? 'active' : 'pending'
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center min-w-0">
                <div className="flex items-center w-full">
                  {i !== 0 && <div className={`h-0.5 flex-1 rounded ${myIndex <= curIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                  <div className={`flex items-center justify-center h-7 w-7 rounded-full border text-[10px] font-bold transition-all shrink-0 ${
                    status === 'done' ? 'bg-emerald-600 text-white border-emerald-600' :
                    status === 'active' ? 'bg-white text-emerald-700 border-emerald-500 shadow-md' :
                    'bg-white text-slate-400 border-slate-300'
                  }`}>
                    {status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i !== steps.length - 1 && <div className={`h-0.5 flex-1 rounded ${myIndex < curIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>
                <span className={`mt-1.5 text-[10px] font-medium text-center truncate max-w-[5rem] ${status === 'active' ? 'text-emerald-700' : status === 'done' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

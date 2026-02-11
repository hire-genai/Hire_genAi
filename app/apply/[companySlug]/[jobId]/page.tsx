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
  FileText
} from 'lucide-react'
import WebcamCapture from '@/components/webcam-capture'

interface JobData {
  id: string
  title: string
  location?: string
  clientCompanyName?: string | null
  company: {
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Green heading card */}
        <section className="mb-6 rounded-2xl bg-emerald-600/95 text-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-emerald-700/20 motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden relative z-10">
          <div className="px-6 py-6 md:px-8 md:py-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Apply for this position</h1>
            <p className="mt-2 text-emerald-50">Please fill out all required fields to submit your application.</p>
            <div className="mt-4 inline-flex items-center gap-3 text-emerald-100 text-sm">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.title}</span>
              {job.location && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.location}</span>
              )}
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.company.name}</span>
            </div>
          </div>
        </section>

        {/* Form card */}
        <section className="mt-10 w-full rounded-2xl border border-emerald-200 bg-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden relative z-0">
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4 md:px-8">
            <h2 className="font-semibold text-slate-900">Application Form</h2>
            <p className="text-sm text-emerald-700">Role: <span className="font-medium">{job.title}</span></p>
          </div>
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
              {/* General Information */}
              <section>
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">General Information (all required)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName} 
                      onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))} 
                      placeholder="John" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      required 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName} 
                      onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))} 
                      placeholder="Doe" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      required 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} 
                      placeholder="you@example.com" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      required 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} 
                      placeholder="+1 555 000 1111" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      required 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Expected salary *</Label>
                    <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                      <select 
                        value={formData.expectedCurrency} 
                        onChange={(e) => setFormData(p => ({ ...p, expectedCurrency: e.target.value }))}
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:ring-emerald-600 focus:outline-none transition-colors duration-200 hover:border-emerald-400"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="INR">INR</option>
                      </select>
                      <Input 
                        inputMode="decimal" 
                        value={formData.expectedSalary} 
                        onChange={(e) => setFormData(p => ({ ...p, expectedSalary: e.target.value }))} 
                        placeholder="1000" 
                        className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                        required 
                        disabled={isSubmitting} 
                      />
                      <div className="flex items-center text-slate-500 px-2">/month</div>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input 
                      id="location" 
                      value={formData.location} 
                      onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} 
                      placeholder="Berlin, Germany" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      required 
                      disabled={isSubmitting} 
                    />
                  </div>
                </div>
              </section>

              {/* Resume & Documents */}
              <section>
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Resume & Documents (required)</h3>
                <div
                  className={`rounded-md border border-dashed p-6 cursor-pointer shadow-sm hover:shadow-lg ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/60' 
                      : 'border-slate-300 hover:border-emerald-400/70 hover:bg-emerald-50/40'
                  }`}
                  role="button"
                  aria-label="Upload resume"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                >
                  <div className="block text-center text-slate-600 select-none pointer-events-none">
                    <Upload className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                    <div className="mb-3">Drag & drop file here</div>
                    <div className="inline-flex items-center rounded-md bg-emerald-600 text-white px-3 py-1 text-sm font-semibold">or click to select a file</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileSelect(f)
                    }}
                  />
                  {resumeFile && (
                    <div className="mt-3 text-sm text-slate-700 flex items-center justify-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        {resumeFile.name}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>{Math.round(resumeFile.size / 1024)} KB</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setResumeFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="ml-2 inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        × Remove
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Webcam Photo Capture */}
              <section>
                <WebcamCapture
                  onCapture={(imageData) => setCapturedPhoto(imageData)}
                  capturedImage={capturedPhoto}
                  onClear={() => setCapturedPhoto(null)}
                  disabled={isSubmitting}
                />
              </section>

              {/* Cover Letter */}
              <section>
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Cover Letter</h3>
                <textarea 
                  value={formData.coverLetter} 
                  onChange={(e) => setFormData(p => ({ ...p, coverLetter: e.target.value }))} 
                  placeholder="Tell us why you're interested in this role and what makes you a great fit..." 
                  rows={5} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm cursor-text resize-y transition-colors duration-200 hover:border-emerald-400" 
                  disabled={isSubmitting} 
                />
              </section>

              {/* Language and Proficiency */}
              <section>
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Language and Proficiency Levels</h3>
                <div className="space-y-3">
                  {languages.map((lang, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <select 
                          value={lang.language} 
                          onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                          disabled={isSubmitting}
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:ring-emerald-600 focus:outline-none transition-colors duration-200 hover:border-emerald-400"
                        >
                          <option value="">Select language</option>
                          {languageOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Proficiency Level</Label>
                        <select 
                          value={lang.proficiency} 
                          onChange={(e) => updateLanguage(index, 'proficiency', e.target.value)}
                          disabled={isSubmitting}
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:ring-emerald-600 focus:outline-none transition-colors duration-200 hover:border-emerald-400"
                        >
                          <option value="">Select proficiency</option>
                          {proficiencyLevels.map((level) => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeLanguage(index)}
                        disabled={isSubmitting || languages.length === 1}
                        className="border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors duration-200"
                        title="Remove language"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLanguage}
                    disabled={isSubmitting}
                    className="mt-2 border-slate-300 text-emerald-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Language
                  </Button>
                </div>
              </section>

              {/* Additional Information */}
              <section>
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input 
                      id="linkedin" 
                      value={formData.linkedinUrl} 
                      onChange={(e) => setFormData(p => ({ ...p, linkedinUrl: e.target.value }))} 
                      placeholder="https://linkedin.com/in/yourprofile" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio/Website</Label>
                    <Input 
                      id="portfolio" 
                      value={formData.portfolioUrl} 
                      onChange={(e) => setFormData(p => ({ ...p, portfolioUrl: e.target.value }))} 
                      placeholder="https://yourportfolio.com" 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start">Available Start Date *</Label>
                    <Input 
                      id="start" 
                      type="date" 
                      value={formData.availableStartDate} 
                      onChange={(e) => setFormData(p => ({ ...p, availableStartDate: e.target.value }))} 
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" 
                      required 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <input 
                      id="relocate" 
                      type="checkbox" 
                      checked={formData.relocate} 
                      onChange={(e) => setFormData(p => ({ ...p, relocate: e.target.checked }))} 
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 transition-transform duration-150 hover:scale-105" 
                    />
                    <Label htmlFor="relocate" className="cursor-pointer">I am willing to relocate for this position</Label>
                  </div>
                </div>
              </section>

              {/* Confirmation - Agree / Disagree */}
              <section className="pt-2">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    If you are interested in the application process, kindly check your previous applications (past LinkedIn applications and email threads) and confirm that you have not applied to <strong>{job.clientCompanyName || job.company.name}</strong> in the last 12 months (whether direct or through another agency).
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmationStatus('agree')}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-5 py-2 text-sm font-medium cursor-pointer transition-all duration-150 ${
                        confirmationStatus === 'agree'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                      }`}
                    >
                      Agree
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmationStatus('disagree')}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-5 py-2 text-sm font-medium cursor-pointer transition-all duration-150 ${
                        confirmationStatus === 'disagree'
                          ? 'bg-red-600 border-red-600 text-white shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-red-400 hover:bg-red-50'
                      }`}
                    >
                      Disagree
                    </button>
                  </div>
                </div>
              </section>

              {/* Information Correctness Checkbox */}
              <section className="pt-1">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={infoCorrectChecked}
                      onChange={(e) => setInfoCorrectChecked(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 transition-transform duration-150 hover:scale-105 shrink-0"
                    />
                    <span className="text-sm text-slate-700 leading-relaxed">
                      All the information must be correct and must not change during later rounds of Interview or Negotiation.
                    </span>
                  </label>
                </div>
              </section>

              {/* Submit bar */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200" 
                  onClick={() => router.back()} 
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-600/90 text-white text-base px-5 py-3 rounded-md font-semibold shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300"
                  disabled={isSubmitting || confirmationStatus !== 'agree' || !infoCorrectChecked}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="max-w-3xl mx-auto mt-6 p-4 bg-slate-50 rounded-md border">
              <h4 className="font-semibold mb-2">What happens next?</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Your application will be reviewed by our team</li>
                <li>• If qualified, you&apos;ll be contacted for the next steps</li>
                <li>• The process includes multiple stages tailored to this role</li>
                <li>• You&apos;ll receive updates on your application status</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

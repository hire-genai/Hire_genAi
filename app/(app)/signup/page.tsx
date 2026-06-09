"use client"

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  MapPin,
  FileText,
  User2,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  Home,
  Mail,
  Lock,
  RefreshCw,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Star,
} from "lucide-react"

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Hospitality",
  "Other",
]

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
]

// Country mapping: Display Name -> ISO Code
const countryOptions = [
  { name: "United States", code: "US" },
  { name: "India", code: "IN" },
  { name: "United Kingdom", code: "GB" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Singapore", code: "SG" },
  { name: "UAE", code: "AE" },
  { name: "Other", code: "XX" },
]

// Separate component to handle search params
function SignupContent() {
  const router = useRouter()
  const { setAuthSession, user, loading: authLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    if (authLoading) return

    if (user) {
      router.replace('/dashboard')
      return
    }
  }, [user, authLoading])
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // ... rest of the code remains the same ...

  const [form, setForm] = useState({
    // step 1
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
    companyDescription: "",
    // step 2
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    // step 3
    legalCompanyName: "",
    taxId: "",
    registrationNumber: "",
    // step 4
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    // step 5 - consent
    agreeTos: false,
    agreePrivacy: false,
    agreeMarketing: false,
  })

  // OTP state (Step 4)
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpLoading, setOtpLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Capture plan/billing from URL on mount — the URL gets rewritten as steps advance
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('annual')

  const totalSteps = 5
  const progressPct = useMemo(() => Math.round(((step - 1) / (totalSteps - 1)) * 100), [step])

  // Map steps <-> section slugs for readable URLs
  const stepToSection = (s: number) => (
    s === 1 ? 'company' :
    s === 2 ? 'contact' :
    s === 3 ? 'legal' :
    s === 4 ? 'manager' :
    'review'
  )
  const sectionToStep = (sec?: string | null) => {
    switch ((sec || '').toLowerCase()) {
      case 'company': return 1
      case 'contact': return 2
      case 'legal': return 3
      case 'manager': return 4
      case 'review': return 5
      default: return 1
    }
  }

  // Initialize step from URL on first render (only after mount)
  useEffect(() => {
    if (!mounted) return

    const urlParams = new URLSearchParams(window.location.search)
    const sec = urlParams.get('section')
    const target = sectionToStep(sec)
    setStep(target)

    // Capture plan/billing before URL gets rewritten by step navigation
    const plan = urlParams.get('plan')
    const billing = urlParams.get('billing')
    if (plan) setSelectedPlan(plan)
    if (billing === 'monthly') setSelectedBilling('monthly')
    else if (billing === 'annual') setSelectedBilling('annual')
  }, [mounted])

  // Update URL whenever step changes (but avoid infinite loop)
  useEffect(() => {
    if (!mounted) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const currentSection = urlParams.get('section')
    const expectedSection = stepToSection(step)
    
    // Only update URL if it doesn't match current step
    if (currentSection !== expectedSection) {
      router.replace(`/signup?section=${expectedSection}`, { scroll: false })
    }
  }, [step, mounted, router])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!mounted) return
    
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const currentSection = urlParams.get('section')
      if (currentSection) {
        const newStep = sectionToStep(currentSection)
        if (newStep && newStep !== step) {
          setStep(newStep)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [mounted, step])

  const next = () => {
    // Validate current step before proceeding
    if (step === 1) {
      // Company Information - all fields marked with * are required
      if (!form.companyName || !form.industry || !form.companySize) {
        alert('Please fill in all required fields marked with *')
        return
      }
    } else if (step === 2) {
      // Contact Information - all fields marked with * are required
      if (!form.street || !form.city || !form.state || !form.postalCode || !form.country) {
        alert('Please fill in all required fields marked with *')
        return
      }
    } else if (step === 3) {
      // Legal Information - Legal Company Name is required
      if (!form.legalCompanyName) {
        alert('Please fill in the Legal Company Name marked with *')
        return
      }
    } else if (step === 4) {
      // Admin Account - name and email are required
      if (!form.firstName || !form.lastName || !form.email) {
        alert('Please fill in all required fields marked with *')
        return
      }
    }
    setStep((s) => Math.min(totalSteps, s + 1))
  }
  const prev = () => {
    if (step > 1) {
      const newStep = step - 1
      setStep(newStep)
      const newSection = stepToSection(newStep)
      router.replace(`/signup?section=${newSection}`, { scroll: false })
    }
  }

  // Check if current step's required fields are filled
  const isStepValid = () => {
    if (step === 1) {
      // Company Information - all fields marked with * are required
      return !!(form.companyName && form.industry && form.companySize)
    } else if (step === 2) {
      // Contact Information - all fields marked with * are required
      return !!(form.street && form.city && form.state && form.postalCode && form.country)
    } else if (step === 3) {
      // Legal Information - Legal Company Name is required
      return !!form.legalCompanyName
    } else if (step === 4) {
      // Admin Account - name and email are required
      return !!(form.firstName && form.lastName && form.email)
    }
    return true // Step 5 doesn't need validation for Next button (it's the submit button)
  }

  const onField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value
    setForm((f) => ({ ...f, [key]: value as any }))
  }

  // Countdown timer for resend
  React.useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  // If verified, stop any countdown and freeze controls
  React.useEffect(() => {
    if (otpVerified && countdown !== 0) {
      setCountdown(0)
    }
  }, [otpVerified, countdown])

  // Handlers for OTP
  const handleSendOtp = async () => {
    if (!form.email || !form.firstName || !form.lastName) return
    setOtpLoading(true)
    setErrorMessage(null)
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim()
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, fullName, companyName: form.companyName })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to send OTP')
      setOtpSent(true)
      setCountdown(30)
    } catch (e) {
      console.error('Send OTP failed', e)
      setErrorMessage(e instanceof Error ? e.message : 'Failed to send verification code')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || !form.email) return
    setOtpLoading(true)
    setErrorMessage(null)
    try {
      // Just verify the OTP is valid, don't create user/company yet
      // That will happen in onSubmit with all the form data
      const res = await fetch('/api/otp/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp, purpose: 'signup' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to verify OTP')
      setOtpVerified(true)
      setCountdown(0)
    } catch (e) {
      console.error('Verify OTP failed', e)
      setErrorMessage(e instanceof Error ? e.message : 'Failed to verify OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otpVerified) {
      setErrorMessage('Please verify your email first')
      return
    }

    if (!form.agreeTos || !form.agreePrivacy) {
      setErrorMessage('Please agree to Terms of Service and Privacy Policy')
      return
    }

    // Prevent multiple submissions
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          otp: otp,
          // Step 1: Company Information
          companyName: form.companyName,
          industry: form.industry,
          companySize: form.companySize,
          website: form.website,
          companyDescription: form.companyDescription,
          // Step 2: Contact Information
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone,
          // Step 3: Legal Information
          legalCompanyName: form.legalCompanyName,
          taxId: form.taxId,
          registrationNumber: form.registrationNumber,
          // Step 4: Admin Account
          firstName: form.firstName,
          lastName: form.lastName,
          jobTitle: form.jobTitle,
          // Step 5: Consent
          agreeTos: form.agreeTos,
          agreePrivacy: form.agreePrivacy,
          // Plan selection from /pricing (captured on mount before URL rewrite)
          planName: selectedPlan || undefined,
          billing: selectedPlan ? selectedBilling : undefined,
        })
      })

      const data = await res.json().catch(() => ({}))
      
      if (!res.ok || data?.error) {
        throw new Error(data?.error || 'Signup failed')
      }

      // Store session token if needed
      if (data.session?.refreshToken) {
        localStorage.setItem('refreshToken', data.session.refreshToken)
      }

      // Set auth session so user is logged in immediately (no redirect to /login needed)
      if (data.user && data.company) {
        setAuthSession(
          {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name,
            status: data.user.status || 'active',
          },
          {
            id: data.company.id,
            name: data.company.name,
            status: data.company.status || 'active',
            verified: data.company.verified || false,
          }
        )
      }

      if (data.checkoutUrl) {
        // Came from /pricing with a plan → Stripe checkout
        window.location.href = data.checkoutUrl
      } else {
        // Normal signup → dashboard
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      setErrorMessage(error?.message || 'Failed to complete signup. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#03110A', color: '#fff' }}>
      {/* Top Bar */}
      <header style={{ background: 'rgba(3,17,10,0.97)', borderBottom: '1px solid rgba(0,177,79,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center text-sm gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Home className="w-4 h-4" />
            <Link href="/" style={{ color: 'rgba(255,255,255,0.6)' }} className="hover:text-white">Home</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="font-bold">
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <span style={{ color: '#fff' }}>Hire-</span>
                <span style={{ color: '#00B14F' }}>GenAI</span>
              </Link>
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#00B14F', background: 'rgba(0,177,79,0.12)', border: '1px solid rgba(0,177,79,0.3)', borderRadius: '100px', padding: '4px 12px' }}>Step {step} of {totalSteps}</span>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#00B14F,#00C853)', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: '#fff' }}>Company Registration</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Complete all steps to set up your HireGenAI account</p>

        {/* Error Message Display */}
        {errorMessage && (
          <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: '#FCA5A5', fontSize: '14px', fontWeight: 500 }}>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ marginLeft: 'auto', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6">
          {step === 1 && (
            <Card className="sr-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px' }}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,177,79,0.15)' }}>
                  <Building2 className="w-5 h-5" style={{ color: '#00B14F' }} />
                </div>
                <CardTitle className="text-2xl" style={{ color: '#fff' }}>Company Information</CardTitle>
                <CardDescription style={{ color: 'rgba(255,255,255,0.5)' }}>Tell us about your company and what you do</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" value={form.companyName} onChange={onField("companyName")} required className="sr-input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                      <SelectTrigger id="industry" className="sr-select w-full"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {industries.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select value={form.companySize} onValueChange={(v) => setForm((f) => ({ ...f, companySize: v }))}>
                      <SelectTrigger id="companySize" className="sr-select w-full"><SelectValue placeholder="Select company size" /></SelectTrigger>
                      <SelectContent>
                        {companySizes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="https://www.example.com" value={form.website} onChange={onField("website")} className="sr-input" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea id="companyDescription" placeholder="Brief description of your company and what you do..." value={form.companyDescription} onChange={onField("companyDescription")} className="sr-input" />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="sr-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px' }}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <MapPin className="w-5 h-5" style={{ color: '#60A5FA' }} />
                </div>
                <CardTitle className="text-2xl" style={{ color: '#fff' }}>Contact Information</CardTitle>
                <CardDescription style={{ color: 'rgba(255,255,255,0.5)' }}>Where is your company located?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input id="street" value={form.street} onChange={onField("street")} required className="sr-input" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} onChange={onField("city")} required className="sr-input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input id="state" value={form.state} onChange={onField("state")} required className="sr-input" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP/Postal Code *</Label>
                    <Input id="postalCode" value={form.postalCode} onChange={onField("postalCode")} required className="sr-input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={form.country} onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}>
                      <SelectTrigger id="country" className="sr-select w-full"><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" value={form.phone} onChange={onField("phone")} className="sr-input" />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="sr-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px' }}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <FileText className="w-5 h-5" style={{ color: '#A5B4FC' }} />
                </div>
                <CardTitle className="text-2xl" style={{ color: '#fff' }}>Legal Information</CardTitle>
                <CardDescription style={{ color: 'rgba(255,255,255,0.5)' }}>Legal details for compliance and verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="legalCompanyName">Legal Company Name *</Label>
                  <Input id="legalCompanyName" value={form.legalCompanyName} onChange={onField("legalCompanyName")} required className="sr-input" />
                  <p className="text-xs text-slate-500">This should match your official business registration</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN</Label>
                    <Input id="taxId" value={form.taxId} onChange={onField("taxId")} className="sr-input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Business Registration Number</Label>
                    <Input id="registrationNumber" value={form.registrationNumber} onChange={onField("registrationNumber")} className="sr-input" />
                  </div>
                </div>
                <div className="rounded-md p-3 text-sm flex items-start gap-2" style={{ background: 'rgba(0,177,79,0.08)', border: '1px solid rgba(0,177,79,0.2)', color: 'rgba(255,255,255,0.6)' }}>
                  <CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: '#00B14F' }} />
                  This information is used for verification purposes and is kept secure and confidential.
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="sr-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px' }}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
                  <User2 className="w-5 h-5" style={{ color: '#C084FC' }} />
                </div>
                <CardTitle className="text-2xl" style={{ color: '#fff' }}>Manager Account</CardTitle>
                <CardDescription style={{ color: 'rgba(255,255,255,0.5)' }}>Set up the primary manager account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={form.firstName} onChange={onField("firstName")} required className="sr-input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={form.lastName} onChange={onField("lastName")} required className="sr-input" />
                  </div>
                </div>
                {/* Email + OTP Combined */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={form.email} onChange={onField("email")} required disabled={otpVerified} className="sr-input" />
                  {!otpVerified && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                      <div className="md:col-span-3">
                        <p className="text-xs text-slate-500">We'll send a verification code to this email.</p>
                      </div>
                      <div className="md:col-span-1">
                        <Button type="button" variant="outline" disabled={otpLoading || countdown > 0 || !form.email} onClick={handleSendOtp} className="w-full">
                          {otpLoading && countdown === 0 ? (
                            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Send</>
                          ) : countdown > 0 ? (
                            <>Resend {countdown}s</>
                          ) : (
                            <>Send Code</>
                          )}
                        </Button>
                      </div>
                      <div className="md:col-span-1">
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                          <Input
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            disabled={otpLoading}
                            className="pl-9 text-center tracking-widest font-mono sr-input disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <Button type="button" disabled={otpLoading || otp.length < 4} onClick={handleVerifyOtp} className="w-full">
                          {otpLoading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {otpVerified ? (
                    <div className="text-sm rounded-md p-3" style={{ color: '#6EE7B7', background: 'rgba(0,177,79,0.1)', border: '1px solid rgba(0,177,79,0.3)' }}>Email verified successfully.</div>
                  ) : (otpSent ? (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Enter the 6-digit code we sent to {form.email}. In development, check terminal logs for the code.</p>
                  ) : null)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" placeholder="CEO, HR Director, etc." value={form.jobTitle} onChange={onField("jobTitle")} className="sr-input" />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card className="sr-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px' }}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,177,79,0.15)' }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#00B14F' }} />
                </div>
                <CardTitle className="text-2xl" style={{ color: '#fff' }}>Review & Complete</CardTitle>
                <CardDescription style={{ color: 'rgba(255,255,255,0.5)' }}>Review your information and complete registration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg p-4" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#fff' }}>Company Summary</h3>
                    <div className="text-sm space-y-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Company:</span> {form.companyName || "—"}</div>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Industry:</span> {form.industry || "—"}</div>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Size:</span> {form.companySize || "—"}</div>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Location:</span> {[form.city, form.state, countryOptions.find(c => c.code === form.country)?.name].filter(Boolean).join(', ') || "—"}</div>
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#fff' }}>Administrator</h3>
                    <div className="text-sm space-y-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Name:</span> {[form.firstName, form.lastName].filter(Boolean).join(' ') || "—"}</div>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Email:</span> {form.email || "—"}</div>
                      <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Title:</span> {form.jobTitle || "Not specified"}</div>
                    </div>
                  </div>
                </div>

                <Separator style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <input id="tos" type="checkbox" className="h-4 w-4" checked={form.agreeTos} onChange={(e) => setForm(f => ({...f, agreeTos: e.target.checked}))} />
                    <label htmlFor="tos">I agree to the <a style={{ color: '#00B14F' }} href="#">Terms of Service</a> and <a style={{ color: '#00B14F' }} href="#">Privacy Policy</a> *</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <input id="privacy" type="checkbox" className="h-4 w-4" checked={form.agreePrivacy} onChange={(e) => setForm(f => ({...f, agreePrivacy: e.target.checked}))} />
                    <label htmlFor="privacy">I consent to the processing of my personal data as described in the Privacy Policy *</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <input id="marketing" type="checkbox" className="h-4 w-4" checked={form.agreeMarketing} onChange={(e) => setForm(f => ({...f, agreeMarketing: e.target.checked}))} />
                    <label htmlFor="marketing">I would like to receive product updates and marketing communications (optional)</label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={prev} disabled={step === 1} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            {step < totalSteps ? (
              <Button type="button" onClick={next} disabled={!isStepValid()} style={{ background: 'linear-gradient(135deg,#00B14F,#00C853)', color: '#fff', border: 'none', opacity: !isStepValid() ? 0.5 : 1 }}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={!form.agreeTos || !form.agreePrivacy || submitting} style={{ background: 'linear-gradient(135deg,#00B14F,#00C853)', color: '#fff', border: 'none', opacity: !form.agreeTos || !form.agreePrivacy || submitting ? 0.5 : 1 }}>
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            )}
          </div>
        </form>

        <div className="text-center text-sm mt-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Need help? <a style={{ color: '#00B14F' }} href="/contact">Contact our support team</a>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-white py-16" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-6 md:gap-12 mb-12">
            {/* Left Section - Brand Block */}
            <div className="col-span-2 md:col-span-3">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
              </p>
              <p className="text-slate-400 mb-6 text-sm font-medium">
                Email: <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@hire-genai.com</a>
              </p>
              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/hire-genai" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/demo-en" className="hover:text-emerald-400 transition-colors">
                    Try the Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      const element = document.getElementById('assessment');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-left w-full"
                  >
                    Assessment
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      const element = document.getElementById('faq');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-left w-full"
                  >
                    FAQs
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-emerald-400 transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book-meeting" className="hover:text-emerald-400 transition-colors">
                    Book a Meeting
                  </Link>
                </li>
                <li>
                  <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Section - Badges Block */}
            <div className="col-span-1 md:col-span-3">
              <div className="space-y-4">
                {/* Trustpilot Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
                </div>

                {/* GDPR Compliant Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                  </div>
                  <p className="text-xs text-slate-400">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2024 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Main export component with Suspense wrapper
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#03110A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div style={{ width: 36, height: 36, border: '3px solid rgba(0,177,79,0.3)', borderTopColor: '#00B14F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}

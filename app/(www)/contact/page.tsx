"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle, ArrowRight } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"


const TOOLS_OPTIONS = [
  { value: 'ATS', label: 'ATS (Naukri, Monster)' },
  { value: 'CRM', label: 'CRM (Salesforce, Zoho)' },
  { value: 'Scheduling', label: 'Scheduling Tools' },
  { value: 'AssessmentTools', label: 'Assessment Tools' },
  { value: 'EmailMarketing', label: 'Email Marketing' },
  { value: 'None', label: 'None - Manual Process' },
]

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    companySize: '',
    industry: '',
    monthlyHires: '',
    painPoints: '',
    budget: '',
    timeline: '',
  })
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if all required fields are filled
  const isFormValid = formData.companyName && 
                     formData.contactPerson && 
                     formData.email && 
                     formData.mobile && 
                     formData.companySize && 
                     formData.industry &&
                     formData.email.includes('@') // Basic email validation

  const toggleTool = (value: string) => {
    setSelectedTools(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch('/api/contact-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tools: selectedTools }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to submit. Please try again.')
      }
      router.push('/signup')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Revolutionize Your Hiring with AI-Powered Recruitment
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              All-in-one recruitment platform that replaces 15+ tools.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
            {['AI Resume Screening', 'Candidate CRM & Pipeline', 'Automated Interview Scheduling', 'AI Agent for Initial Screening', 'Video Interview Analysis', 'Automated Candidate Communication', 'ATS Integration', 'Analytics & Reporting'].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-slate-700">
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Right - Benefits */}
              <div className="lg:pl-4">
                <div className="sticky top-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Why HireGenAI?</h3>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">All-in-One Platform</h4>
                        <p className="text-sm text-slate-600">Replace 15+ tools with one unified solution for sourcing, screening, and hiring.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">AI-Powered Screening</h4>
                        <p className="text-sm text-slate-600">Our AI analyzes resumes and conducts initial interviews 24/7.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Save Time & Money</h4>
                        <p className="text-sm text-slate-600">Reduce time-to-hire by 80% and cut recruitment costs significantly.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-600 mb-2">Individual tools cost per month</div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">₹1,61,200</div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                      <span className="text-xl font-bold text-emerald-600">HireGenAI: ₹9,700</span>
                    </div>
                    <div className="text-sm text-emerald-600 mt-2 font-medium">Save 94% annually</div>
                  </div>
                </div>
              </div>

              {/* Left - Form */}
              <div className="lg:pr-4">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Start Your Free Trial</h2>
                <p className="text-slate-600 mb-8">7 days free • No setup fee • Cancel anytime</p>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        required
                        placeholder="Your company"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Contact Person <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                        required
                        placeholder="Your name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="you@company.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mobile <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                        required
                        placeholder="10-digit number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Company Size <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.companySize}
                        onChange={e => setFormData({ ...formData, companySize: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.5rem_center] pr-8 text-sm"
                      >
                        <option value="">Select size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="200+">200+ employees</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Industry <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.industry}
                        onChange={e => setFormData({ ...formData, industry: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.5rem_center] pr-8 text-sm"
                      >
                        <option value="">Select industry</option>
                        <option value="IT">IT & Software</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Retail">Retail</option>
                        <option value="Finance">Finance & Banking</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Biggest Recruitment Challenges
                    </label>
                    <textarea
                      value={formData.painPoints}
                      onChange={e => setFormData({ ...formData, painPoints: e.target.value })}
                      rows={3}
                      placeholder="E.g., Too many unqualified applications, scheduling conflicts, high time-to-hire..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Monthly Budget for Recruitment Tools
                      </label>
                      <select
                        value={formData.budget}
                        onChange={e => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.5rem_center] pr-8 text-sm"
                      >
                        <option value="">Select Budget Range</option>
                        <option value="&lt;5000">Less than ₹5,000</option>
                        <option value="5000-20000">₹5,000 – ₹20,000</option>
                        <option value="20000-50000">₹20,000 – ₹50,000</option>
                        <option value="50000+">₹50,000+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Implementation Timeline
                      </label>
                      <select
                        value={formData.timeline}
                        onChange={e => setFormData({ ...formData, timeline: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.5rem_center] pr-8 text-sm"
                      >
                        <option value="">Select Timeline</option>
                        <option value="immediate">Immediate (Within 2 weeks)</option>
                        <option value="1month">1 Month</option>
                        <option value="3months">1–3 Months</option>
                        <option value="6months">3–6 Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Tools (optional)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TOOLS_OPTIONS.map(tool => (
                        <label key={tool.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTools.includes(tool.value)}
                            onChange={() => toggleTool(tool.value)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-700">{tool.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className={`w-full font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      isFormValid && !isLoading 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Start 7-Day Free Trial
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    No credit card required. By signing up, you agree to our{' '}
                    <Link href="/terms" className="text-emerald-600 hover:underline">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

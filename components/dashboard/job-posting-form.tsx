'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Minus, Save, Send, CheckCircle } from 'lucide-react'

interface JobPostingFormProps {
  onClose: () => void
}

export function JobPostingForm({ onClose }: JobPostingFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Basic Job Information
    jobTitle: '',
    department: '',
    location: '',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    applicationDeadline: '',
    expectedStartDate: '',
    
    // Hiring Team & Ownership
    recruiterAssigned: 'Sarah Johnson',
    hiringManager: '',
    hiringManagerEmail: '',
    interviewPanelMembers: [''],
    
    // Job Details
    jobDescription: '',
    responsibilities: [''],
    requiredSkills: [''],
    preferredSkills: [''],
    experienceYears: '',
    requiredEducation: '',
    certificationsRequired: '',
    languagesRequired: '',
    
    // Capacity & Planning
    numberOfOpenings: '1',
    hiringPriority: 'Medium',
    targetTimeToFill: '30',
    budgetAllocated: '',
    
    // Dashboard Metrics & Tracking
    jobOpenDate: new Date().toISOString().split('T')[0],
    expectedHiresPerMonth: '',
    targetOfferAcceptanceRate: '80',
    candidateResponseTimeSLA: '24',
    interviewScheduleSLA: '48',
    costPerHireBudget: '',
    agencyFeePercentage: '20',
    jobBoardCosts: '',
    
    // Sourcing Strategy
    targetSources: [] as string[],
    diversityGoals: false,
    diversityTargetPercentage: '',
  })

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateArrayField = (field: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), '']
    }))
  }

  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }))
  }

  const toggleSourceSelection = (source: string) => {
    setFormData(prev => ({
      ...prev,
      targetSources: prev.targetSources.includes(source)
        ? prev.targetSources.filter(s => s !== source)
        : [...prev.targetSources, source]
    }))
  }

  const handleSubmit = (isDraft: boolean) => {
    const status = isDraft ? 'Draft' : 'Open'
    alert(`Job posting ${isDraft ? 'saved as draft' : 'published'}!\n\nStatus: ${status}\nTitle: ${formData.jobTitle}\nDepartment: ${formData.department}`)
    onClose()
  }

  const steps = [
    { number: 1, title: 'Job Basics', fields: 10 },
    { number: 2, title: 'Job Details', fields: 8 },
    { number: 3, title: 'Team & Planning', fields: 7 },
    { number: 4, title: 'Metrics & Tracking', fields: 8 },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 border-b flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xl font-semibold">Post New Job</h3>
            <p className="text-sm text-gray-600">Capture all details for accurate tracking and reporting</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="bg-transparent">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= step.number 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.number}
                  </div>
                  <div className="text-xs mt-1 text-center font-medium">{step.title}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2">Basic Job Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => updateField('jobTitle', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Senior Full Stack Developer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => updateField('department', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="HR">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. San Francisco, CA or Remote"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.jobType}
                    onChange={(e) => updateField('jobType', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.workMode}
                    onChange={(e) => updateField('workMode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Range - Min
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => updateField('salaryMin', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 120000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Range - Max
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => updateField('salaryMax', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 180000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => updateField('applicationDeadline', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedStartDate}
                    onChange={(e) => updateField('expectedStartDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Job Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2">Job Details & Requirements</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.jobDescription}
                  onChange={(e) => updateField('jobDescription', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide a detailed description of the role, company culture, and what makes this opportunity unique..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Responsibilities
                </label>
                <textarea
                  value={formData.responsibilities.join('\n')}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value.split('\n') }))}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter each responsibility on a new line, e.g.:&#10;Lead technical architecture and implementation&#10;Design and implement scalable solutions&#10;Collaborate with cross-functional teams&#10;Mentor junior developers"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skills
                  </label>
                  <textarea
                    value={formData.requiredSkills.join('\n')}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiredSkills: e.target.value.split('\n') }))}
                    rows={5}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter each skill on a new line, e.g.:&#10;React&#10;Node.js&#10;TypeScript&#10;PostgreSQL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Skills
                  </label>
                  <textarea
                    value={formData.preferredSkills.join('\n')}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredSkills: e.target.value.split('\n') }))}
                    rows={5}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter each skill on a new line, e.g.:&#10;AWS&#10;Docker&#10;Kubernetes&#10;GraphQL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience Required
                  </label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => updateField('experienceYears', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Education
                  </label>
                  <input
                    type="text"
                    value={formData.requiredEducation}
                    onChange={(e) => updateField('requiredEducation', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Bachelor's in Computer Science"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certifications Required
                  </label>
                  <input
                    type="text"
                    value={formData.certificationsRequired}
                    onChange={(e) => updateField('certificationsRequired', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. AWS Certified Solutions Architect"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Languages Required
                  </label>
                  <input
                    type="text"
                    value={formData.languagesRequired}
                    onChange={(e) => updateField('languagesRequired', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. English (Fluent), Spanish (Preferred)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Team & Planning */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2">Hiring Team & Planning</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recruiter Assigned <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.recruiterAssigned}
                    onChange={(e) => updateField('recruiterAssigned', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Sarah Johnson"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hiring Manager
                  </label>
                  <input
                    type="text"
                    value={formData.hiringManager}
                    onChange={(e) => updateField('hiringManager', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. David Lee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hiring Manager Email
                  </label>
                  <input
                    type="email"
                    value={formData.hiringManagerEmail}
                    onChange={(e) => updateField('hiringManagerEmail', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. david.lee@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Openings
                  </label>
                  <input
                    type="number"
                    value={formData.numberOfOpenings}
                    onChange={(e) => updateField('numberOfOpenings', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hiring Priority
                  </label>
                  <select
                    value={formData.hiringPriority}
                    onChange={(e) => updateField('hiringPriority', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Time to Fill (days)
                  </label>
                  <input
                    type="number"
                    value={formData.targetTimeToFill}
                    onChange={(e) => updateField('targetTimeToFill', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Allocated (Recruitment Costs)
                  </label>
                  <input
                    type="number"
                    value={formData.budgetAllocated}
                    onChange={(e) => updateField('budgetAllocated', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Sourcing Channels
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['LinkedIn', 'GitHub', 'Indeed', 'Referral', 'Company Career Page', 'Job Boards', 'Recruiting Events', 'Social Media'].map(source => (
                    <div
                      key={source}
                      onClick={() => toggleSourceSelection(source)}
                      className={`p-2 border rounded text-xs text-center cursor-pointer transition-all ${
                        formData.targetSources.includes(source)
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {source}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Metrics & Tracking */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h5 className="text-sm font-semibold text-blue-900 mb-1">Dashboard KPI Tracking</h5>
                <p className="text-xs text-blue-700">
                  These fields help calculate key metrics like Time to Fill, Cost Per Hire, Hiring Velocity, and Team Capacity Load that appear on your dashboard.
                </p>
              </div>

              <h4 className="font-semibold text-lg border-b pb-2">Performance Targets & SLAs</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Open Date
                  </label>
                  <input
                    type="date"
                    value={formData.jobOpenDate}
                    onChange={(e) => updateField('jobOpenDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to calculate Time to Fill metric</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Hires Per Month
                  </label>
                  <input
                    type="number"
                    value={formData.expectedHiresPerMonth}
                    onChange={(e) => updateField('expectedHiresPerMonth', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Hiring Velocity tracking</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Offer Acceptance Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.targetOfferAcceptanceRate}
                    onChange={(e) => updateField('targetOfferAcceptanceRate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 80"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Manager KPI: Offer acceptance goal</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Candidate Response Time SLA (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.candidateResponseTimeSLA}
                    onChange={(e) => updateField('candidateResponseTimeSLA', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 24"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recruiter KPI: Response time target</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interview Schedule SLA (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.interviewScheduleSLA}
                    onChange={(e) => updateField('interviewScheduleSLA', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 48"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time to schedule after approval</p>
                </div>
              </div>

              <h4 className="font-semibold text-lg border-b pb-2 mt-6">Cost Tracking</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Per Hire Budget ($)
                  </label>
                  <input
                    type="number"
                    value={formData.costPerHireBudget}
                    onChange={(e) => updateField('costPerHireBudget', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 4200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Director KPI: Target cost per hire</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency Fee (% of salary)
                  </label>
                  <input
                    type="number"
                    value={formData.agencyFeePercentage}
                    onChange={(e) => updateField('agencyFeePercentage', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 20"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">If using recruitment agency</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Board Costs ($)
                  </label>
                  <input
                    type="number"
                    value={formData.jobBoardCosts}
                    onChange={(e) => updateField('jobBoardCosts', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 500"
                  />
                  <p className="text-xs text-gray-500 mt-1">LinkedIn, Indeed, etc. posting costs</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
                <h5 className="font-semibold text-sm text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Dashboard Metrics Enabled
                </h5>
                <p className="text-xs text-green-800 mb-2">
                  With this data, your dashboard will calculate:
                </p>
                <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
                  <li><strong>Recruiter:</strong> Open Reqs, Pipeline Health, Response Time, Submittal Quality</li>
                  <li><strong>Manager:</strong> Time to Fill, Offer Acceptance Rate, Team Capacity, Source Quality</li>
                  <li><strong>Director:</strong> Hiring Velocity, Cost Per Hire, Forecast vs Actual, ROI</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 p-4 border-t flex items-center justify-between bg-white">
          <div className="text-sm text-gray-600">
            Step {currentStep} of {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="bg-transparent"
              >
                Previous
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              className="bg-transparent"
            >
              <Save className="h-4 w-4 mr-1" />
              Save as Draft
            </Button>
            {currentStep < steps.length ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Next
              </Button>
            ) : (
              <Button onClick={() => handleSubmit(false)}>
                <Send className="h-4 w-4 mr-1" />
                Publish Job
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

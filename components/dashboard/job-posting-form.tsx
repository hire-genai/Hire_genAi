'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Minus, Save, Send, CheckCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react'

interface JobPostingFormProps {
  onClose: () => void
}

// Evaluation criteria - simple list of names only
const EVALUATION_CRITERIA = [
  'Technical Skills',
  'Problem Solving',
  'Communication',
  'Experience',
  'Culture Fit',
  'Teamwork / Collaboration',
  'Leadership',
  'Adaptability / Learning',
  'Work Ethic / Reliability',
]

interface InterviewQuestion {
  id: number
  question: string
  criterion: string
  isCustom?: boolean
}

export function JobPostingForm({ onClose }: JobPostingFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([])
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [customQuestionText, setCustomQuestionText] = useState('')
  const [customQuestionCriterion, setCustomQuestionCriterion] = useState('')
  const [isAddingCustomQuestion, setIsAddingCustomQuestion] = useState(false)
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
    
    // Client Company
    clientCompanyName: '',
    
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
    
    // AI Interview Questions (Step 3)
    selectedCriteriaIds: [] as string[],
    generatedQuestions: [] as InterviewQuestion[],
    
    // Auto Schedule Interview
    autoScheduleInterview: false,
    interviewLinkExpiryHours: 48,
    
    // Screening Questions (Step 4)
    enableScreeningQuestions: false,
    screeningQuestions: {
      minExperience: '',
      expectedSkills: [] as string[],
      expectedSalary: '',
      noticePeriodNegotiable: null as boolean | null,
      workAuthorization: '' as string,
      noticePeriod: '',
    },
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

  const toggleCriterionSelection = (criterionName: string) => {
    setSelectedCriteria(prev => {
      if (prev.includes(criterionName)) {
        return prev.filter(name => name !== criterionName)
      } else if (prev.length < 5) {
        return [...prev, criterionName]
      }
      return prev // Max 5 criteria
    })
  }


  const generateInterviewQuestions = async () => {
    if (selectedCriteria.length === 0) {
      alert('Please select at least one evaluation criterion')
      return
    }
    if (!formData.jobDescription) {
      alert('Please fill in the job description in Step 2 first')
      return
    }

    setIsGeneratingQuestions(true)
    
    try {
      // Build criteria list for the prompt
      const selectedCriteriaNames = selectedCriteria

      // Simulate AI generation (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate mock questions based on selected criteria
      const mockQuestions: InterviewQuestion[] = []
      let questionId = 1
      
      // Distribute 10 questions across selected criteria
      const questionsPerCriterion = Math.floor(10 / selectedCriteria.length)
      const remainder = 10 % selectedCriteria.length
      
      selectedCriteria.forEach((criterionName, index) => {
        const numQuestions = questionsPerCriterion + (index < remainder ? 1 : 0)
        
        for (let i = 0; i < numQuestions; i++) {
          mockQuestions.push({
            id: questionId++,
            question: getQuestionForCriterion(criterionName, i),
            criterion: criterionName
          })
        }
      })
      
      setInterviewQuestions(mockQuestions)
    } catch (error) {
      console.error('Error generating questions:', error)
      alert('Failed to generate questions. Please try again.')
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const getQuestionForCriterion = (criterionName: string, index: number): string => {
    const questionBank: Record<string, string[]> = {
      'Technical Skills': [
        'Tell me about a challenging technical problem you solved recently. What was your approach?',
        'How do you stay updated with the latest technologies in your field?',
        'Describe your experience with the core technologies mentioned in this role.',
      ],
      'Problem Solving': [
        'Walk me through how you would debug a complex issue in production.',
        'Describe a situation where you had to find a creative solution to a difficult problem.',
        'How do you approach breaking down a large, ambiguous problem into manageable parts?',
      ],
      'Communication': [
        'How do you explain complex technical concepts to non-technical stakeholders?',
        'Tell me about a time when miscommunication caused an issue. How did you resolve it?',
        'How do you ensure your written documentation is clear and helpful?',
      ],
      'Experience': [
        'What aspects of your previous roles have best prepared you for this position?',
        'Describe a project you\'re most proud of and your specific contributions.',
        'How has your career progression led you to apply for this role?',
      ],
      'Culture Fit': [
        'What kind of work environment helps you do your best work?',
        'What motivates you to come to work every day?',
        'How do you align your personal values with your professional work?',
      ],
      'Teamwork / Collaboration': [
        'Tell me about a time you had to work with a difficult team member.',
        'How do you handle disagreements within a team setting?',
        'Describe your approach to sharing knowledge with teammates.',
      ],
      'Leadership': [
        'Tell me about a time you led a project or initiative.',
        'How do you motivate and support team members who are struggling?',
        'Describe your approach to making decisions that affect your team.',
      ],
      'Adaptability / Learning': [
        'Tell me about a time you had to quickly learn a new technology or process.',
        'How do you handle sudden changes in project requirements?',
        'Describe a situation where you had to step outside your comfort zone.',
      ],
      'Work Ethic / Reliability': [
        'How do you manage competing priorities and tight deadlines?',
        'Tell me about a time you went above and beyond to deliver results.',
        'How do you ensure consistent quality in your work?',
      ],
    }
    
    const questions = questionBank[criterionName] || ['Tell me about your experience related to this area.']
    return questions[index % questions.length]
  }

  const addCustomQuestion = () => {
    if (!customQuestionText.trim() || !customQuestionCriterion) return
    
    const newQuestion: InterviewQuestion = {
      id: interviewQuestions.length > 0 ? Math.max(...interviewQuestions.map(q => q.id)) + 1 : 1,
      question: customQuestionText.trim(),
      criterion: customQuestionCriterion,
      isCustom: true,
    }
    
    setInterviewQuestions(prev => [...prev, newQuestion])
    setCustomQuestionText('')
    setCustomQuestionCriterion('')
    setIsAddingCustomQuestion(false)
  }

  const removeQuestion = (questionId: number) => {
    setInterviewQuestions(prev => prev.filter(q => q.id !== questionId))
  }

  const updateScreeningField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      screeningQuestions: {
        ...prev.screeningQuestions,
        [field]: value,
      },
    }))
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (isDraft: boolean) => {
    if (!formData.jobTitle.trim()) {
      alert('Please enter a job title')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // Merge fetched values into screeningQuestions before saving
          screeningQuestions: formData.enableScreeningQuestions ? {
            ...formData.screeningQuestions,
            minExperience: formData.screeningQuestions.minExperience || formData.experienceYears,
            expectedSalary: formData.screeningQuestions.expectedSalary || formData.salaryMax,
            expectedSkills: formData.screeningQuestions.expectedSkills.length > 0 
              ? formData.screeningQuestions.expectedSkills 
              : formData.requiredSkills.filter((s: string) => s.trim()),
          } : formData.screeningQuestions,
          selectedCriteria,
          interviewQuestions,
          isDraft,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save job posting')
      }

      alert(isDraft ? 'Job saved as draft!' : 'Job published successfully!')
      onClose()
    } catch (error) {
      console.error('Error saving job:', error)
      alert(error instanceof Error ? error.message : 'Failed to save job posting. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic Information', fields: 8 },
    { number: 2, title: 'Job Description', fields: 6 },
    { number: 3, title: 'Interview Questions', fields: 8 },
    { number: 4, title: 'Screening Questions', fields: 4 },
    { number: 5, title: 'Team & Planning', fields: 7 },
    { number: 6, title: 'Metrics', fields: 8 },
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
              <h4 className="font-semibold text-lg border-b pb-2">Basic Information</h4>
              
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

          {/* Step 2: Job Description */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2">Job Description</h4>
              
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

          
          {/* Step 3: Interview Questions */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Auto Schedule Interview - moved to top */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
                <input
                  type="checkbox"
                  id="autoScheduleInterview"
                  checked={formData.autoScheduleInterview}
                  onChange={(e) => updateField('autoScheduleInterview', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="autoScheduleInterview" className="text-sm font-medium text-gray-700">
                  Auto Schedule Interview
                </label>
              </div>
              {formData.autoScheduleInterview && (
                <div className="ml-0 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800">
                    <strong>Enabled:</strong> Qualified candidates will automatically receive an interview link valid for <strong>48 hours</strong>. 
                    No calendar events will be created - candidates can start the interview anytime within the window.
                  </p>
                </div>
              )}

              {/* Evaluation Criteria Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">Evaluation Criteria</h4>
                  <span className="text-xs text-gray-500">{selectedCriteria.length}/5 selected</span>
                </div>
                <p className="text-sm text-gray-600">Select up to 5 criteria to evaluate candidates during interviews.</p>
                
                <div className="flex flex-wrap gap-2">
                  {EVALUATION_CRITERIA.map(criterion => {
                    const isSelected = selectedCriteria.includes(criterion)
                    const isDisabled = !isSelected && selectedCriteria.length >= 5
                    
                    return (
                      <div
                        key={criterion}
                        onClick={() => !isDisabled && toggleCriterionSelection(criterion)}
                        className={`px-3 py-1.5 border rounded-md cursor-pointer transition-all text-sm ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : isDisabled
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {criterion}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Interview Questions Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">Interview Questions ({interviewQuestions.length})</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingCustomQuestion(true)}
                    className="bg-transparent flex items-center gap-1.5 text-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Custom
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateInterviewQuestions}
                    disabled={selectedCriteria.length === 0 || isGeneratingQuestions}
                    className="bg-transparent flex items-center gap-1.5 text-sm"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom Question Input */}
              {isAddingCustomQuestion && (
                <div className="border rounded-lg p-3 bg-blue-50">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Add Custom Interview Question</h5>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 items-start">
                        <textarea
                          value={customQuestionText}
                          onChange={(e) => setCustomQuestionText(e.target.value)}
                          rows={2}
                          className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Type your custom interview question..."
                          autoFocus
                        />
                        <select
                          value={customQuestionCriterion}
                          onChange={(e) => setCustomQuestionCriterion(e.target.value)}
                          className="w-32 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                        >
                          <option value="">Criteria...</option>
                          {EVALUATION_CRITERIA.map(criterion => (
                            <option key={criterion} value={criterion}>{criterion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button 
                        size="sm" 
                        onClick={addCustomQuestion} 
                        disabled={!customQuestionText.trim() || !customQuestionCriterion}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Question
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { 
                          setIsAddingCustomQuestion(false)
                          setCustomQuestionText('')
                          setCustomQuestionCriterion('')
                        }} 
                        className="bg-transparent"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Questions List */}
              {interviewQuestions.length === 0 && !isAddingCustomQuestion ? (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">No questions added yet</p>
                  <p className="text-gray-400 text-xs mt-1">Click "AI Generate" to auto-generate questions or "Add Custom" to add manually</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-transparent text-sm"
                    onClick={() => setIsAddingCustomQuestion(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add a custom question...
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {interviewQuestions.map((q, index) => (
                    <div key={q.id} className="flex items-start gap-2 p-2 bg-gray-50 border rounded group">
                      <span className={`flex-shrink-0 w-5 h-5 ${q.isCustom ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-xs font-medium`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{q.question}</p>
                        <span className="text-[10px] text-gray-500 mt-0.5 inline-block">{q.criterion}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(q.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-transparent"
                      >
                        <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              </div>
            </div>
          )}

          {/* Step 4: Screening Questions */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Screening Questions</h4>
              </div>
              
              {/* Enable Screening Questions Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
                <input
                  type="checkbox"
                  id="enableScreeningQuestions"
                  checked={formData.enableScreeningQuestions}
                  onChange={(e) => updateField('enableScreeningQuestions', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="enableScreeningQuestions" className="text-sm font-medium text-gray-700">
                  Enable Screening Questions
                </label>
              </div>

              {!formData.enableScreeningQuestions ? (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">Screening questions are disabled</p>
                  <p className="text-gray-400 text-xs mt-1">Enable the checkbox above to collect pre-interview information from candidates</p>
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                  <p className="text-xs text-gray-600">These questions will be shown to candidates before they can access the interview.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year of Experience <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.screeningQuestions.minExperience || formData.experienceYears}
                        onChange={(e) => updateScreeningField('minExperience', e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. 3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Salary Offer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.screeningQuestions.expectedSalary || formData.salaryMax}
                        onChange={(e) => updateScreeningField('expectedSalary', e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. 80000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Skills <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.screeningQuestions.expectedSkills.length > 0 ? formData.screeningQuestions.expectedSkills.join('\n') : formData.requiredSkills.filter(s => s.trim()).join('\n')}
                      onChange={(e) => updateScreeningField('expectedSkills', e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean))}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder={"Enter each skill on a new line, e.g.:\nReact\nNode.js\nSQL"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.clientCompanyName}
                      onChange={(e) => updateField('clientCompanyName', e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g. TCS, Infosys"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notice Period <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.screeningQuestions.noticePeriod}
                        onChange={(e) => updateScreeningField('noticePeriod', e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. 30 days, 2 months, Immediate"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Is notice period negotiable? <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="noticePeriodNegotiable"
                            checked={formData.screeningQuestions.noticePeriodNegotiable === true}
                            onChange={() => updateScreeningField('noticePeriodNegotiable', true)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="noticePeriodNegotiable"
                            checked={formData.screeningQuestions.noticePeriodNegotiable === false}
                            onChange={() => updateScreeningField('noticePeriodNegotiable', false)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Authorization <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="workAuthorization"
                          checked={formData.screeningQuestions.workAuthorization === 'visa_sponsorship'}
                          onChange={() => updateScreeningField('workAuthorization', 'visa_sponsorship')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Visa sponsorship available</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="workAuthorization"
                          checked={formData.screeningQuestions.workAuthorization === 'must_have_authorization'}
                          onChange={() => updateScreeningField('workAuthorization', 'must_have_authorization')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Must already have work authorization</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <strong>Note:</strong> These screening questions are used for quick candidate filtering. 
                      Candidates must answer these before proceeding to the interview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Team & Planning */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2">Hiring Team & Planning</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.clientCompanyName}
                    onChange={(e) => updateField('clientCompanyName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. TCS, Infosys"
                    required
                  />
                </div>

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

          {/* Step 6: Metrics & Tracking */}
          {currentStep === 6 && (
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
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save as Draft
            </Button>
            {currentStep < steps.length ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Next
              </Button>
            ) : (
              <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Publish Job
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

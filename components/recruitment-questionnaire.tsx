"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Answer {
  [key: string]: string
}

interface ContactInfo {
  name: string
  email: string
  company: string
  phone: string
}

const questions = [
  {
    id: "question-1",
    title: "How many applications do you typically receive per open position?",
    options: [
      { value: "1", label: "Less than 10" },
      { value: "2", label: "10 - 30" },
      { value: "3", label: "30 - 100" },
      { value: "4", label: "More than 100" },
    ],
  },
  {
    id: "question-2",
    title: "How much time does your team spend screening CVs for a typical role?",
    options: [
      { value: "1", label: "Less than 2 hours" },
      { value: "2", label: "2 - 5 hours" },
      { value: "3", label: "5 - 10 hours" },
      { value: "4", label: "More than 10 hours" },
    ],
  },
  {
    id: "question-3",
    title: "What's your average time-to-hire from application to offer?",
    options: [
      { value: "1", label: "Less than 1 week" },
      { value: "2", label: "1 - 2 weeks" },
      { value: "3", label: "2 - 4 weeks" },
      { value: "4", label: "More than 4 weeks" },
    ],
  },
  {
    id: "question-4",
    title: "How do you currently screen candidates before the first interview?",
    options: [
      { value: "1", label: "Manual CV review only" },
      { value: "2", label: "Phone screening calls" },
      { value: "3", label: "Automated skills assessments" },
      { value: "4", label: "AI-powered screening tools" },
    ],
  },
  {
    id: "question-5",
    title: "What percentage of candidates you interview meet your quality standards?",
    options: [
      { value: "1", label: "Less than 25%" },
      { value: "2", label: "25% - 50%" },
      { value: "3", label: "50% - 75%" },
      { value: "4", label: "More than 75%" },
    ],
  },
  {
    id: "question-6",
    title: "How would you describe your cost per hire?",
    options: [
      { value: "1", label: "Very low - minimal recruitment costs" },
      { value: "2", label: "Reasonable - appropriate for our industry" },
      { value: "3", label: "High - significant investment in recruitment" },
      { value: "4", label: "Very high - excessive recruitment spending" },
    ],
  },
  {
    id: "question-7",
    title: "How would you rate your candidate experience during the application process?",
    options: [
      { value: "1", label: "Poor - many candidates drop out" },
      { value: "2", label: "Average - some room for improvement" },
      { value: "3", label: "Good - candidates generally satisfied" },
      { value: "4", label: "Excellent - candidates consistently praise our process" },
    ],
  },
  {
    id: "question-8",
    title: "How many people are involved in your recruitment process per hire?",
    options: [
      { value: "1", label: "1-2 people" },
      { value: "2", label: "3-4 people" },
      { value: "3", label: "5-6 people" },
      { value: "4", label: "More than 6 people" },
    ],
  },
  {
    id: "question-9",
    title: "What recruitment technology do you currently use?",
    options: [
      { value: "1", label: "Basic ATS only" },
      { value: "2", label: "ATS with some automation features" },
      { value: "3", label: "Multiple integrated recruitment tools" },
      { value: "4", label: "Advanced AI-powered recruitment platform" },
    ],
  },
  {
    id: "question-10",
    title: "How important is improving your recruitment efficiency right now?",
    options: [
      { value: "1", label: "Not a priority" },
      { value: "2", label: "Somewhat important" },
      { value: "3", label: "Very important" },
      { value: "4", label: "Critical priority" },
    ],
  },
]

export function RecruitmentQuestionnaire() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: "",
    email: "",
    company: "",
    phone: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  const totalQuestions = 11

  const handleNext = async () => {
    if (currentQuestion === 0) {
      // Validate contact info fields
      if (!contactInfo.name.trim() || !contactInfo.email.trim() || !contactInfo.company.trim()) {
        return
      }

      // Check for duplicate email before starting assessment
      setIsCheckingEmail(true)
      try {
        const response = await fetch('/api/assessments/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contactInfo.email.trim()
          }),
        })

        const data = await response.json()
        
        if (response.status === 409 || data.exists) {
          // Email already exists - show alert and prevent starting
          alert('This email has already completed the assessment.')
          setIsCheckingEmail(false)
          return
        }
      } catch (error) {
        console.error('Error checking email:', error)
        alert('Failed to validate email. Please try again.')
        setIsCheckingEmail(false)
        return
      }
      setIsCheckingEmail(false)
    }
    
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleOptionSelect = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  const calculateResults = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    let totalScore = 0
    let answerCount = 0

    Object.keys(answers).forEach((key) => {
      totalScore += parseInt(answers[key])
      answerCount++
    })

    const averageScore = totalScore / answerCount
    const efficiencyScore = Math.round((averageScore / 4) * 100)

    // Generate session ID for anonymous tracking
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store data in localStorage for the results page
    if (typeof window !== 'undefined') {
      localStorage.setItem('questionnaireScore', efficiencyScore.toString())
      localStorage.setItem('questionnaireContact', JSON.stringify(contactInfo))
      localStorage.setItem('questionnaireAnswers', JSON.stringify(answers))
      localStorage.setItem('sessionId', sessionId)
    }

    // Format answers for API (store as direct object matching parent project format)
    const formattedAnswers: Record<string, any> = {}
    Object.entries(answers).forEach(([questionId, answerValue]) => {
      const question = questions.find(q => q.id === questionId)
      const answerOption = question?.options.find(opt => opt.value === answerValue)
      
      formattedAnswers[questionId] = {
        questionText: question?.title || '',
        answerValue: answerOption?.label || answerValue,
        answerIndex: question?.options.findIndex(opt => opt.value === answerValue) || 0
      }
    })

    // Save to database
    try {
      const response = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contactInfo.name,
          email: contactInfo.email,
          company: contactInfo.company,
          phone: contactInfo.phone || null,
          answers: formattedAnswers,
          efficiencyScore: efficiencyScore
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Failed to save assessment:', data.error)
        alert('Failed to submit assessment. Please try again.')
      } else {
        console.log('Assessment saved successfully:', data.assessmentId)
        // Navigate to results page
        router.push('/questionnaire-results')
      }
    } catch (error) {
      console.error('Error saving assessment:', error)
      alert('Failed to submit assessment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRecommendations = () => {
    const recommendations: string[] = []

    if (answers["question-2"] && parseInt(answers["question-2"]) >= 3) {
      recommendations.push("Implement AI-powered CV screening to reduce manual review time by up to 80%")
    }
    if (answers["question-3"] && parseInt(answers["question-3"]) >= 3) {
      recommendations.push("Use automated candidate engagement to reduce time-to-hire by weeks")
    }
    if (answers["question-5"] && parseInt(answers["question-5"]) <= 2) {
      recommendations.push("Improve candidate quality with AI-powered matching and skills assessment")
    }
    if (answers["question-7"] && parseInt(answers["question-7"]) <= 2) {
      recommendations.push("Enhance candidate experience with automated communication and feedback")
    }
    if (answers["question-9"] && parseInt(answers["question-9"]) <= 2) {
      recommendations.push("Upgrade your recruitment technology stack with AI-powered tools")
    }

    const defaultRecommendations = [
      "Create standardized scoring rubrics to ensure consistent candidate evaluation",
      "Leverage analytics to identify bottlenecks in your hiring process",
      "Automate interview scheduling to reduce administrative overhead",
      "Implement skills-based assessments to objectively evaluate candidates",
    ]

    while (recommendations.length < 5) {
      const randomRec = defaultRecommendations[Math.floor(Math.random() * defaultRecommendations.length)]
      if (!recommendations.includes(randomRec)) {
        recommendations.push(randomRec)
      }
    }

    return recommendations
  }

  const progressPercentage = ((currentQuestion + 1) / totalQuestions) * 100

  const isContactInfoValid = () => {
    return contactInfo.name.trim() !== '' && 
           contactInfo.email.trim() !== '' && 
           contactInfo.company.trim() !== ''
  }

  const isNextButtonDisabled = () => {
    if (currentQuestion === 0) {
      return !isContactInfoValid()
    }
    if (currentQuestion > 0 && currentQuestion <= questions.length) {
      return !answers[questions[currentQuestion - 1].id]
    }
    return false
  }

  return (
    <section className="py-12 sm:py-20 bg-gradient-to-br from-[var(--dark)] to-[var(--dark2)] reveal">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <div className="inline-block bg-[rgba(0,177,79,0.15)] text-[var(--primary-light)] px-4 py-2 rounded-full text-sm font-semibold mb-6 reveal-left">
              AI-Powered Recruitment
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6 leading-tight reveal">
              Feeling Frustrated That You're Not Finding Quality Candidates Even Though You're Spending Hours Screening?
            </h1>
            <p className="text-xl text-[var(--text-muted)] mb-8 reveal">
              Answer 10 questions to find out why you're experiencing this frustration and get your personalized report.
            </p>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <strong className="text-[var(--text)]">Get your personalized score</strong>
                  <p className="text-[var(--text-muted)]">See how your recruitment process compares to industry standards</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <strong className="text-[var(--text)]">Receive custom recommendations</strong>
                  <p className="text-[var(--text-muted)]">Get actionable insights to improve your hiring efficiency</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <strong className="text-[var(--text)]">Learn time-saving strategies</strong>
                  <p className="text-[var(--text-muted)]">Discover how to automate screening and save hours each week</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="shadow-lg border-[var(--border)] bg-[var(--dark2)] reveal-right">
            <CardContent className="p-4 sm:p-5">
              <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Recruitment Efficiency Assessment</h2>
                <p className="text-[var(--text-muted)]">Answer 10 questions to get your personalized report</p>
              </div>

              <div className="h-2 bg-[var(--border)] rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {currentQuestion === 0 && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <h3 className="text-xl font-semibold mb-4 text-[var(--text)]">Let's get started with your contact information</h3>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={contactInfo.company}
                      onChange={(e) => setContactInfo({ ...contactInfo, company: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {currentQuestion > 0 && currentQuestion <= questions.length && (
                <div className="animate-in fade-in duration-500">
                  <h3 className="text-xl font-semibold mb-4 text-[var(--text)]">{questions[currentQuestion - 1].title}</h3>
                  <div className="space-y-3 mb-5">
                    {questions[currentQuestion - 1].options.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => handleOptionSelect(questions[currentQuestion - 1].id, option.value)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center ${
                          answers[questions[currentQuestion - 1].id] === option.value
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                            answers[questions[currentQuestion - 1].id] === option.value
                              ? "border-emerald-600 bg-emerald-600"
                              : "border-slate-300"
                          }`}
                        >
                          {answers[questions[currentQuestion - 1].id] === option.value && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-slate-700">{option.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
                <Button onClick={handlePrev} disabled={currentQuestion === 0} variant="outline" className="px-6 order-2 sm:order-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                {currentQuestion < totalQuestions - 1 ? (
                  <Button 
                    onClick={handleNext} 
                    disabled={isNextButtonDisabled() || (currentQuestion === 0 && isCheckingEmail)} 
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-6 order-1 sm:order-2"
                  >
                    {currentQuestion === 0 && isCheckingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Checking...
                      </>
                    ) : (
                      <>
                        {currentQuestion === 0 ? "Start Assessment" : "Next"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={calculateResults} 
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-6 order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        See My Results
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

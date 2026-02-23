'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Rocket, BarChart3, Bot, Target } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface OnboardingStep {
  icon: React.ReactNode
  title: string
  description: string
}

const steps: OnboardingStep[] = [
  {
    icon: <Rocket className="h-8 w-8 text-white" />,
    title: 'Welcome to HireGenAI!',
    description: "Let's take a quick tour of the main features to help you get started with AI-powered hiring."
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-white" />,
    title: 'Dashboard Overview',
    description: 'View all your key metrics and candidate screening performance at a glance.'
  },
  {
    icon: <Bot className="h-8 w-8 text-white" />,
    title: 'AI Interview Assistant',
    description: 'Let our AI conduct initial interviews and screen candidates automatically.'
  },
  {
    icon: <Target className="h-8 w-8 text-white" />,
    title: "Ready to Go!",
    description: "You're all set! Remember you can click the ? icon anytime for help, or restart this tour from the Help Center header."
  }
]

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    // Only show tour if user is logged in
    if (!user?.id) return

    // Check if THIS specific user has seen the tour (user-specific key)
    const tourKey = `hasSeenOnboardingTour_${user.id}`
    const hasSeenTour = localStorage.getItem(tourKey)
    
    if (!hasSeenTour) {
      // Show tour after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [user?.id])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleFinish()
    }
  }

  const handleSkip = () => {
    if (user?.id) {
      const tourKey = `hasSeenOnboardingTour_${user.id}`
      localStorage.setItem(tourKey, 'true')
    }
    setIsOpen(false)
  }

  const handleFinish = () => {
    if (user?.id) {
      const tourKey = `hasSeenOnboardingTour_${user.id}`
      localStorage.setItem(tourKey, 'true')
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md mx-4 animate-in zoom-in-95 duration-300">
        {/* Gradient border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-2xl blur opacity-75 animate-pulse"></div>
        
        {/* Main card */}
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
          
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon with gradient background */}
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/50 animate-in zoom-in duration-500">
              {currentStepData.icon}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {currentStepData.title}
            </h2>

            {/* Description */}
            <p className="text-gray-600 text-base leading-relaxed mb-8">
              {currentStepData.description}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-8 bg-gradient-to-r from-emerald-500 to-teal-500'
                      : index < currentStep
                      ? 'w-2 bg-emerald-500'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="px-6 border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                className="px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-emerald-500/50"
              >
                {isLastStep ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

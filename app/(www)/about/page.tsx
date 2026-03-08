"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Zap, Brain, MessageSquare, Target } from "lucide-react"
import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import { getAppUrl } from "@/lib/domain-config"

export default function AboutPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const scrollTo = searchParams?.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/about')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* About Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title - Green highlighted, left aligned, full width */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-emerald-600 mb-4">About Us</h1>
            <p className="text-lg text-slate-600">
              Revolutionizing recruitment through Voice AI innovation
            </p>
          </div>

          <div className="space-y-16 text-slate-700 leading-relaxed">
            {/* Mission Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-8 rounded-2xl border border-emerald-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Our Mission</h2>
              </div>
              <p className="text-xl text-slate-700 leading-relaxed mb-4">
                We empower the generation of tomorrow for a brighter future and hope for every individual.
              </p>
              <p className="text-lg text-slate-600">
                HireGenAI is a visionary project aimed at revolutionizing the recruitment industry through Voice AI, with a strong emphasis on enhancing the candidate experience. This is just the beginning—we envision a future where Voice AI transforms how humans interact across domains like customer service, education, and healthcare.
              </p>
            </div>

            {/* Company Description */}
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-8">What We Build</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-lg text-slate-600 mb-6">
                    We're building an AI recruiter that automates candidate screening over phone calls using the Voice API. Once a candidate applies, our AI conducts a real-time voice-based screening interview using Voice API.
                  </p>
                  <p className="text-lg text-slate-600 mb-6">
                    It integrates with LinkedIn, Microsoft Teams, Outlook, and SharePoint to fetch candidate insights, schedule follow-ups, and log interview notes. The goal is to reduce recruiter workload and increase screening accuracy, especially for high-volume roles.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">Voice AI</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">LinkedIn Integration</span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">Microsoft Teams</span>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">Outlook Integration</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                  <div className="flex items-center mb-4">
                    <Zap className="w-8 h-8 text-emerald-600 mr-3" />
                    <h3 className="text-xl font-bold text-slate-800">Key Features</h3>
                  </div>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Real-time voice-based candidate screening
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Automated scheduling and follow-ups
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Integration with major business platforms
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Reduced recruiter workload by 80%
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Enhanced screening accuracy
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-12 rounded-3xl text-center shadow-2xl">
              <h2 className="text-4xl font-bold mb-3">Join Our Journey</h2>
              <p className="text-lg mb-10 text-emerald-50 max-w-2xl mx-auto">
                We're building the future of recruitment. Be part of the revolution.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
                <Link href="/contact">
                  <Button className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-7 py-2.5 h-auto rounded-lg transition-all duration-200 hover:shadow-lg">
                    Get in Touch
                  </Button>
                </Link>
                <Link href="/book-meeting">
                  <Button className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-7 py-2.5 h-auto rounded-lg transition-all duration-200 hover:shadow-lg">
                    Book a Meeting
                  </Button>
                </Link>
                <Link href={getAppUrl('/login')}>
                  <Button 
                    className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-7 py-2.5 h-auto rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    Login
                  </Button>
                </Link>
                <Button 
                  onClick={() => window.location.href = '/pricing'}
                  className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-7 py-2.5 h-auto rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  Pricing
                </Button>
              </div>
            </div>

            {/* Founders Section */}
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-12 text-center">Meet Our Founders</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Sandeep Yadav */}
                <div className="bg-white p-8 rounded-2xl border-2 border-emerald-200 shadow-lg hover:shadow-emerald-500/20 transition-shadow duration-300">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Sandeep Yadav</h3>
                    <p className="text-emerald-600 font-semibold">Founder / CEO / CTO</p>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    I am a builder at heart—someone who turns vision into reality. For over 15 years, I have been designing and scaling intelligent automation systems at a leading global consulting firm, where I specialized in AI, robotics, and cognitive automation.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    My role was never just about strategy—it was about building: from architecting enterprise-wide automation frameworks and designing virtual assistants to reengineering processes that saved thousands of hours and millions in operational costs.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    I've delivered large-scale transformations across aviation, banking, automotive, insurance, and manufacturing—each time starting from zero, whether it was establishing an Intelligent Automation Centre of Excellence, implementing an RPA infrastructure, or launching a conversational AI platform.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Now, I'm channelling that same builder's mindset into my own venture: Hire-GenAI, a Voice AI platform set to redefine recruitment by focusing on the human experience. I build. I scale. I transform.
                  </p>
                </div>

                {/* Dheeraj Yadav */}
                <div className="bg-white p-8 rounded-2xl border-2 border-emerald-200 shadow-lg hover:shadow-emerald-500/20 transition-shadow duration-300">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Dheeraj Yadav</h3>
                    <p className="text-emerald-600 font-semibold">Co-founder & COO</p>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    I'm building the future of recruitment from the ground up. As a cofounder at Hire-GenAi, I partner with industry veteran Sandeep to turn our vision of a human-centric, voice-powered hiring platform into reality.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    My journey started not in a corporate boardroom, but in a college dorm where we first prototyped the idea. I bring a fresh, user-centric perspective—the perspective of a new generation entering the workforce—to tackle the archaic challenges of recruitment.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    My role bridges our ambitious AI architecture with the candidate and recruiter experience, ensuring our technology solves real human problems.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    While Sandeep brings 15 years of scaling enterprise AI, I bring the relentless execution, agile learning, and digital-native insight needed to build and iterate at startup speed. We're not just automating hiring; we're re-humanizing it.
                  </p>
                </div>

                {/* Jyoti Yadav */}
                <div className="bg-white p-8 rounded-2xl border-2 border-emerald-200 shadow-lg hover:shadow-emerald-500/20 transition-shadow duration-300">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Jyoti Yadav</h3>
                    <p className="text-emerald-600 font-semibold">Business Partner</p>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    A seasoned Talent Acquisition Lead with expertise in social media recruiting, employer branding, and sourcing strategies across APAC.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    She specializes in hiring technical talent across Banking, IT, Healthcare, and Retail sectors, partnering closely with business managers to drive impactful hiring outcomes.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Backed by an MBA, she is passionate about process improvement, talent management, and inclusive hiring.
                  </p>
                </div>
              </div>
            </div>

            {/* Future Vision */}
            <div className="bg-gradient-to-r from-slate-50 to-emerald-50 p-8 rounded-2xl border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <Brain className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Our Vision for the Future</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                HireGenAI represents just the beginning of a transformative journey. We envision a future where Voice AI becomes the cornerstone of human-AI interaction across multiple domains:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Customer Service</h4>
                  <p className="text-slate-600 text-sm">Natural, empathetic conversations that understand context and emotion</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Education</h4>
                  <p className="text-slate-600 text-sm">Personalized learning experiences with adaptive voice-based tutoring</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Healthcare</h4>
                  <p className="text-slate-600 text-sm">Compassionate virtual assistants for patient support and mental health</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
  )
}

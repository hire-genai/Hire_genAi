"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import {
  Zap,
  Brain,
  Phone,
  ArrowRight,
  Play,
  Globe,
  Search,
  Target,
  Clock,
  BarChart3,
  MessageSquare,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Lock,
  Star,
  TrendingUp,
  Users,
  Menu,
  X,
} from "lucide-react"
import { RecruitmentQuestionnaire } from "@/components/recruitment-questionnaire"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { getAppUrl } from "@/lib/domain-config"

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-stagger')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    revealElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--dark)] border-b border-[var(--border)] backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold">
                  <span className="text-[var(--text)]">Hire</span>
                  <span className="text-[var(--primary-light)]">GenAI</span>
                </h1>
              </div>
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <Link
                  href="/demo-en"
                  className="text-[var(--text-muted)] hover:text-[var(--primary-light)] px-3 py-2 text-sm font-medium transition-colors"
                >
                  Product
                </Link>
                <Link
                  href="/pricing"
                  className="text-[var(--text-muted)] hover:text-[var(--primary-light)] px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/roi"
                  className="text-[var(--text-muted)] hover:text-[var(--primary-light)] px-3 py-2 text-sm font-medium transition-colors"
                >
                  ROI
                </Link>
                <Link
                  href="/about"
                  className="text-[var(--text-muted)] hover:text-[var(--primary-light)] px-3 py-2 text-sm font-medium transition-colors"
                >
                  Company
                </Link>
              </nav>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href={getAppUrl('/login')} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="ghost"
                  className="text-[var(--text-muted)] hover:text-[var(--primary-light)] font-medium"
                >
                  Login
                </Button>
              </Link>
              <Link href={getAppUrl('/signup')} target="_blank" rel="noopener noreferrer">
                <Button className="btn-primary">Get started</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:bg-[var(--dark2)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)] transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[var(--dark2)] border-t border-[var(--border)]">
              <Link
                href="/demo-en"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:bg-[var(--dark2)] block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Product
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:bg-[var(--dark2)] block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/roi"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:bg-[var(--dark2)] block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                ROI
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:bg-[var(--dark2)] block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Company
              </Link>
              <div className="pt-4 pb-3 border-t border-[var(--border)]">
                <div className="px-3 space-y-2">
                  <Link href={getAppUrl('/login')} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:bg-[var(--dark2)] font-medium transition-colors"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href={getAppUrl('/signup')} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full btn-primary">Get started</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="container">
          <div className="hero-eyebrow">
            <strong>Powered by GPT-4o &amp; Claude</strong> &nbsp;·&nbsp; Next-Generation Recruitment AI
          </div>
          <h1 className="hero-title fade-in">
            Hire Smarter.<br /><span className="highlight">10× Faster</span> with AI.
          </h1>
          <p className="hero-subtitle fade-in">
            Hire-GenAI transforms your entire recruitment pipeline — from sourcing to offer — with generative AI that screens, scores, and schedules so your team focuses on what matters most.
          </p>
          <div className="hero-actions fade-in">
            <Link href="/roi" className="btn-primary">
              🚀 Start Free Trial — It&apos;s Free
            </Link>
            <Link href="/demo-en" className="btn-secondary">▶ Product Demo</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">80%</div>
              <div className="hero-stat-label">Reduction in time-to-hire</div>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <div className="hero-stat-num">97%</div>
              <div className="hero-stat-label">Scheduling automation</div>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <div className="hero-stat-num">3×</div>
              <div className="hero-stat-label">More qualified candidates</div>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <div className="hero-stat-num">$2.4M</div>
              <div className="hero-stat-label">Avg. annual cost savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section className="product-preview">
        <div className="container-wide">
          <div className="preview-wrapper float">
            <div className="preview-bar">
              <div className="preview-dot" />
              <div className="preview-dot" />
              <div className="preview-dot" />
              <div className="preview-url">app.hiregenai.com / pipeline</div>
            </div>
            <div className="preview-content">
              <div className="preview-sidebar">
                <div className="preview-sidebar-logo">⚡ Hire-GenAI</div>
                <div className="preview-nav-item active"><div className="preview-nav-icon" /> Dashboard</div>
                <div className="preview-nav-item"><div className="preview-nav-icon" /> Pipeline</div>
                <div className="preview-nav-item"><div className="preview-nav-icon" /> AI Scoring</div>
                <div className="preview-nav-item"><div className="preview-nav-icon" /> Interviews</div>
                <div className="preview-nav-item"><div className="preview-nav-icon" /> Assessments</div>
                <div className="preview-nav-item"><div className="preview-nav-icon" /> Analytics</div>
                <div className="preview-nav-item"><div className="preview-nav-icon" /> Offers</div>
              </div>
              <div className="preview-main">
                <div className="preview-header">
                  <div className="preview-title-sm">📊 Hiring Pipeline — Senior Engineers</div>
                  <div className="preview-btn-sm">+ Add Candidate</div>
                </div>
                <div className="preview-pipeline">
                  <div className="preview-col">
                    <div className="preview-col-title">Applied (24)</div>
                    <div className="preview-card">
                      <div className="preview-card-name">Alex Johnson</div>
                      <div className="preview-card-role">Full Stack Engineer</div>
                      <div className="preview-score">AI Score: 94%</div>
                    </div>
                    <div className="preview-card">
                      <div className="preview-card-name">Sarah Chen</div>
                      <div className="preview-card-role">React Developer</div>
                      <div className="preview-score">AI Score: 88%</div>
                    </div>
                  </div>
                  <div className="preview-col">
                    <div className="preview-col-title">Screened (11)</div>
                    <div className="preview-card">
                      <div className="preview-card-name">Marcus Davis</div>
                      <div className="preview-card-role">Backend Engineer</div>
                      <div className="preview-score medium">AI Score: 76%</div>
                    </div>
                    <div className="preview-card">
                      <div className="preview-card-name">Priya Sharma</div>
                      <div className="preview-card-role">DevOps Engineer</div>
                      <div className="preview-score">AI Score: 91%</div>
                    </div>
                  </div>
                  <div className="preview-col">
                    <div className="preview-col-title">Interview (6)</div>
                    <div className="preview-card">
                      <div className="preview-card-name">James Wilson</div>
                      <div className="preview-card-role">Platform Engineer</div>
                      <div className="preview-score">AI Score: 96%</div>
                    </div>
                  </div>
                  <div className="preview-col">
                    <div className="preview-col-title">Offer (2)</div>
                    <div className="preview-card">
                      <div className="preview-card-name">Emily Rodriguez</div>
                      <div className="preview-card-role">Staff Engineer</div>
                      <div className="preview-score">AI Score: 98%</div>
                    </div>
                  </div>
                </div>
                <div className="preview-metrics">
                  <div className="preview-metric">
                    <div className="preview-metric-val">9 days</div>
                    <div className="preview-metric-label">Avg. Time to Hire</div>
                  </div>
                  <div className="preview-metric">
                    <div className="preview-metric-val">4.8/5</div>
                    <div className="preview-metric-label">Candidate NPS</div>
                  </div>
                  <div className="preview-metric">
                    <div className="preview-metric-val">92%</div>
                    <div className="preview-metric-label">Offer Acceptance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recruitment Questionnaire Section */}
      <section id="assessment">
        <RecruitmentQuestionnaire />
      </section>

      {/* Features Section */}
      <section id="product" className="py-20 bg-[var(--dark2)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6">
              Everything you need to hire <span className="text-[var(--primary-light)]">brilliantly</span>
            </h2>
            <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto">
              One AI-native platform: Attract, Screen, Assess, and Hire — all in one unified workspace.
            </p>
          </div>

          {/* Features Grid - 2x2 Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intelligent CV Parsing */}
            <Card className="bg-[var(--dark2)] border-[var(--border)] p-5 text-center transition-all duration-300 hover:border-[var(--primary-light)] hover:shadow-lg hover:shadow-[var(--primary)]/20 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-14 h-14 bg-[var(--primary)]/20 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform duration-300 hover:rotate-12">
                  <Search className="w-8 h-8 text-[var(--primary-light)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-4">Intelligent CV Parsing</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Instantly scans and scores all incoming CVs against your job description. Identifies key skills, experience, and qualifications with over 95% accuracy.
                </p>
              </CardContent>
            </Card>

            {/* AI-Powered Initial Interview */}
            <Card className="bg-[var(--dark2)] border-[var(--border)] p-5 text-center transition-all duration-300 hover:border-[var(--primary-light)] hover:shadow-lg hover:shadow-[var(--primary)]/20 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-14 h-14 bg-[#00b14f]/20 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform duration-300 hover:rotate-12">
                  <Brain className="w-8 h-8 text-[#00b14f]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-4">AI-Powered Initial Interview</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Engages qualified candidates in natural, conversational video interviews. Asks role-specific questions and analyzes responses for content, communication skills, and cultural fit.
                </p>
              </CardContent>
            </Card>

            {/* Data-Driven Shortlisting */}
            <Card className="bg-[var(--dark2)] border-[var(--border)] p-5 text-center transition-all duration-300 hover:border-[var(--primary-light)] hover:shadow-lg hover:shadow-[var(--primary)]/20 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-14 h-14 bg-[#9333ea]/20 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform duration-300 hover:rotate-12">
                  <Phone className="w-8 h-8 text-[#c084fc]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-4">Data-Driven Shortlisting</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Provides a ranked shortlist of the top 60% of candidates who are genuinely qualified and interested. Delivers detailed reports and video clips for efficient review.
                </p>
              </CardContent>
            </Card>

            {/* Advanced Analytics */}
            <Card className="bg-[var(--dark2)] border-[var(--border)] p-5 text-center transition-all duration-300 hover:border-[var(--primary-light)] hover:shadow-lg hover:shadow-[var(--primary)]/20 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-14 h-14 bg-[#b45309]/20 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform duration-300 hover:rotate-12">
                  <BarChart3 className="w-8 h-8 text-[#fbbf24]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-4">Advanced Analytics</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Real-time insights into your hiring pipeline with predictive analytics and performance metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-20 bg-gradient-to-b from-[var(--dark)] to-[var(--dark2)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6">
              Traditional Recruitment Is <span className="text-[#f87171]">Holding You Back</span>
            </h2>
            <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto">
              Every day you wait, top talent slips away to faster competitors. Here&apos;s what&apos;s really costing you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pain Point 1 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 border-l-4 border-[#ef4444] hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#fee2e2] rounded-full flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-[#dc2626]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-4">Slow & Inefficient</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                Manual resume screening and scheduling create bottlenecks that stretch hiring cycles to <span className="font-semibold text-[#dc2626]">40+ days</span>, causing you to lose top candidates to faster competitors.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 border-l-4 border-[#f97316] hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#ffedd5] rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ea580c]"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-4">Expensive & Resource-Heavy</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                Labor-intensive processes drain your budget with high cost-per-hire and dependency on external agencies, while your HR team drowns in administrative work.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 border-l-4 border-[#f59e0b] hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#fef3c7] rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#b45309]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/></svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-4">Limited & Biased</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                Human limitations restrict your reach to active applicants only, while unconscious bias compromises diversity goals and leads to poor hiring decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-gradient-to-b from-[var(--dark2)] to-[var(--dark)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6">
              AI Recruitment: <span className="text-[var(--primary-light)]">The Complete Hiring Transformation</span>
            </h2>
            <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto">
              Our platform combines cutting-edge artificial intelligence with human expertise to deliver unprecedented hiring results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Lightning-Fast Hiring</h3>
              <p className="text-[var(--primary-light)] font-semibold mb-3">Reduce time-to-hire from 40 days to just 4-11 days</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Automate resume screening, candidate ranking, and interview scheduling in minutes. Fill critical roles before your competition even starts searching.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Dramatic Cost Savings</h3>
              <p className="text-[var(--primary-light)] font-semibold mb-3">Cut recruitment costs by 20-50%</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Eliminate manual labor expenses, reduce agency dependency, and decrease turnover through superior candidate matching—delivering measurable ROI from day one.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Unlimited Scalability</h3>
              <p className="text-[var(--primary-light)] font-semibold mb-3">Handle thousands of applications 24/7</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Process high-volume hiring periods effortlessly without adding HR headcount. Our AI never sleeps, never tires, and scales instantly with your growth.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Data-Driven Precision</h3>
              <p className="text-[var(--primary)] font-semibold mb-3">Match candidates with predictive accuracy</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Advanced algorithms analyze skills, experience, and historical performance data to identify candidates most likely to succeed and stay long-term.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Diversity & Fairness</h3>
              <p className="text-[var(--primary)] font-semibold mb-3">Reduce unconscious bias by design</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Evaluate candidates on objective criteria—skills, qualifications, and potential—rather than demographics, helping you build truly diverse teams.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[var(--dark2)] rounded-lg shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-[var(--text)] mb-2">Proactive Talent Discovery</h3>
              <p className="text-[var(--primary)] font-semibold mb-3">Access passive candidates automatically</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Our AI actively searches internal and external databases to find qualified professionals who aren&apos;t actively job hunting, expanding your talent pool exponentially.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - For Companies */}
      <section className="py-20 bg-[var(--dark)] text-[var(--text)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <p className="text-[var(--primary-light)] font-semibold mb-2">FOR COMPANIES</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Transform Your Hiring Outcomes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--dark2)] rounded-lg p-5 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-[var(--primary-light)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Build Better Teams, Faster</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Fill critical positions <span className="text-[var(--primary-light)] font-semibold">4x faster</span> than traditional methods, minimizing productivity losses and keeping projects on track.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--dark2)] rounded-lg p-5 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary-light)]"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Hire Smarter, Not Harder</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Our AI-powered screening analyzes candidate qualifications and experience to identify top performers, significantly improving quality of hire and reducing costly turnover.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--dark2)] rounded-lg p-5 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-[var(--primary-light)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Grow Without Growing Pains</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Scale your hiring seamlessly during growth periods or seasonal peaks without proportionally increasing your HR budget or headcount.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--dark2)] rounded-lg p-5 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[var(--primary-light)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Champion Real Diversity</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Move beyond good intentions to measurable results with bias-reduced screening that evaluates candidates fairly and objectively.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - For HR Teams */}
      <section className="py-20 bg-[var(--dark)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <p className="text-[var(--primary)] font-semibold mb-2">FOR HR TEAMS & RECRUITERS</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6">
              Elevate Your Impact, Reclaim Your Time
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 hover:border-[rgba(0,177,79,0.3)] transition-all reveal-stagger">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">Focus on What Matters</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Eliminate <span className="font-semibold text-[var(--primary)]">70% of administrative work</span>—resume screening, data entry, scheduling—and dedicate your expertise to relationship-building, cultural assessment, and strategic planning.
              </p>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 hover:border-[rgba(0,177,79,0.3)] transition-all reveal-stagger">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">Make Better Decisions</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Access data-driven insights and predictive analytics that complement your intuition, helping you identify top talent with confidence.
              </p>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 hover:border-[rgba(0,177,79,0.3)] transition-all reveal-stagger">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">Delight Every Candidate</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                AI-powered chatbots provide instant, 24/7 responses and updates, creating a positive candidate experience that strengthens your employer brand.
              </p>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 hover:border-[rgba(0,177,79,0.3)] transition-all reveal-stagger">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">Multiply Your Productivity</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Manage more requisitions and candidates simultaneously without sacrificing quality, making you a more valuable strategic partner to your organization.
              </p>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 hover:border-[rgba(0,177,79,0.3)] transition-all md:col-span-2 lg:col-span-1 reveal-stagger">
              <div className="text-3xl mb-4">💎</div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">Discover Hidden Talent</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Proactively identify qualified passive candidates who would never have applied, giving you access to talent your competitors don&apos;t even know exists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-20 bg-[var(--dark)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6 reveal">
              See The Difference <span className="highlight">AI Makes</span>
            </h2>
            <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto reveal">
              Compare traditional recruitment with HireGenAI and see why leading companies are making the switch.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto mb-12 reveal">
          <div className="bg-[var(--dark2)] rounded-lg shadow-sm overflow-hidden border border-[var(--border)] min-w-[560px]">
            <div className="grid grid-cols-3 text-center py-6 bg-[var(--dark2)] text-[var(--text)]">
              <div className="px-4">
                <h3 className="text-lg md:text-xl font-semibold">What Matters Most</h3>
              </div>
              <div className="px-4 border-l border-[var(--border)]">
                <h3 className="text-lg md:text-xl font-semibold text-[var(--primary-light)]">With HireGenAI</h3>
              </div>
              <div className="px-4 border-l border-[var(--border)]">
                <h3 className="text-lg md:text-xl font-semibold text-[#f87171]">Traditional Approach</h3>
              </div>
            </div>

            {/* Speed Row */}
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Speed</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="flex items-center gap-2 font-semibold text-[var(--primary)]">
                  <Zap className="w-5 h-5" /> 4-11 days
                </p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Clock className="w-5 h-5" /> 40+ days
                </p>
              </div>
            </div>

            {/* Cost Row */}
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Cost Per Hire</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="font-semibold text-[var(--primary)]">💰 20-50% lower</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="text-[var(--text-muted)]">💸 Significantly higher</p>
              </div>
            </div>

            {/* Volume Row */}
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Volume Capacity</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="font-semibold text-[var(--primary)]">🚀 Thousands 24/7</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="text-[var(--text-muted)]">👥 Limited by staff</p>
              </div>
            </div>

            {/* Consistency Row */}
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Consistency</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="font-semibold text-[var(--primary)]">✅ Same criteria for all</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="text-[var(--text-muted)]">❌ Varies by recruiter</p>
              </div>
            </div>

            {/* Reach Row */}
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Candidate Reach</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="font-semibold text-[var(--primary)]">🌍 Active + passive</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="text-[var(--text-muted)]">📝 Active only</p>
              </div>
            </div>

            {/* Scalability Row */}
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Scalability</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="font-semibold text-[var(--primary)]">♾️ Instant, unlimited</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="text-[var(--text-muted)]">⚠️ Requires more staff</p>
              </div>
            </div>

            {/* Bias Row */}
            <div className="grid grid-cols-3">
              <div className="p-5 flex items-center bg-[var(--dark)]">
                <h4 className="font-semibold text-[var(--text)]">Bias Reduction</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)] bg-[rgba(0,177,79,0.15)]">
                <p className="font-semibold text-[var(--primary)]">🎯 Objective, skills-focused</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-[var(--border)]">
                <p className="text-[var(--text-muted)]">⚠️ Unconscious bias</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-[var(--dark2)]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Everything you need to know about HireGenAI
            </p>
          </div>

          <Card className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl transition-all hover:border-[rgba(0,177,79,0.3)] hover:shadow-[var(--glow)] hover:-translate-y-1 p-0">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="item-1" className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center border-none">
                    <span className="font-medium text-[var(--text)] text-base leading-relaxed">What is the HireGenAI, and how does it work?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-[var(--text-muted)] leading-relaxed text-base">
                    The HireGenAI is an advanced platform that uses artificial intelligence to streamline and enhance your hiring process. It automates tasks like candidate sourcing, screening, and initial assessments, helping you find the best talent faster.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center border-none">
                    <span className="font-medium text-[var(--text)] text-base leading-relaxed">How does it accelerate my hiring process?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-[var(--text-muted)] leading-relaxed text-base">
                    By automating repetitive tasks, providing intelligent candidate matching, and enabling quicker shortlisting, the HireGenAI significantly reduces the time-to-hire. It allows your recruitment team to focus on engaging with top candidates.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center border-none">
                    <span className="font-medium text-[var(--text)] text-base leading-relaxed">Will the HireGenAI replace my recruiter?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-[var(--text-muted)] leading-relaxed text-base">
                    Not at all! The HireGenAI is designed to augment and empower your human recruiters, not replace them. It handles the time-consuming, data-intensive parts of recruitment, freeing up your team to focus on strategic tasks and building relationships.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center border-none">
                    <span className="font-medium text-[var(--text)] text-base leading-relaxed">What kind of roles can HireGenAI screen for?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-[var(--text-muted)] leading-relaxed text-base">
                    Our HireGenAI is versatile and can be configured to screen for a wide range of roles across various industries, from technical and engineering positions to sales, marketing, and customer service roles. It adapts to the specific skills and qualifications required for each position.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center border-none">
                    <span className="font-medium text-[var(--text)] text-base leading-relaxed">Can HireGenAI integrate with our existing hiring processes?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-[var(--text-muted)] leading-relaxed text-base">
                    Yes, we understand the importance of seamless integration. Our HireGenAI offers flexible integration options with popular Applicant Tracking Systems (ATS) and other HR software to fit smoothly into your current workflows.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6" className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center border-none">
                    <span className="font-medium text-[var(--text)] text-base leading-relaxed">How do I get started?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-[var(--text-muted)] leading-relaxed text-base">
                    Getting started is easy! You can request a demo through our website or contact our sales team. We'll guide you through the setup process and help you configure the HireGenAI to meet your specific needs.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-[var(--text)]">
        <div className="w-full text-center px-4 sm:px-6 lg:px-8 xl:px-12">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to revolutionize your hiring?</h2>
          <p className="text-xl mb-8 text-[#dcfce7]">
            Join thousands of companies already using AI to hire better, faster, and smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="bg-[var(--primary)] text-[var(--text)] hover:bg-[var(--primary-dark)] font-semibold px-8 py-4 text-lg rounded-full"
              asChild
            >
              <Link href="/pricing">
                View pricing
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-[var(--primary)] text-[var(--primary-light)] hover:bg-[var(--primary)]/10 font-semibold px-8 py-4 text-lg rounded-full bg-transparent"
              asChild
            >
              <Link href="/demo-en">
                Try demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--dark)] text-[var(--text)] py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-6 md:gap-12 mb-12">
            {/* Left Section - Brand Block */}
            <div className="col-span-2 md:col-span-3">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-[var(--text)]">Hire</span>
                <span className="text-[var(--primary-light)]">GenAI</span>
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">By SKYGENAI</p>
              <p className="text-[var(--text-muted)] mb-6 text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
              </p>
              <p className="text-[var(--text-muted)] mb-6 text-sm font-medium">
                Email: <a href="mailto:support@hire-genai.com" className="text-[var(--primary-light)] hover:text-[#a7f3d0] transition-colors">support@hire-genai.com</a>
              </p>
              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/hire-genai" className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-[var(--text)] text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-[var(--text-muted)] text-sm">
                <li>
                  <Link href="/demo-en" className="hover:text-[var(--primary-light)] transition-colors">
                    Try the Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[var(--primary-light)] transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      const element = document.getElementById('assessment');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors text-left w-full"
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
                    className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors text-left w-full"
                  >
                    FAQs
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-[var(--text)] text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-[var(--text-muted)] text-sm">
                <li>
                  <Link href="/about" className="hover:text-[var(--primary-light)] transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[var(--primary-light)] transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book-meeting" className="hover:text-[var(--primary-light)] transition-colors">
                    Book a Meeting
                  </Link>
                </li>
                <li>
                  <Link href="/owner-login" className="hover:text-[var(--primary-light)] transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-[var(--text)] text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-[var(--text-muted)] text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-[var(--primary-light)] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[var(--primary-light)] transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Section - Badges Block */}
            <div className="col-span-1 md:col-span-3">
              <div className="space-y-4">
                {/* Trustpilot Badge */}
                <div className="bg-[var(--dark2)] rounded-lg p-4 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#facc15] text-[#facc15]" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-[var(--text)]">TrustScore 4.5</p>
                </div>

                {/* GDPR Compliant Badge */}
                <div className="bg-[var(--dark2)] rounded-lg p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-[var(--primary-light)]" />
                    <p className="text-sm font-semibold text-[var(--text)]">GDPR COMPLIANT</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-[var(--border)] pt-8 text-center text-[var(--text-muted)] text-sm">
            <p>&copy; 2025 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

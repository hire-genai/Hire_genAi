'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/Navbar'
import {
  Calculator,
  ChartLine,
  Brain,
  Expand,
  GraduationCap,
  Zap,
  DollarSign,
  Clock,
  BarChart3,
  Infinity,
  SlidersHorizontal,
  UserCheck,
  Bot,
  PieChart,
  PiggyBank,
  Crown,
  Shield,
  Rocket,
  Info,
  RotateCcw,
  TrendingUp,
  Linkedin,
  Twitter,
  Github,
  Mail,
  Phone,
  MapPin,
  Globe
} from 'lucide-react'
import Footer from '@/components/layout/Footer'

// Plans for recommendation (matches /pricing page)
const PLANS_LOOKUP = [
  { name: 'Starter',      monthly: 99,   annual: 990,   cvCap: 200,   interviewCap: 4   },
  { name: 'Professional', monthly: 499,  annual: 4990,  cvCap: 1000,  interviewCap: 20  },
  { name: 'Business',     monthly: 999,  annual: 9990,  cvCap: 2000,  interviewCap: 40  },
  { name: 'Large',        monthly: 2999, annual: 29990, cvCap: 6000,  interviewCap: 120 },
  { name: 'Ultra',        monthly: 3999, annual: 39990, cvCap: 8000,  interviewCap: 160 },
  { name: 'Enterprise',   monthly: 4999, annual: 49990, cvCap: 10000, interviewCap: 200 },
]

// Currency configuration based on country
const CURRENCY_CONFIG: Record<string, { code: string; symbol: string; rate: number; locale: string }> = {
  US: { code: 'USD', symbol: '$', rate: 1, locale: 'en-US' },
  IN: { code: 'INR', symbol: '₹', rate: 83.5, locale: 'en-IN' },
  SG: { code: 'SGD', symbol: 'S$', rate: 1.35, locale: 'en-SG' },
  GB: { code: 'GBP', symbol: '£', rate: 0.79, locale: 'en-GB' },
  EU: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE' },
  AE: { code: 'AED', symbol: 'د.إ', rate: 3.67, locale: 'ar-AE' },
  AU: { code: 'AUD', symbol: 'A$', rate: 1.55, locale: 'en-AU' },
  CA: { code: 'CAD', symbol: 'C$', rate: 1.36, locale: 'en-CA' },
  JP: { code: 'JPY', symbol: '¥', rate: 149, locale: 'ja-JP' },
  CN: { code: 'CNY', symbol: '¥', rate: 7.24, locale: 'zh-CN' },
  PK: { code: 'PKR', symbol: '₨', rate: 278, locale: 'en-PK' },
  BD: { code: 'BDT', symbol: '৳', rate: 110, locale: 'bn-BD' },
  MY: { code: 'MYR', symbol: 'RM', rate: 4.72, locale: 'ms-MY' },
  PH: { code: 'PHP', symbol: '₱', rate: 56, locale: 'en-PH' },
  ID: { code: 'IDR', symbol: 'Rp', rate: 15800, locale: 'id-ID' },
  TH: { code: 'THB', symbol: '฿', rate: 35.5, locale: 'th-TH' },
  VN: { code: 'VND', symbol: '₫', rate: 24500, locale: 'vi-VN' },
  KR: { code: 'KRW', symbol: '₩', rate: 1320, locale: 'ko-KR' },
  SA: { code: 'SAR', symbol: 'ر.س', rate: 3.75, locale: 'ar-SA' },
  ZA: { code: 'ZAR', symbol: 'R', rate: 18.5, locale: 'en-ZA' },
  BR: { code: 'BRL', symbol: 'R$', rate: 4.95, locale: 'pt-BR' },
  MX: { code: 'MXN', symbol: '$', rate: 17.2, locale: 'es-MX' },
  NZ: { code: 'NZD', symbol: 'NZ$', rate: 1.67, locale: 'en-NZ' },
  CH: { code: 'CHF', symbol: 'CHF', rate: 0.88, locale: 'de-CH' },
  HK: { code: 'HKD', symbol: 'HK$', rate: 7.82, locale: 'zh-HK' },
  DE: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE' },
  FR: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'fr-FR' },
  IT: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'it-IT' },
  ES: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'es-ES' },
  NL: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'nl-NL' },
  BE: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'nl-BE' },
  AT: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-AT' },
  IE: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'en-IE' },
  PT: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'pt-PT' },
  FI: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'fi-FI' },
  SE: { code: 'SEK', symbol: 'kr', rate: 10.5, locale: 'sv-SE' },
  NO: { code: 'NOK', symbol: 'kr', rate: 10.8, locale: 'nb-NO' },
  DK: { code: 'DKK', symbol: 'kr', rate: 6.9, locale: 'da-DK' },
  PL: { code: 'PLN', symbol: 'zł', rate: 4.0, locale: 'pl-PL' },
}

export default function ROIPage() {
  // Fixed USD pricing — no country detection
  const currencyConfig = CURRENCY_CONFIG['US']

  // AI pricing fetched from env via API
  const [aiCvCost, setAiCvCost] = useState(0.50)
  const [aiInterviewCost, setAiInterviewCost] = useState(0.50)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/roi')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  // Fetch AI cost config from env vars
  useEffect(() => {
    fetch('/api/roi-config')
      .then(r => r.json())
      .then(data => {
        if (data.cvCost != null) setAiCvCost(data.cvCost)
        if (data.interviewCostPerMin != null) setAiInterviewCost(data.interviewCostPerMin)
      })
      .catch(() => {})
  }, [])

  // Job parameters
  const [jobPostings, setJobPostings] = useState(5)
  const [cvsPerJob, setCvsPerJob] = useState(100)
  const [months, setMonths] = useState(1)

  // Human recruiter inputs (string state for better input control)
  const [humanCvTime, setHumanCvTime] = useState('5')
  const [numRecruiters, setNumRecruiters] = useState('3')
  const [recruiterHourlyRate, setRecruiterHourlyRate] = useState('30')
  const [recruiterHoursPerDay, setRecruiterHoursPerDay] = useState('8')
  const [recruiterDaysPerWeek, setRecruiterDaysPerWeek] = useState('5')

  // Shared fields (same value in both Human and AI sections)
  const [shortlistRate, setShortlistRate] = useState('15')
  const [interviewTime, setInterviewTime] = useState('20')
  const [qualifiedRate, setQualifiedRate] = useState('30')

  // AI fixed display values
  const AI_AGENTS = 1
  const AI_HOURS_PER_DAY = 24
  const AI_DAYS_PER_WEEK = 7
  const AI_HOURLY_RATE_DISPLAY = 10

  const calculations = useMemo(() => {
    // Parse string states to numbers
    const numRecruitersParsed = parseInt(numRecruiters) || 1
    const recruiterHourlyRateParsed = parseInt(recruiterHourlyRate) || 5
    const recruiterHoursPerDayParsed = parseInt(recruiterHoursPerDay) || 1
    const recruiterDaysPerWeekParsed = parseInt(recruiterDaysPerWeek) || 1
    const humanCvTimeParsed = parseInt(humanCvTime) || 1
    const shortlistRateParsed = parseInt(shortlistRate) || 1
    const interviewTimeParsed = parseInt(interviewTime) || 10
    const qualifiedRateParsed = parseInt(qualifiedRate) || 1

    const totalCvsPerMonth = jobPostings * cvsPerJob
    const totalCvsOverall = totalCvsPerMonth * months

    // Shared pipeline
    const interviewsPerMonth = totalCvsPerMonth * (shortlistRateParsed / 100)
    const qualifiedPerMonth = interviewsPerMonth * (qualifiedRateParsed / 100)
    const totalInterviews = Math.round(interviewsPerMonth * months)
    const totalQualified = Math.round(qualifiedPerMonth * months)

    // Human: Fixed salary cost model (recruiter is always paid regardless of volume)
    // Monthly salary = recruiters × rate × hours/day × days/week × 4.33 weeks
    const humanMonthlyFixedCost = numRecruitersParsed * recruiterHourlyRateParsed * recruiterHoursPerDayParsed * recruiterDaysPerWeekParsed * 4.33
    const humanMonthlyWithBenefits = humanMonthlyFixedCost * 1.3   // 30% benefits overhead
    const humanTotalPerMonth = humanMonthlyWithBenefits * 1.15     // 15% turnover & training overhead
    const humanTotalOverall = humanTotalPerMonth * months

    // Breakdown: split fixed cost by proportion of task time (CV vs interview)
    const cvHoursPerMonth = totalCvsPerMonth * (humanCvTimeParsed / 60)
    const interviewHoursPerMonth = interviewsPerMonth * (interviewTimeParsed / 60)
    const totalTaskHours = cvHoursPerMonth + interviewHoursPerMonth || 1
    const humanCvCostTotal = (cvHoursPerMonth / totalTaskHours) * humanTotalOverall
    const humanInterviewCostTotal = (interviewHoursPerMonth / totalTaskHours) * humanTotalOverall

    const humanQualifiedOverall = qualifiedPerMonth * months
    const humanPerCandidate = humanQualifiedOverall > 0 ? humanTotalOverall / humanQualifiedOverall : 0
    const humanAvailableHoursPerMonth = Math.round(numRecruitersParsed * recruiterHoursPerDayParsed * recruiterDaysPerWeekParsed * 4.33)

    // AI: Usage-based cost (pay only for what you use)
    const aiCvCostPerMonth = totalCvsPerMonth * aiCvCost
    const aiInterviewCostPerMonth = interviewsPerMonth * interviewTimeParsed * aiInterviewCost
    const aiTotalPerMonth = aiCvCostPerMonth + aiInterviewCostPerMonth
    const aiTotalOverall = aiTotalPerMonth * months
    const aiCvCostTotal = aiCvCostPerMonth * months
    const aiInterviewCostTotal = aiInterviewCostPerMonth * months
    const aiQualifiedOverall = qualifiedPerMonth * months
    const aiPerCandidate = aiQualifiedOverall > 0 ? aiTotalOverall / aiQualifiedOverall : 0

    // Savings
    const savings = humanTotalOverall - aiTotalOverall
    const savingsPercentage = humanTotalOverall > 0 ? Math.round((savings / humanTotalOverall) * 100) : 0
    const monthlySavingsValue = savings / months

    // Scalability factor
    const totalVolume = jobPostings * cvsPerJob
    let scalabilityFactor = '1x'
    if (totalVolume <= 100) scalabilityFactor = '1x'
    else if (totalVolume <= 500) scalabilityFactor = '3x'
    else if (totalVolume <= 1000) scalabilityFactor = '5x'
    else if (totalVolume <= 2000) scalabilityFactor = '10x'
    else scalabilityFactor = '20x+'

    const baseROI = 85
    const volumeBonus = Math.min(15, Math.floor(totalVolume / 100))
    const totalROI = baseROI + volumeBonus

    // Recommend plan: find cheapest plan whose wallet covers monthly AI usage
    // Plan monthly price = wallet credit (pay-per-use consumed from wallet)
    const recommendedPlan = PLANS_LOOKUP.find(p => aiTotalPerMonth <= p.monthly)
      ?? PLANS_LOOKUP[PLANS_LOOKUP.length - 1]

    // Annual savings vs monthly: plan annual price = 10× monthly (2 months free)
    const annualMonthlyCost = Math.round(recommendedPlan.annual / 12)
    const annualSavingsPerYear = (recommendedPlan.monthly * 12) - recommendedPlan.annual
    const annualSavingsPct = Math.round(annualSavingsPerYear / (recommendedPlan.monthly * 12) * 100)

    // ROI payback: how many months until cumulative savings cover plan subscription
    // Real monthly savings with AI plan = humanTotalPerMonth - recommendedPlan.monthly
    const realMonthlySavings = humanTotalPerMonth - recommendedPlan.monthly
    const paybackMonths = realMonthlySavings > 0
      ? recommendedPlan.monthly / realMonthlySavings
      : null

    return {
      totalCvsOverall,
      totalInterviews,
      totalQualified,
      humanCvCostTotal,
      humanInterviewCostTotal,
      humanTotalOverall,
      humanTotalPerMonth,
      humanPerCandidate,
      humanAvailableHoursPerMonth,
      aiCvCostTotal,
      aiInterviewCostTotal,
      aiTotalOverall,
      aiTotalPerMonth,
      aiPerCandidate,
      savings,
      savingsPercentage,
      monthlySavingsValue,
      scalabilityFactor,
      totalROI,
      recommendedPlan,
      annualMonthlyCost,
      annualSavingsPerYear,
      annualSavingsPct,
      paybackMonths
    }
  }, [jobPostings, cvsPerJob, months, humanCvTime, numRecruiters, recruiterHourlyRate, recruiterHoursPerDay, recruiterDaysPerWeek, shortlistRate, interviewTime, qualifiedRate, aiCvCost, aiInterviewCost])

  const resetToDefaults = () => {
    setJobPostings(5)
    setCvsPerJob(100)
    setMonths(1)
    setHumanCvTime('5')
    setNumRecruiters('3')
    setRecruiterHourlyRate('30')
    setRecruiterHoursPerDay('8')
    setRecruiterDaysPerWeek('5')
    setShortlistRate('15')
    setInterviewTime('45')
    setQualifiedRate('30')
  }

  const formatCurrency = (valueInUSD: number) => {
    const convertedValue = valueInUSD * currencyConfig.rate
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(convertedValue)
  }

  const formatSmallCurrency = (valueInUSD: number) => {
    const convertedValue = valueInUSD * currencyConfig.rate
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedValue)
  }


  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-8">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 text-white overflow-hidden border border-emerald-500/20">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-emerald-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full font-bold flex items-center gap-1 sm:gap-2 shadow-lg text-sm sm:text-base">
            <ChartLine className="w-5 h-5" />
            ROI: Up to {calculations.totalROI}%
          </div>

          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold mb-2 flex flex-wrap items-center gap-2 pr-16 sm:pr-20">
            <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 flex-shrink-0" />
            <span className="break-words">AI Recruiter <span className="text-emerald-400">ROI Calculator</span></span>
          </h1>
          <p className="text-sm sm:text-base opacity-90 max-w-3xl mb-3 text-slate-200">
            Your Permanent Hiring Expert That Scales With Your Needs & Retains Institutional Knowledge
          </p>

          {/* AI Permanent Banner */}
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30 mb-3">
            <h3 className="text-xs font-bold mb-1 flex items-center gap-1.5 text-emerald-300">
              <Infinity className="w-3.5 h-3.5 flex-shrink-0" />
              AI Recruiter: Your Permanent Scalable Resource
            </h3>
            <p className="opacity-75 mb-2 text-slate-300 text-[11px] leading-snug">
              Unlike human recruiters who leave, our AI becomes a permanent asset that grows smarter over time, retaining all organizational knowledge and scaling instantly with your hiring demands.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-emerald-500/10 rounded p-1.5 text-center border border-emerald-500/20">
                <Brain className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-300" />
                <div className="text-slate-200 text-[10px]">Knowledge Retention</div>
              </div>
              <div className="bg-emerald-500/10 rounded p-1.5 text-center border border-emerald-500/20">
                <Expand className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-300" />
                <div className="text-slate-200 text-[10px]">Instant Scalability</div>
              </div>
              <div className="bg-emerald-500/10 rounded p-1.5 text-center border border-emerald-500/20">
                <GraduationCap className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-300" />
                <div className="text-slate-200 text-[10px]">Continuous Learning</div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5 border border-emerald-500/20">
              <Zap className="w-3 h-3 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200 text-xs">Process CVs 10x faster</span>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5 border border-emerald-500/20">
              <DollarSign className="w-3 h-3 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200 text-xs">Usage-based AI pricing</span>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5 border border-emerald-500/20">
              <Clock className="w-3 h-3 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200 text-xs">24/7 availability</span>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5 border border-emerald-500/20">
              <BarChart3 className="w-3 h-3 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200 text-xs">Knowledge stays forever</span>
            </div>
          </div>
        </div>

        {/* Calculator Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-600 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-emerald-100 flex items-center gap-3">
              <SlidersHorizontal className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              Job & Recruitment Parameters
            </h2>

            {/* Time Period — TOP */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Time Period for Calculation
              </label>
              <div className="flex items-center gap-2 sm:gap-4">
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="min-w-[70px] sm:min-w-[90px] font-bold text-emerald-600 text-base sm:text-lg text-right">{months} month{months > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Job Postings Slider */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Number of Job Postings per Month
              </label>
              <div className="flex items-center gap-2 sm:gap-4">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={jobPostings}
                  onChange={(e) => setJobPostings(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="min-w-[40px] sm:min-w-[50px] font-bold text-emerald-600 text-base sm:text-lg">{jobPostings}</span>
              </div>
            </div>

            {/* CVs per Job Slider */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Average CVs Received per Job Posting
              </label>
              <div className="flex items-center gap-2 sm:gap-4">
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={cvsPerJob}
                  onChange={(e) => setCvsPerJob(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="min-w-[40px] sm:min-w-[50px] font-bold text-emerald-600 text-base sm:text-lg">{cvsPerJob}</span>
              </div>
            </div>

            {/* ── Human Recruiter Limitations ── */}
            <h3 className="text-base sm:text-lg font-bold text-red-600 mt-6 sm:mt-8 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-red-100 flex items-center gap-2 sm:gap-3">
              <UserCheck className="w-5 sm:w-6 h-5 sm:h-6 bg-red-50 p-1 rounded-lg" />
              Human Recruiter Limitations
            </h3>

            {/* 3-col grid: row1 = Recruiters, Hourly Rate, Hours/Day */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Recruiters</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={numRecruiters}
                    onChange={(e) => setNumRecruiters(e.target.value)}
                    onBlur={(e) => setNumRecruiters(String(parseInt(e.target.value) || 1))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">ppl</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Hourly Rate (Always)</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={recruiterHourlyRate}
                    onChange={(e) => setRecruiterHourlyRate(e.target.value)}
                    onBlur={(e) => setRecruiterHourlyRate(String(parseInt(e.target.value) || 5))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">$/hr</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Hours per Day</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={recruiterHoursPerDay}
                    onChange={(e) => setRecruiterHoursPerDay(e.target.value)}
                    onBlur={(e) => setRecruiterHoursPerDay(String(parseInt(e.target.value) || 1))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">hrs</span>
                </div>
              </div>
            </div>

            {/* 3-col grid: row2 = Days/Week, Min/CV, Capacity */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Days per Week</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={recruiterDaysPerWeek}
                    onChange={(e) => setRecruiterDaysPerWeek(e.target.value)}
                    onBlur={(e) => setRecruiterDaysPerWeek(String(parseInt(e.target.value) || 1))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">days</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Min to Review 1 CV</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={humanCvTime}
                    onChange={(e) => setHumanCvTime(e.target.value)}
                    onBlur={(e) => setHumanCvTime(String(parseInt(e.target.value) || 1))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">min</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Capacity</label>
                <div className="flex w-full items-center bg-gray-50 border-2 border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600">
                  <strong className="text-gray-800">{calculations.humanAvailableHoursPerMonth.toLocaleString()}</strong>&nbsp;hrs/mo
                </div>
              </div>
            </div>

            {/* 3-col grid: row3 = Shortlist %, Interview Time, Qualified % */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">% Shortlisted</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={shortlistRate}
                    onChange={(e) => setShortlistRate(e.target.value)}
                    onBlur={(e) => setShortlistRate(String(parseInt(e.target.value) || 1))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">%</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Interview Time</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    onBlur={(e) => setInterviewTime(String(parseInt(e.target.value) || 10))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">min</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">% Qualified</label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={qualifiedRate}
                    onChange={(e) => setQualifiedRate(e.target.value)}
                    onBlur={(e) => setQualifiedRate(String(parseInt(e.target.value) || 1))}
                    className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm w-0"
                  />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">%</span>
                </div>
              </div>
            </div>

            {/* ── AI Recruiter Advantages ── */}
            <h3 className="text-base sm:text-lg font-bold text-emerald-600 mt-6 sm:mt-8 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-emerald-100 flex items-center gap-2 sm:gap-3">
              <Bot className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              AI Recruiter Advantages
            </h3>

            {/* AI Advantages — clean 2-row x 3-col grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">AI Agent</label>
                <div className="flex w-full">
                  <input type="text" value={AI_AGENTS} disabled className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-700 font-medium text-sm w-0" />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">agent</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Hourly Rate</label>
                <div className="flex w-full items-center border-2 border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
                  <span className="text-xs italic text-gray-400">As per usage</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Hours / Day</label>
                <div className="flex w-full">
                  <input type="text" value={AI_HOURS_PER_DAY} disabled className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-700 font-medium text-sm w-0" />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">hrs</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Days / Week</label>
                <div className="flex w-full">
                  <input type="text" value={AI_DAYS_PER_WEEK} disabled className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-700 font-medium text-sm w-0" />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">days</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">% Shortlisted</label>
                <div className="flex w-full">
                  <input type="number" value={shortlistRate} disabled className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-700 font-medium text-sm w-0" />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">%</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">Interview Time</label>
                <div className="flex w-full">
                  <input type="number" value={interviewTime} disabled className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-700 font-medium text-sm w-0" />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">min</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-xs">% Qualified</label>
                <div className="flex w-full">
                  <input type="number" value={qualifiedRate} disabled className="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-700 font-medium text-sm w-0" />
                  <span className="bg-gray-100 px-2 py-1.5 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-xs">%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-4">Shared values mirror the Human section.</div>

          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-600 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-emerald-100 flex items-center gap-3">
              <PieChart className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              Cost Analysis & Results
            </h2>

            {/* Comparison cards (metrics embedded inside) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
              {/* Human Cost */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-200">
                <div className="text-base sm:text-lg font-bold text-gray-700 mb-1">Human Recruiter</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-500 mb-1">{formatCurrency(calculations.humanTotalOverall)}</div>
                <div className="text-xs text-gray-600 mb-3">~{formatSmallCurrency(calculations.humanPerCandidate)} per qualified candidate</div>

                {/* Embedded metrics */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-white/70 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">CVs</div>
                    <div className="text-sm font-bold text-red-600">{calculations.totalCvsOverall.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/70 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">Interviews</div>
                    <div className="text-sm font-bold text-red-600">{calculations.totalInterviews.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/70 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">Qualified</div>
                    <div className="text-sm font-bold text-red-600">{calculations.totalQualified.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-1 border-b border-red-200">
                    <span className="text-xs">CV Screening Cost</span>
                    <span className="text-xs">{formatCurrency(calculations.humanCvCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-red-200">
                    <span className="text-xs">Interview Cost</span>
                    <span className="text-xs">{formatCurrency(calculations.humanInterviewCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-red-500 border-t-2 border-red-300 mt-1">
                    <span className="text-xs">Total Cost</span>
                    <span className="text-xs">{formatCurrency(calculations.humanTotalOverall)}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-red-600 bg-red-100 rounded p-1.5">
                  Incl. 30% benefits + 15% turnover overhead
                </div>
              </div>

              {/* AI Cost */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200 relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Permanent
                </div>
                <div className="text-base sm:text-lg font-bold text-gray-700 mb-1">AI Recruiter</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-500 mb-1">{formatCurrency(calculations.aiTotalOverall)}</div>
                <div className="text-xs text-gray-600 mb-3">~{formatSmallCurrency(calculations.aiPerCandidate)} per qualified candidate</div>

                {/* Embedded metrics */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-white/70 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">CVs</div>
                    <div className="text-sm font-bold text-green-600">{calculations.totalCvsOverall.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/70 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">Interviews</div>
                    <div className="text-sm font-bold text-green-600">{calculations.totalInterviews.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/70 rounded p-1.5 text-center">
                    <div className="text-[10px] text-gray-500">Qualified</div>
                    <div className="text-sm font-bold text-green-600">{calculations.totalQualified.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-1 border-b border-green-200">
                    <span className="text-xs">CV Screening Cost</span>
                    <span className="text-xs">{formatCurrency(calculations.aiCvCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-green-200">
                    <span className="text-xs">Interview Cost</span>
                    <span className="text-xs">{formatCurrency(calculations.aiInterviewCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-green-500 border-t-2 border-green-300 mt-1">
                    <span className="text-xs">Total Cost</span>
                    <span className="text-xs">{formatCurrency(calculations.aiTotalOverall)}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-green-600 bg-green-100 rounded p-1.5">
                  Usage-based pricing — pay only for what you use
                </div>
              </div>
            </div>

            {/* Minimized Savings Strip */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-3 sm:p-4 text-white shadow-md mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] opacity-80 leading-tight">Potential Savings</div>
                    <div className="text-lg sm:text-xl font-bold leading-tight">{formatCurrency(calculations.savings)}</div>
                  </div>
                </div>
                <div className="bg-white/15 rounded-lg px-2 py-1 text-center min-w-[70px]">
                  <div className="text-[10px] opacity-80">Reduction</div>
                  <div className="text-sm font-bold">{calculations.savingsPercentage}%</div>
                </div>
                <div className="bg-white/15 rounded-lg px-2 py-1 text-center min-w-[70px]">
                  <div className="text-[10px] opacity-80">Monthly</div>
                  <div className="text-sm font-bold">{formatCurrency(calculations.monthlySavingsValue)}</div>
                </div>
                <div className="bg-white/15 rounded-lg px-2 py-1 text-center min-w-[70px]">
                  <div className="text-[10px] opacity-80">Scale</div>
                  <div className="text-sm font-bold">{calculations.scalabilityFactor}</div>
                </div>
              </div>
            </div>

            {/* Compact Comparison Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-[11px] sm:text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold text-red-600 border-b border-gray-200">Human Recruiter</th>
                    <th className="px-2 py-1.5 text-left font-bold text-emerald-600 border-b border-gray-200">AI Recruiter</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="px-2 py-1.5">Works 8 hrs/day, 5 days/week</td>
                    <td className="px-2 py-1.5">Works 24 hrs/day, 7 days/week</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="px-2 py-1.5">Limited by recruiter availability</td>
                    <td className="px-2 py-1.5">Always available</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-2 py-1.5">Screening starts when recruiter is available</td>
                    <td className="px-2 py-1.5">Screening starts immediately upon application</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="px-2 py-1.5">Hiring queues can build up</td>
                    <td className="px-2 py-1.5">Processes candidates on demand</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">Capacity constrained</td>
                    <td className="px-2 py-1.5">Scales instantly to any volume</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Plan Recommendation Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 mb-4 border border-emerald-500/30">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-emerald-500 rounded-lg p-1.5 flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">AI recommends based on your ROI</div>
                  <div className="text-white font-bold text-sm leading-tight">
                    <span className="text-emerald-400">{calculations.recommendedPlan.name} Plan</span>
                    <span className="text-slate-400 text-xs font-normal ml-2">
                      — covers your {formatCurrency(calculations.aiTotalPerMonth)}/mo AI usage
                    </span>
                  </div>
                </div>
              </div>

              {/* Why this plan */}
              <div className="bg-white/5 rounded-lg p-2 mb-3 border border-white/10">
                <p className="text-[10px] text-slate-300 leading-snug">
                  <span className="text-emerald-300 font-semibold">Why {calculations.recommendedPlan.name}?</span> Your AI usage is {formatCurrency(calculations.aiTotalPerMonth)}/month. This plan's wallet includes {formatCurrency(calculations.recommendedPlan.monthly)}/month in credits, so all your CV screening and interview costs are covered with zero overages. Plus, you save {formatCurrency(calculations.savings)} vs human recruiters in this {months > 1 ? `${months}-month` : 'month-long'} period.
                </p>
              </div>

              {/* Price tiles — clickable */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Monthly */}
                <Link href="/pricing">
                  <div className="bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 rounded-lg p-2 cursor-pointer transition-all">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-1">Monthly</div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold text-white">${calculations.recommendedPlan.monthly.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Billed monthly</div>
                  </div>
                </Link>
                {/* Annual */}
                <Link href="/pricing">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/20 rounded-lg p-2 cursor-pointer transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[9px] text-emerald-400 uppercase tracking-wide">Annual</div>
                      <div className="bg-emerald-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">
                        Save {calculations.annualSavingsPct}%
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold text-white">${calculations.annualMonthlyCost.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                    <div className="text-[9px] text-emerald-300 mt-0.5">
                      ${calculations.recommendedPlan.annual.toLocaleString()}/yr
                    </div>
                  </div>
                </Link>
              </div>

              {/* ROI payback + CTA */}
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400 leading-snug">
                  {calculations.paybackMonths === null ? (
                    <span className="text-yellow-400">Plan cost exceeds human savings — review inputs</span>
                  ) : calculations.paybackMonths < 1 ? (
                    <span className="text-emerald-400">Pays back in <strong className="text-emerald-300">&lt; 1 month</strong> vs human recruiters</span>
                  ) : (
                    <span>Pays back in <strong className="text-emerald-300">~{Math.ceil(calculations.paybackMonths)} month{Math.ceil(calculations.paybackMonths) === 1 ? '' : 's'}</strong> vs human recruiters</span>
                  )}
                </div>
                <Link href="/pricing" className="flex-shrink-0">
                  <button className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    See All Plans →
                  </button>
                </Link>
              </div>
            </div>

            {/* AI Permanent Resource Advantages — compact 3-column */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Knowledge Retention</div>
                <div className="text-2xl font-bold text-emerald-600">100%</div>
                <div className="text-[10px] text-gray-500 mt-1">Zero loss</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Scalability</div>
                <div className="text-2xl font-bold text-emerald-600">{calculations.scalabilityFactor}</div>
                <div className="text-[10px] text-gray-500 mt-1">Instant scale</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Uptime</div>
                <div className="text-2xl font-bold text-emerald-600">99.9%</div>
                <div className="text-[10px] text-gray-500 mt-1">Always on</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Advantages Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg mb-6 sm:mb-8 border border-gray-100">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600 mb-4 sm:mb-8 flex items-center gap-2 sm:gap-3">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 flex-shrink-0" />
            <span>Why AI is Your Permanent Hiring Asset</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-600 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 flex-shrink-0" />
                Knowledge Retention
              </h4>
              <ul className="space-y-1 text-gray-700 text-xs">
                <li><strong>Never loses expertise:</strong> Unlike human recruiters who leave, AI retains all hiring knowledge permanently</li>
                <li><strong>Continuous learning:</strong> Gets smarter with every hire, understanding your company culture better over time</li>
                <li><strong>Consistent standards:</strong> Maintains uniform evaluation criteria across all hiring cycles</li>
                <li><strong>Historical insight:</strong> Remembers what worked (and what didn't) in past hiring campaigns</li>
              </ul>
            </div>

            <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-600 mb-2 flex items-center gap-2">
                <Expand className="w-4 h-4 flex-shrink-0" />
                Instant Scalability
              </h4>
              <ul className="space-y-1 text-gray-700 text-xs">
                <li><strong>Handles volume spikes:</strong> Process 10 or 10,000 CVs with equal efficiency</li>
                <li><strong>No hiring delays:</strong> No need to recruit and train additional human recruiters</li>
                <li><strong>24/7 availability:</strong> Works nights, weekends, holidays without overtime pay</li>
                <li><strong>Geographic flexibility:</strong> Screen candidates across time zones simultaneously</li>
              </ul>
            </div>

            <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-600 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                Cost Efficiency
              </h4>
              <ul className="space-y-1 text-gray-700 text-xs">
                <li><strong>Usage-based pricing:</strong> Pay only for what you use with no fixed overhead</li>
                <li><strong>No turnover costs:</strong> Eliminates recruitment, training, and severance costs</li>
                <li><strong>Predictable expenses:</strong> Simple per-CV and per-interview minute pricing</li>
                <li><strong>No benefits overhead:</strong> No healthcare, vacation, sick days, or retirement contributions</li>
              </ul>
            </div>

            <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-600 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                Risk & Compliance
              </h4>
              <ul className="space-y-1 text-gray-700 text-xs">
                <li><strong>Reduced bias:</strong> Consistent, objective evaluations minimize discrimination risks</li>
                <li><strong>Audit trail:</strong> Complete documentation of all hiring decisions</li>
                <li><strong>Compliance adherence:</strong> Always follows configured hiring policies and regulations</li>
                <li><strong>Data security:</strong> Enterprise-grade security with controlled access to sensitive information</li>
              </ul>
            </div>
          </div>

          {/* Scalability Demonstration */}
          <div className="bg-emerald-50 rounded-lg p-3 mt-4 border border-emerald-300">
            <h4 className="font-bold text-emerald-600 mb-2 flex items-center gap-1.5 text-xs">
              <Rocket className="w-3.5 h-3.5 flex-shrink-0" />
              Scalability Demo
            </h4>
            <p className="text-gray-600 mb-2 text-[11px]">
              Try adjusting the "Number of Job Postings" slider above to see how AI instantly scales with increased demand while maintaining cost efficiency.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <strong className="text-emerald-600 text-[11px]">AI Response:</strong>
                <ul className="mt-1 text-[10px] text-gray-600 space-y-0.5">
                  <li>• Instant capacity adjustment</li>
                  <li>• No quality degradation</li>
                  <li>• Linear cost scaling only</li>
                </ul>
              </div>
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <strong className="text-red-500 text-[11px]">Human Response:</strong>
                <ul className="mt-1 text-[10px] text-gray-600 space-y-0.5">
                  <li>• 3-6 month hiring delay</li>
                  <li>• Quality consistency issues</li>
                  <li>• Exponential cost increases</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="bg-white rounded-xl p-4 shadow-lg mb-4 border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-emerald-600 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span>How This Calculator Works</span>
          </h3>

          <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">
            This calculator compares the total cost of human recruiters versus an AI-powered recruitment system.
          </p>

          <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">
            <strong className="text-emerald-600">Human Recruiter Cost Model:</strong> Calculated as a fixed salary cost — you pay recruiters regardless of volume. Formula: Recruiters × Rate × Hours/day × Days/week × 4.33 weeks × 1.3 (benefits) × 1.15 (turnover overhead).
          </p>

          <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">
            <strong className="text-emerald-600">AI Cost Model:</strong> Pure pay-per-use — {formatSmallCurrency(aiCvCost)}/CV screened + {formatSmallCurrency(aiInterviewCost)}/minute of interview. Prices reflect actual platform pricing from configuration.
          </p>

          <p className="text-gray-700 mb-4 sm:mb-6 leading-relaxed text-xs sm:text-sm">
            <strong className="text-emerald-600">Shared Parameters:</strong> Shortlist rate, interview duration, and qualification rate are identical for both sides — ensuring a fair, apples-to-apples comparison.
          </p>

          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 sm:p-5 rounded-r-lg">
            <p className="text-gray-700 italic text-xs sm:text-sm">
              <strong className="text-emerald-600">Strategic Insight:</strong> AI handles the scalable, repetitive tasks of initial screening and interviewing, while human recruiters provide interpersonal skills for final decisions.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl p-6 sm:p-12 text-center text-white mb-8 sm:mb-12 shadow-lg">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to Transform Your Hiring?</h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-emerald-100">Start saving up to {calculations.savingsPercentage}% on your recruitment costs today</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg rounded-full shadow-lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/book-meeting">
              <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 font-bold px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg rounded-full border-2 border-white backdrop-blur-sm">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

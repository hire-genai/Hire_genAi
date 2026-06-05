'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/Navbar'
import { SlidersHorizontal, UserCheck, Bot, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import { getAppUrl } from '@/lib/domain-config'

const PLANS_LOOKUP = [
  { name: 'Starter',      monthly: 99,   annual: 990,   cvCap: 200   },
  { name: 'Professional', monthly: 499,  annual: 4990,  cvCap: 1000  },
  { name: 'Business',     monthly: 999,  annual: 9990,  cvCap: 2000  },
  { name: 'Large',        monthly: 2999, annual: 29990, cvCap: 6000  },
  { name: 'Ultra',        monthly: 3999, annual: 39990, cvCap: 8000  },
  { name: 'Enterprise',   monthly: 4999, annual: 49990, cvCap: 10000 },
]

const BASE_STEPS = [
  { id: 1,  name: 'Requirement Intake',            group: 'other',     humanBase: 45,  aiBase: 45,  statusType: 'none'   },
  { id: 2,  name: 'JD Creation',                   group: 'other',     humanBase: 20,  aiBase: 20,  statusType: 'none'   },
  { id: 3,  name: 'JD Posting',                    group: 'other',     humanBase: 10,  aiBase: 10,  statusType: 'none'   },
  { id: 4,  name: 'CV Screening',                  group: 'ai-impact', humanBase: 500, aiBase: 100, statusType: 'acc'    },
  { id: 5,  name: 'Candidate Ranking & Matching',  group: 'ai-impact', humanBase: 60,  aiBase: 5,   statusType: 'auto'   },
  { id: 6,  name: 'Qualification Calls',           group: 'ai-impact', humanBase: 300, aiBase: 150, statusType: 'assist' },
  { id: 7,  name: 'Client Submission',             group: 'other',     humanBase: 60,  aiBase: 60,  statusType: 'none'   },
  { id: 8,  name: 'Interview Coordination',        group: 'other',     humanBase: 40,  aiBase: 40,  statusType: 'none'   },
  { id: 9,  name: 'Offer Coordination',            group: 'other',     humanBase: 45,  aiBase: 45,  statusType: 'none'   },
  { id: 10, name: 'Candidate Follow-up & Joining', group: 'other',     humanBase: 60,  aiBase: 60,  statusType: 'none'   },
  { id: 11, name: 'ATS & Admin Updates',           group: 'other',     humanBase: 60,  aiBase: 60,  statusType: 'none'   },
]

const STATUS_STYLES: Record<string, { cls: string; label: string }> = {
  acc:    { cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300', label: 'AI Accelerated' },
  auto:   { cls: 'bg-green-100 text-green-800 border border-green-300',       label: 'AI Automated'   },
  assist: { cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300',    label: 'AI Assisted'    },
  none:   { cls: 'bg-gray-100 text-gray-500 border border-gray-200',          label: 'No Change'      },
}

function fmt(mins: number) {
  return mins < 60 ? `${Math.round(mins)}m` : `${(mins / 60).toFixed(1)}h`
}

export default function ROIPage() {
  const [recruiterCount, setRecruiterCount] = useState(1)
  const [cvsPerReq, setCvsPerReq] = useState(100)
  const [shortlistRate, setShortlistRate] = useState(15)
  const [qualRate, setQualRate] = useState(15)
  const [hourlyRate, setHourlyRate] = useState(30)
  const [workDays, setWorkDays] = useState(5)
  const [dailyHours, setDailyHours] = useState(6)
  const [otherOpen, setOtherOpen] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const router = useRouter()

  // Default values for blur restoration
  const DEFAULTS = { recruiterCount: 1, cvsPerReq: 100, shortlistRate: 15, qualRate: 15, hourlyRate: 30, workDays: 5, dailyHours: 6 }

  // Safe onChange: allow empty values during typing, restore on blur
  const handleInputChange = (value: string, setter: (v: number) => void, allowFloat = false) => {
    if (value === '') {
      setter(NaN) // Allow empty state during typing
      return
    }
    const num = allowFloat ? parseFloat(value) : parseInt(value)
    if (!isNaN(num)) setter(num)
  }

  const handleInputBlur = (value: number, setter: (v: number) => void, defaultVal: number) => {
    if (isNaN(value) || value === 0) setter(defaultVal) // Restore default only on blur if empty
  }

  const jdVolume = recruiterCount * 5

  const handleSelectPlan = (planName: string) => {
    const params = new URLSearchParams({ plan: planName, billing })
    router.push(getAppUrl(`/signup?${params.toString()}`))
  }

  const calc = useMemo(() => {
    const shortlisted = cvsPerReq * (shortlistRate / 100)

    const steps = BASE_STEPS.map(s => {
      let hTime = s.humanBase
      let aTime = s.aiBase
      if (s.id === 4) { hTime = 5 * cvsPerReq;     aTime = 1 * cvsPerReq      }
      if (s.id === 5) { hTime = 0.6 * cvsPerReq;   aTime = 0.05 * cvsPerReq   }
      if (s.id === 6) { hTime = shortlisted * 20;   aTime = shortlisted * 10   }
      return { ...s, hTime, aTime }
    })

    const totalHMins = steps.reduce((s, r) => s + r.hTime, 0)
    const totalAMins = steps.reduce((s, r) => s + r.aTime, 0)
    const hHrs = totalHMins / 60
    const aHrs = totalAMins / 60

    const moHrsPerRec = workDays * dailyHours * 4.345
    const maxHCap = moHrsPerRec / hHrs
    const maxACap = moHrsPerRec / aHrs

    const hReqs = Math.min(jdVolume, maxHCap * recruiterCount)
    const aReqs = Math.min(jdVolume, maxACap * recruiterCount)

    const hCostPerReq  = hHrs * hourlyRate
    const aCostPerReq  = aHrs * hourlyRate
    const hMonthlyCost = hReqs * hCostPerReq
    const aMonthlyCost = aReqs * aCostPerReq
    const savings      = hMonthlyCost - aMonthlyCost
    const savingsPerJD = hCostPerReq - aCostPerReq
    const prodIndex    = maxACap / maxHCap

    const totalCvs = jdVolume * cvsPerReq
    const plan = PLANS_LOOKUP.find(p => totalCvs <= p.cvCap) ?? PLANS_LOOKUP[PLANS_LOOKUP.length - 1]
    const annualMo      = Math.round(plan.annual / 12)
    const annualSavePct = Math.round(((plan.monthly * 12) - plan.annual) / (plan.monthly * 12) * 100)
    const roi           = plan.monthly > 0 ? Math.round((savings / plan.monthly) * 100) : 0

    return {
      steps, hHrs, aHrs, hReqs, aReqs,
      hCostPerReq, aCostPerReq, hMonthlyCost, aMonthlyCost,
      savings, savingsPerJD, prodIndex,
      shortlistedPerReq: shortlisted.toFixed(0),
      qualifiedPerReq: (shortlisted * qualRate / 100).toFixed(0),
      screenReduce: 80,
      rankReduce: Math.round((60 - 5) / 60 * 100),
      qualReduce: 50,
      totalCvs, plan, annualMo, annualSavePct, roi,
    }
  }, [recruiterCount, cvsPerReq, shortlistRate, qualRate, hourlyRate, workDays, dailyHours, jdVolume])

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2 flex-wrap">
            <Bot className="w-7 h-7 text-emerald-500 flex-shrink-0" />
            Human Recruiter vs Human +
            <span className="text-emerald-600">Hire-GenAI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 border-l-4 border-emerald-500 pl-3">
            Real-time ROI simulator · AI accelerates screening, ranking & qualification — human strategic steps unchanged
          </p>
        </div>

        {/* Info Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-3 text-xs text-blue-800">
            <strong>Hire-GenAI does NOT replace recruiters</strong> — Removes screening, parsing & ranking. Recruiters focus on engagement, offers & stakeholders.
          </div>
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-3 text-xs text-amber-800">
            <strong>Human Judgment Remains Critical</strong> for hiring decisions, client relationships, and candidate experience.
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            Business Drivers
            <span className="text-xs font-normal text-gray-400">(adjust to simulate ROI)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Recruiters</label>
              <input
                type="number"
                value={isNaN(recruiterCount) ? '' : recruiterCount}
                min={1}
                max={50}
                onChange={e => handleInputChange(e.target.value, setRecruiterCount)}
                onBlur={() => handleInputBlur(recruiterCount, setRecruiterCount, DEFAULTS.recruiterCount)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[9px] text-gray-400 mt-0.5">× 5 JDs/mo</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Total JDs</label>
              <input type="number" value={jdVolume} readOnly className="w-full px-2.5 py-2 border-2 border-gray-100 rounded-xl text-sm font-semibold bg-gray-50 text-gray-400 cursor-not-allowed" />
              <p className="text-[9px] text-gray-400 mt-0.5">Auto-calculated</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">CVs / Req</label>
              <input
                type="number"
                value={isNaN(cvsPerReq) ? '' : cvsPerReq}
                min={10}
                max={500}
                step={10}
                onChange={e => handleInputChange(e.target.value, setCvsPerReq)}
                onBlur={() => handleInputBlur(cvsPerReq, setCvsPerReq, DEFAULTS.cvsPerReq)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Shortlist %</label>
              <input
                type="number"
                value={isNaN(shortlistRate) ? '' : shortlistRate}
                min={1}
                max={100}
                step={5}
                onChange={e => handleInputChange(e.target.value, setShortlistRate)}
                onBlur={() => handleInputBlur(shortlistRate, setShortlistRate, DEFAULTS.shortlistRate)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Qualified %</label>
              <input
                type="number"
                value={isNaN(qualRate) ? '' : qualRate}
                min={1}
                max={100}
                step={5}
                onChange={e => handleInputChange(e.target.value, setQualRate)}
                onBlur={() => handleInputBlur(qualRate, setQualRate, DEFAULTS.qualRate)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hourly Rate $</label>
              <input
                type="number"
                value={isNaN(hourlyRate) ? '' : hourlyRate}
                min={5}
                max={500}
                step={5}
                onChange={e => handleInputChange(e.target.value, setHourlyRate)}
                onBlur={() => handleInputBlur(hourlyRate, setHourlyRate, DEFAULTS.hourlyRate)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Days / Week</label>
              <input
                type="number"
                value={isNaN(workDays) ? '' : workDays}
                min={1}
                max={7}
                onChange={e => handleInputChange(e.target.value, setWorkDays)}
                onBlur={() => handleInputBlur(workDays, setWorkDays, DEFAULTS.workDays)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hours / Day</label>
              <input
                type="number"
                value={isNaN(dailyHours) ? '' : dailyHours}
                min={1}
                max={16}
                step={0.5}
                onChange={e => handleInputChange(e.target.value, setDailyHours, true)}
                onBlur={() => handleInputBlur(dailyHours, setDailyHours, DEFAULTS.dailyHours)}
                className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 bg-emerald-50 text-emerald-700 text-xs px-3 py-2 rounded-lg inline-block">
            ✓ Hire-GenAI assists in: parsing, screening, ranking, matching & scoring (Steps 4, 5, 6). All other steps remain 100% human-led.
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {[
            { label: 'Screening Time ↓',      value: `${calc.screenReduce}%`,                                         sub: null,                       highlight: false },
            { label: 'Ranking Time ↓',         value: `${calc.rankReduce}%`,                                          sub: null,                       highlight: false },
            { label: 'Qualification Effort ↓', value: `${calc.qualReduce}%`,                                          sub: null,                       highlight: false },
            { label: 'Productivity Index',      value: `${calc.prodIndex.toFixed(1)}x`,                               sub: null,                       highlight: false },
            { label: 'Monthly Savings',         value: `$${Math.round(calc.savings).toLocaleString()}`,               sub: `$${calc.savingsPerJD.toFixed(0)}/JD`, highlight: true  },
            { label: 'Cost/Req vs Human',       value: `${Math.round((calc.aCostPerReq / calc.hCostPerReq) * 100)}%`, sub: null,                       highlight: false },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl p-3.5 text-center border shadow-sm ${kpi.highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
              <div className={`text-xl sm:text-2xl font-extrabold ${kpi.highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{kpi.value}</div>
              <div className="text-[10px] font-semibold uppercase text-slate-400 mt-1 leading-tight">{kpi.label}</div>
              {kpi.sub && <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Plan Recommendation */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 mb-5 border border-emerald-500/20">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Recommended Based on Your Volume</div>
              <h3 className="text-white text-lg font-extrabold">
                <span className="text-emerald-400">{calc.plan.name} Plan</span>
                <span className="text-slate-400 text-sm font-normal ml-2">— handles {calc.totalCvs.toLocaleString()} CVs/mo</span>
              </h3>
            </div>
            {/* Billing toggle */}
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              <button onClick={() => setBilling('monthly')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${billing === 'monthly' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-white'}`}>Monthly</button>
              <button onClick={() => setBilling('annual')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${billing === 'annual' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                Annual
                <span className="text-[9px] bg-emerald-500/30 px-1 py-0.5 rounded-full">-{calc.annualSavePct}%</span>
              </button>
            </div>
          </div>

          {/* Price display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 mb-1">{billing === 'annual' ? 'Per Month (annual)' : 'Per Month'}</div>
              <div className="text-2xl font-bold text-white">
                ${billing === 'annual' ? calc.annualMo.toLocaleString() : calc.plan.monthly.toLocaleString()}
              </div>
              {billing === 'annual' && <div className="text-[10px] text-emerald-300 mt-0.5">${calc.plan.annual.toLocaleString()}/yr billed annually</div>}
              {billing === 'monthly' && <div className="text-[10px] text-slate-500 mt-0.5">billed monthly</div>}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 mb-1">ROI Insight</div>
              <div className="text-emerald-400 font-bold text-xl">{calc.roi >= 1000 ? '1,000%+' : `${calc.roi}%`}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {jdVolume} JDs/mo · {recruiterCount} recruiter{recruiterCount > 1 ? 's' : ''} · ${calc.savingsPerJD.toFixed(0)} saved/JD
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 mb-1">Monthly Savings</div>
              <div className="text-emerald-400 font-bold text-xl">${Math.round(calc.savings).toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-1">vs manual recruitment</div>
            </div>
          </div>

          {/* CTA — click triggers signup + plan pre-selected */}
          <button
            onClick={() => handleSelectPlan(calc.plan.name)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            Get Started with {calc.plan.name} Plan ({billing === 'annual' ? `$${calc.annualMo}/mo billed annually` : `$${calc.plan.monthly}/mo`}) →
          </button>
          <p className="text-center text-[10px] text-slate-500 mt-2">
            Signup → select plan → Stripe checkout · Cancel anytime · <Link href="/pricing" className="text-emerald-400 hover:underline">View all plans</Link>
          </p>
        </div>

        {/* Two-column workflow comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

          {/* Human Column */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b-2 border-gray-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-red-500" />
                Human Recruiter
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Manual screening, ranking & qualification</p>
            </div>

            {/* All Steps — AI-impact ones highlighted inline */}
            <div className="m-3 border border-gray-100 rounded-xl overflow-hidden">
              {calc.steps.filter(s => s.group === 'ai-impact').concat(calc.steps.filter(s => s.group === 'other').slice(0, otherOpen ? undefined : 0)).map(s => {
                const isHighEffort = s.group === 'ai-impact'
                return (
                  <div key={s.id} className={`flex justify-between items-center px-3 py-2.5 border-b last:border-0 text-xs ${isHighEffort ? 'bg-red-50 border-red-100' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      {isHighEffort && <Zap className="w-3 h-3 text-red-400 flex-shrink-0" />}
                      <span className={`font-medium ${isHighEffort ? 'text-red-800' : 'text-slate-500'}`}>Step {s.id}: {s.name}</span>
                    </div>
                    <span className={`font-mono text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${isHighEffort ? 'bg-white border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{fmt(s.hTime)}</span>
                  </div>
                )
              })}
              <button onClick={() => setOtherOpen(o => !o)} className="w-full flex justify-between items-center px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-500 transition-colors border-t border-gray-100">
                <span>{otherOpen ? 'Hide' : 'Show'} Other Steps (No Change)</span>
                {otherOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Metrics */}
            <div className="mx-3 mb-3 mt-auto rounded-xl border border-red-100 bg-red-50 p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Effort / Req', `${calc.hHrs.toFixed(1)}h`],
                  ['Reqs / Month', calc.hReqs.toFixed(1)],
                  ['Cost / Req', `$${calc.hCostPerReq.toFixed(0)}`],
                  ['Monthly Cost', `$${Math.round(calc.hMonthlyCost).toLocaleString()}`],
                  ['Shortlisted / Req', calc.shortlistedPerReq],
                  ['Qualified / Req', calc.qualifiedPerReq],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-white rounded-lg px-2 py-1.5 border border-red-100">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-bold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Human + AI Column */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b-2 border-emerald-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-500" />
                Human + <span className="text-emerald-600 ml-1">Hire-GenAI</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Hire-GenAI accelerates Steps 4, 5, 6</p>
            </div>

            {/* All Steps — AI-impact ones highlighted inline */}
            <div className="m-3 border border-gray-100 rounded-xl overflow-hidden">
              {calc.steps.filter(s => s.group === 'ai-impact').concat(calc.steps.filter(s => s.group === 'other').slice(0, otherOpen ? undefined : 0)).map(s => {
                const isImpact = s.group === 'ai-impact'
                const st = STATUS_STYLES[s.statusType] || STATUS_STYLES.none
                return (
                  <div key={s.id} className={`flex justify-between items-center px-3 py-2.5 border-b last:border-0 text-xs gap-2 flex-wrap ${isImpact ? 'bg-emerald-50 border-emerald-100' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      {isImpact && <Zap className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                      <span className={`font-medium ${isImpact ? 'text-emerald-800' : 'text-slate-500'}`}>Step {s.id}: {s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-mono text-xs font-bold px-3 py-1 rounded-full border ${isImpact ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{fmt(s.aTime)}</span>
                      {isImpact && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>}
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setOtherOpen(o => !o)} className="w-full flex justify-between items-center px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-500 transition-colors border-t border-gray-100">
                <span>{otherOpen ? 'Hide' : 'Show'} Other Steps (No Change)</span>
                {otherOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Metrics */}
            <div className="mx-3 mb-3 mt-auto rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Effort / Req', `${calc.aHrs.toFixed(1)}h`],
                  ['Reqs / Month', calc.aReqs.toFixed(1)],
                  ['Cost / Req', `$${calc.aCostPerReq.toFixed(0)}`],
                  ['Monthly Cost', `$${Math.round(calc.aMonthlyCost).toLocaleString()}`],
                  ['Shortlisted / Req', calc.shortlistedPerReq],
                  ['Qualified / Req', calc.qualifiedPerReq],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-white rounded-lg px-2 py-1.5 border border-emerald-100">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-bold text-emerald-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[10px] text-center text-gray-400 mb-6 leading-relaxed">
          * Hire-GenAI Impact (Steps 4–6): CV screening 5min→1min/cv · ranking 0.6→0.05min/cv · qualification calls 20min→10min per shortlisted candidate.<br />
          Plan recommendation based on monthly CV volume. ROI = (Monthly Savings ÷ Plan Monthly Cost) × 100.
        </p>

        {/* CTA */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 text-center text-white mb-10 shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to Accelerate Your Hiring?</h2>
          <p className="text-emerald-100 mb-6 text-sm sm:text-base">
            Save <strong>${Math.round(calc.savings).toLocaleString()}/month</strong> by adding Hire-GenAI to your team
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-8 py-5 text-base rounded-full shadow-lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/book-meeting">
              <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 font-bold px-8 py-5 text-base rounded-full border-2 border-white backdrop-blur-sm">
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

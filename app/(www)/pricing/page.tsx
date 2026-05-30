"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { getAppUrl } from "@/lib/domain-config"
import { Check, ArrowRight, Info, X, UserCircle, LogOut, ChevronDown } from "lucide-react"

type BillingCycle = 'monthly' | 'annual'

interface PlanDef {
  name: string
  tagline: string
  topLabel?: string
  monthlyPrice: number | null
  annualPrice: number | null
  monthlyWallet: number | null
  annualWallet: number | null
  monthlyCVs: string
  annualCVs: string
  monthlyInterviews: string
  annualInterviews: string
  coreFeatures: string[]
  dashboardFeatures: string[]
  support: string
  popular: boolean
  cta: string
}

const PLANS: PlanDef[] = [
  {
    name: "Starter",
    tagline: "For startups and small teams running their first AI-powered hiring workflows.",
    monthlyPrice: 99,
    annualPrice: 990,
    monthlyWallet: 99,
    annualWallet: 119,
    monthlyCVs: "~200",
    annualCVs: "~240",
    monthlyInterviews: "~4",
    annualInterviews: "~5",
    coreFeatures: [
      "Unlimited job postings",
      "Full ATS — applications, talent pool, delegation & feedback",
      "AI CV evaluation & scoring",
      "AI video interviews",
      "Auto interview question generation",
      "Manager & recruiter dashboards",
      "Wallet billing + invoice generation",
      "Email notifications",
      "Unlimited team members (4 role types)",
    ],
    dashboardFeatures: [
      "Manager KPIs",
      "Recruiter KPIs",
      "Team overview",
      "Client activation tracking",
      "Onboarding completion analytics",
    ],
    support: "Standard Support · 72h response · Email + Chat",
    popular: false,
    cta: "Choose Starter",
  },
  {
    name: "Professional",
    tagline: "For agencies scaling their recruiting operations.",
    monthlyPrice: 499,
    annualPrice: 4990,
    monthlyWallet: 499,
    annualWallet: 599,
    monthlyCVs: "~1,000",
    annualCVs: "~1,200",
    monthlyInterviews: "~20",
    annualInterviews: "~24",
    coreFeatures: [
      "Everything in Starter",
      "Advanced analytics",
      "Pipeline tracking",
      "AI recruiter workflows",
      "Priority support",
      "Role-based access control",
      "Team performance tracking",
    ],
    dashboardFeatures: [
      "All Starter dashboards",
      "Pipeline analytics",
      "CSAT & satisfaction tracking",
      "Onboarding TAT + utilization metrics",
    ],
    support: "Priority Support · 48h response · Chat + Email + Phone",
    popular: false,
    cta: "Choose Professional",
  },
  {
    name: "Business",
    tagline: "For mid-size agencies and growing recruitment teams.",
    monthlyPrice: 999,
    annualPrice: 9990,
    monthlyWallet: 999,
    annualWallet: 1199,
    monthlyCVs: "~2,000",
    annualCVs: "~2,400",
    monthlyInterviews: "~40",
    annualInterviews: "~48",
    coreFeatures: [
      "Everything in Professional",
      "Custom dashboard views",
      "SLA compliance tracking",
      "Retention forecasting",
      "Advanced AI scoring",
      "Dedicated business support",
    ],
    dashboardFeatures: [
      "All Professional dashboards",
      "Executive analytics",
      "Retention forecasting",
      "SLA & utilization insights",
    ],
    support: "Business Support · 24h response · Dedicated Chat",
    popular: false,
    cta: "Choose Business",
  },
  {
    name: "Large",
    tagline: "For scaling recruitment agencies that need serious AI infrastructure.",
    topLabel: "Most Popular · Best for Agencies",
    monthlyPrice: 2999,
    annualPrice: 29990,
    monthlyWallet: 2999,
    annualWallet: 3599,
    monthlyCVs: "~6,000",
    annualCVs: "~7,200",
    monthlyInterviews: "~120",
    annualInterviews: "~144",
    coreFeatures: [
      "Everything in Business",
      "Executive dashboards",
      "Revenue analytics",
      "Multi-team workflows",
      "Slack support",
      "Advanced AI hiring infrastructure",
    ],
    dashboardFeatures: [
      "Executive-level analytics",
      "CLTV + revenue per client",
      "Pipeline health scorecards",
      "SLA monitoring",
    ],
    support: "Large Support · 12h response · Slack + Phone + Onboarding",
    popular: true,
    cta: "Choose Large",
  },
  {
    name: "Ultra",
    tagline: "For high-volume AI-powered hiring operations.",
    monthlyPrice: 3999,
    annualPrice: 39990,
    monthlyWallet: 3999,
    annualWallet: 4799,
    monthlyCVs: "~8,000",
    annualCVs: "~9,600",
    monthlyInterviews: "~160",
    annualInterviews: "~192",
    coreFeatures: [
      "Everything in Large",
      "Department-level analytics",
      "Capacity planning",
      "Churn risk prediction",
      "Dedicated AI optimization support",
    ],
    dashboardFeatures: [
      "Advanced operational analytics",
      "Hiring capacity forecasting",
      "Churn risk indicators",
      "Department insights",
    ],
    support: "Ultra Support · 6h response · 24/7 priority + Dedicated Rep",
    popular: false,
    cta: "Choose Ultra",
  },
  {
    name: "Enterprise",
    tagline: "Ultimate scale for enterprise hiring infrastructure.",
    topLabel: "🔥 Ultimate Scale",
    monthlyPrice: 4999,
    annualPrice: 49990,
    monthlyWallet: 4999,
    annualWallet: 5999,
    monthlyCVs: "~10,000",
    annualCVs: "~12,000",
    monthlyInterviews: "~200",
    annualInterviews: "~240",
    coreFeatures: [
      "Enterprise-grade ATS",
      "Multi-tenant architecture",
      "Custom AI workflows",
      "Dedicated success manager",
      "Private deployment options",
      "Advanced compliance & security",
      "Custom integrations & APIs",
    ],
    dashboardFeatures: [
      "Enterprise KPI builder",
      "Multi-tenant benchmarking",
      "Automated health alerts",
      "Cross-org reporting",
    ],
    support: "Enterprise SLA · 2h critical response · 24/7 dedicated success manager",
    popular: false,
    cta: "Talk to Sales",
  },
]

const FAQ_ITEMS = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes — upgrade or downgrade whenever you need. Changes apply immediately with prorated billing.",
  },
  {
    q: "How does the annual plan work?",
    a: "You pay for 10 months and stay active for 12 — saving roughly 17% on cost. Your monthly usage estimates and wallet credits also increase by 20%.",
  },
  {
    q: "What are the wallet credits?",
    a: "Every plan includes AI usage wallet credits equal to your subscription cost. These cover CV parsing, video interviews, and question generation. If you exceed them, additional usage is billed automatically at standard rates.",
  },
  {
    q: "What do the usage estimates mean?",
    a: "The CV and interview numbers are indicative ranges based on typical usage at each tier. They are not hard caps — actual consumption depends on your interview duration and workflow. Overage draws from your wallet balance automatically.",
  },
  {
    q: "Do you offer custom pricing for very high volume?",
    a: "Absolutely. For teams needing more than Enterprise-scale volume or custom integrations, contact our sales team for a tailored proposal.",
  },
]

// Shortened support label map
function shortSupport(support: string): string {
  if (support.startsWith("Standard Support")) return "Standard Support · 72h"
  if (support.startsWith("Priority Support")) return "Priority Support · 48h"
  if (support.startsWith("Business Support")) return "Business Support · 24h"
  if (support.startsWith("Large Support")) return "Large Support · 12h"
  if (support.startsWith("Ultra Support")) return "Ultra Support · 6h"
  if (support.startsWith("Enterprise SLA")) return "Enterprise SLA · 2h critical"
  return support
}

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<BillingCycle>('annual')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null)
  const [hasActivePlan, setHasActivePlan] = useState(false)

  // Read company_id from URL — present when opened from app settings page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid = params.get('company_id')
    setCompanyId(cid)
  }, [])

  // When opened from app, fetch the active subscription so we can highlight
  // the user's current plan with a "Current Plan" badge.
  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      try {
        const res = await fetch('/api/subscriptions/stripe/status', { credentials: 'include' })
        const data = await res.json()
        if (data?.ok && data.hasSubscription && data.isActive) {
          const name: string = data.subscription?.planName || ''
          setCurrentPlanName(name)
          setHasActivePlan(true)
          // Auto-switch billing toggle to match the user's plan cadence
          const lower = name.toLowerCase()
          if (lower.includes('annual') || lower.includes('yearly') || lower.includes('year')) {
            setBilling('annual')
          } else if (lower.includes('month')) {
            setBilling('monthly')
          }
        }
      } catch (e) {
        console.error('[Pricing] Failed to load current subscription:', e)
      }
    })()
  }, [companyId])

  // Match a pricing card to the user's current Stripe plan_name.
  // Stripe products are named like "Starter Monthly", "Professional Annual", etc.
  const isCurrentPlan = (planName: string): boolean => {
    if (!currentPlanName) return false
    const cur = currentPlanName.toLowerCase()
    if (!cur.includes(planName.toLowerCase())) return false
    const isAnnualPlan = cur.includes('annual') || cur.includes('yearly') || cur.includes('year')
    return isAnnualPlan ? billing === 'annual' : billing === 'monthly'
  }

  useEffect(() => {
    const scrollTo = new URLSearchParams(window.location.search).get('scroll')
    if (!scrollTo) return
    const t = setTimeout(() => {
      document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' })
      window.history.replaceState({}, '', '/pricing')
    }, 300)
    return () => clearTimeout(t)
  }, [])

  const handleSelect = async (planName: string) => {
    if (planName === 'Enterprise') {
      window.location.href = companyId ? getAppUrl('/contact') : '/contact'
      return
    }

    // App context — user is logged in, call Stripe checkout directly
    if (companyId) {
      if (planName === 'Free Trial') return
      setCheckoutLoading(planName)
      setCheckoutError(null)
      try {
        const res = await fetch('/api/subscriptions/stripe/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planName, billing }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
        const url = data.subscription?.checkoutUrl || data.checkoutUrl
        if (url) {
          window.location.href = url
        } else {
          throw new Error('No checkout URL returned')
        }
      } catch (err: any) {
        setCheckoutError(err.message || 'Failed to start checkout')
        setCheckoutLoading(null)
      }
      return
    }

    // www context — not logged in, go to signup
    if (planName === 'Free Trial') {
      router.push(getAppUrl('/signup'))
      return
    }
    const params = new URLSearchParams({ plan: planName, billing })
    router.push(getAppUrl(`/signup?${params.toString()}`))
  }

  const isAnnual = billing === 'annual'

  const isAppContext = !!companyId

  return (
    <div className="min-h-screen bg-white">
      {!isAppContext && <Navbar />}

      {/* App-context navbar — logo left, profile dropdown right */}
      {isAppContext && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between">
            {/* Logo */}
            <h1 className="text-2xl font-bold">
              <span className="text-slate-800">Hire</span>
              <span className="sr-text-gradient">GenAI</span>
            </h1>

            {/* Profile button — go to settings */}
            <a
              href={getAppUrl('/settings?tab=payment')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </a>
          </div>
        </header>
      )}

      {checkoutError && (
        <div className="max-w-xl mx-auto mt-4 px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <span className="font-semibold">Error:</span> {checkoutError}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <section className="sr-hero-bg py-16 text-center px-4">
        <span className="inline-block text-xs font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-5 py-1.5 rounded-full mb-6">
          ⚡ AI Recruiting OS · Full ATS + AI Interview
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 leading-tight tracking-tight mb-4">
          Simple, transparent pricing.<br />
          <span className="sr-text-gradient">Pay for what you use.</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-5">
          All paid plans include <strong className="text-slate-700">every ATS feature</strong> — Dashboard, Job Listings,
          Talent Pool, Application List, Delegation, Feedback, and full analytics.<br />
          <span className="text-slate-600">No hidden user limits. Only support level &amp; usage caps change.</span>
        </p>
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm text-slate-600 text-sm font-semibold px-5 py-2 rounded-full">
          🧑‍🤝‍🧑 Unlimited team members on every paid plan — invite your whole recruiting team.
        </div>
      </section>

      {/* ── Billing toggle ── */}
      <div className="flex justify-center pt-10 pb-3">
        <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              billing === 'monthly'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              billing === 'annual'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Annual
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {isAnnual && (
        <p className="text-center text-sm font-medium text-emerald-700 pb-2 px-4">
          📅 Annual: pay for 10 months · stay active for 12 · wallet credits &amp; usage increase by 20%
        </p>
      )}

      {/* ── 6 Pricing cards ── */}
      <section className="px-4 py-10 max-w-[1380px] mx-auto">
        {/* All-plans feature banner */}
        <p className="text-center text-sm text-slate-400 mb-6">
          ✓ All plans include full ATS · Unlimited team members · Same features — only usage volume and support tier differ
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price      = isAnnual ? plan.annualPrice    : plan.monthlyPrice
            const cvs        = isAnnual ? plan.annualCVs      : plan.monthlyCVs
            const ints       = isAnnual ? plan.annualInterviews : plan.monthlyInterviews
            const isEnterprise = plan.name === 'Enterprise'
            const isCurrent  = isCurrentPlan(plan.name)

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
                  isCurrent
                    ? 'bg-white ring-2 ring-emerald-600 shadow-xl sm:scale-[1.02]'
                    : plan.popular
                    ? 'bg-white ring-2 ring-emerald-500 shadow-xl sm:scale-[1.02]'
                    : 'bg-white border border-gray-200 shadow-md hover:bg-emerald-50/25 hover:border-emerald-200 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Current Plan badge — pinned top-right when this is the user's active plan */}
                {isCurrent && (
                  <div className="absolute top-3 right-3 z-10 bg-emerald-600 text-white text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Current Plan
                  </div>
                )}

                {/* Top label strip (only when present) */}
                {plan.topLabel && (
                  <div className={`text-center text-xs font-extrabold py-1.5 tracking-wide ${
                    plan.popular ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                  }`}>
                    {plan.popular && '⭐ '}{plan.topLabel}
                  </div>
                )}

                <div className="p-5 flex flex-col gap-4">

                  {/* ── Row 1: plan name + tagline ── */}
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 leading-tight">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{plan.tagline}</p>
                  </div>

                  {/* ── Row 2: price + wallet value ── */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">
                        ${(price as number).toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-sm ml-1">
                        {isAnnual ? '/ year' : '/ month'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <span className="text-base">💳</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-800 leading-tight">
                          ${(isAnnual ? plan.annualWallet : plan.monthlyWallet)?.toLocaleString()} AI credits included
                        </p>
                        <p className="text-[10px] text-emerald-600 leading-tight">
                          {isAnnual ? '+20% extra credits vs monthly billing' : 'Full amount loaded into your AI wallet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Row 3: usage capacity ── */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Typical monthly AI usage</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-xl font-extrabold text-slate-900">{cvs}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">candidates screened</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-xl font-extrabold text-slate-900">{ints}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">AI video rounds</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                      {isEnterprise
                        ? '📞 Talk to sales — no preset limits. Volume scales to your needs.'
                        : '📌 Illustrative averages — soft guidance only. No hard stop at these numbers.'}
                    </p>
                  </div>

                  {/* ── Row 4: what you actually get ── */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {[
                      { icon: "⚡", label: "AI CV Reports", desc: "Every resume scored, ranked & explained instantly" },
                      { icon: "🎥", label: "AI Video Interviews + Reports", desc: "Automated rounds — questions, recording & post-interview AI summary" },
                      { icon: "❓", label: "Auto Interview Questions", desc: "Role-specific questions generated before every round" },
                      { icon: "📋", label: "Unlimited Job Postings", desc: "No cap on active roles — post as many as you need" },
                      { icon: "🤝", label: "Client & Agent Connect", desc: "Share pipelines, roles & updates with external clients or partners" },
                      { icon: "🔄", label: "Delegation, Feedback & Audit", desc: "Assign to team, collect feedback, full audit trail" },
                      { icon: "📊", label: "Recruiter · Manager · Director", desc: "Dedicated KPI dashboards for every role in your team" },
                    ].map(({ icon, label, desc }) => (
                      <div key={label} className="flex items-start gap-2.5 px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors">
                        <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{label}</p>
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Row 5: support chip ── */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      🎧 {shortSupport(plan.support)}
                    </span>
                  </div>

                  {/* ── Row 5: CTA ── */}
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleSelect(plan.name)}
                      disabled={checkoutLoading === plan.name || isCurrent}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        isCurrent
                          ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-600'
                          : plan.popular
                          ? 'sr-button-primary'
                          : 'bg-slate-800 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {checkoutLoading === plan.name ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Processing...
                        </>
                      ) : isCurrent ? (
                        <><Check className="w-4 h-4" /> Your Current Plan</>
                      ) : hasActivePlan && isAppContext ? (
                        <>Switch to {plan.name} <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        <>{plan.cta} <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                    <p className="text-center text-xs text-slate-400">
                      {isEnterprise
                        ? 'Unlimited team members · Enterprise onboarding'
                        : 'Unlimited team members · Cancel anytime'}
                    </p>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      </section>

      {!isAppContext && (
        <>
          {/* ── Skip for Free link ── */}
          <div className="flex flex-col items-center gap-1 pb-10 pt-2">
            <button
              onClick={() => handleSelect('Free Trial')}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-600 text-sm font-medium transition-colors group"
            >
              Not ready to commit?
              <span className="underline underline-offset-2 font-semibold text-emerald-600 group-hover:no-underline">
                Skip for Free — start your 7-day trial
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <span className="text-xs text-slate-300">No credit card required · cancel anytime</span>
          </div>


          {/* ── FAQ ── */}
          <section className="py-16 bg-slate-50 px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-2">
                Common Questions
              </h2>
              <p className="text-slate-400 text-sm text-center mb-10">
                Straight answers on how pricing and plans work
              </p>
              <div className="space-y-4">
                {FAQ_ITEMS.map(({ q, a }) => (
                  <div key={q} className="sr-card p-5">
                    <h3 className="font-semibold text-slate-800 mb-1.5">{q}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <Footer />
        </>
      )}
    </div>
  )
}

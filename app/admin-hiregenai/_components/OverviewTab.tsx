"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, Briefcase, DollarSign, Building2,
  Cpu, FileText, Video, ArrowRight, Download, AlertCircle, CheckCircle2,
  Headphones, Activity, BarChart3,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { StatCardGridLoader, Skeleton } from "@/components/ui/skeleton-loader"

// ─── Types ───────────────────────────────────────────────────────────────────
interface KPIs {
  totalRevenue: number; monthRevenue: number; revenueChange: number
  totalExpenses: number; netProfit: number; profitMarginPercent: number
}
interface PlatformStats {
  companies: number; users: number; openJobs: number
  completedInterviews: number; newCompanies: number
}
interface UsageBreakdown {
  cvParses: { count: number; cost: number }
  questions: { count: number; cost: number }
  videoInterviews: { count: number; cost: number; minutes: number }
}
interface TrendItem { date: string; revenue: number; expenses: number; profit: number }
interface Alert { id: string; alertType: string; severity: string; title: string; description: string; createdAt: string }
interface TopCompany { name: string; spend: number }
interface Company {
  id: string; name: string; billingStatus: string; subscriptionStatus: string | null
  planName: string | null; trialDaysLeft: number; walletBalance: number; createdAt: string
}

function getPlanTier(company: Company): string {
  const name = (company.planName || "").toLowerCase()
  if (name.includes("enterprise")) return "Enterprise"
  if (name.includes("ultra")) return "Ultra"
  if (name.includes("large")) return "Large"
  if (name.includes("business")) return "Business"
  if (name.includes("professional") || name.includes("pro")) return "Professional"
  if (name.includes("starter")) return "Starter"
  return "Trial"
}
interface TicketItem {
  priority: string; status: string; last_message_from: string | null; last_message_at: string | null; created_at: string
}

interface OverviewTabProps { onReady: (fetchFn: (s: string, e: string) => void) => void }

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAN_TIERS = ["Enterprise", "Ultra", "Large", "Business", "Professional", "Starter", "Trial"]
const PLAN_COLORS: Record<string, string> = {
  Enterprise: "#7c3aed", Ultra: "#2563eb", Large: "#0891b2",
  Business: "#059669", Professional: "#d97706", Starter: "#ea580c", Trial: "#64748b",
}
const SLA_HOURS: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 48 }

function getSla(t: TicketItem): "Met" | "Breached" | "Pending" {
  if (t.last_message_from === "support_agent") return "Met"
  const h = SLA_HOURS[t.priority] ?? 24
  const lastAt = t.last_message_at || t.created_at
  return (Date.now() - new Date(lastAt).getTime()) / 3600000 > h ? "Breached" : "Pending"
}

function NavCard({ icon: Icon, label, value, sub, color, to }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; to: string
}) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/admin-hiregenai/${to}`)}
      className="w-full text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-600 hover:bg-slate-800/60 transition-all group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <ArrowRight className="h-3 w-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
      </div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OverviewTab({ onReady }: OverviewTabProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [kpis, setKpis] = useState<KPIs>({ totalRevenue: 0, monthRevenue: 0, revenueChange: 0, totalExpenses: 0, netProfit: 0, profitMarginPercent: 20 })
  const [platformStats, setPlatformStats] = useState<PlatformStats>({ companies: 0, users: 0, openJobs: 0, completedInterviews: 0, newCompanies: 0 })
  const [usageBreakdown, setUsageBreakdown] = useState<UsageBreakdown>({ cvParses: { count: 0, cost: 0 }, questions: { count: 0, cost: 0 }, videoInterviews: { count: 0, cost: 0, minutes: 0 } })
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([])
  const [trend, setTrend] = useState<TrendItem[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  const fetchData = useCallback(async (startDateStr: string, endDateStr: string) => {
    setLoading(true)
    try {
      const [statsRes, ticketsRes, companiesRes] = await Promise.all([
        fetch(`/api/admin/platform-stats?startDate=${startDateStr}&endDate=${endDateStr}`),
        fetch("/api/admin/tickets"),
        fetch("/api/admin/companies-list"),
      ])
      const [statsData, ticketsData, companiesData] = await Promise.all([
        statsRes.json(), ticketsRes.json(), companiesRes.json(),
      ])
      if (statsData.ok) {
        setKpis(statsData.kpis)
        setPlatformStats(statsData.platformStats ?? { companies: 0, users: 0, openJobs: 0, completedInterviews: 0, newCompanies: 0 })
        setUsageBreakdown(statsData.usageBreakdown ?? { cvParses: { count: 0, cost: 0 }, questions: { count: 0, cost: 0 }, videoInterviews: { count: 0, cost: 0, minutes: 0 } })
        setTopCompanies(statsData.topCompanies ?? [])
        setTrend(statsData.trend ?? [])
        setAlerts(statsData.alerts ?? [])
      }
      if (ticketsData.success) setTickets(ticketsData.tickets ?? [])
      if (companiesData.ok) setCompanies(companiesData.companies ?? [])
    } catch (err) {
      console.error("Overview fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { onReady(fetchData) }, [fetchData, onReady])

  // Trigger immediate fetch with default 90-day window so data appears instantly
  useEffect(() => {
    const end = new Date().toISOString().split("T")[0]
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]
    fetchData(start, end)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed Values ────────────────────────────────────────────────────────
  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => ["open", "waiting", "in_progress"].includes(t.status)).length
  const breachedTickets = tickets.filter(t => ["open", "waiting", "in_progress"].includes(t.status) && getSla(t) === "Breached").length

  const planCounts = companies.reduce((acc, c) => {
    const t = getPlanTier(c); acc[t] = (acc[t] || 0) + 1; return acc
  }, {} as Record<string, number>)
  const planChartData = PLAN_TIERS.map(t => ({ name: t, value: planCounts[t] || 0 })).filter(p => p.value > 0)

  const atRisk = companies.filter(c =>
    (c.billingStatus === "trial" && c.trialDaysLeft === 0) ||
    c.subscriptionStatus === "halted" ||
    c.subscriptionStatus === "past_due"
  ).slice(0, 5)

  const activeCompanies = companies.filter(c => c.billingStatus === "active" || (c.subscriptionStatus && ["active", "authenticated"].includes(c.subscriptionStatus))).length

  const avgMonthlySpend = platformStats.companies > 0 ? kpis.monthRevenue / platformStats.companies : 0
  const ltv = avgMonthlySpend * 24
  const cac = 850
  const ltvCacRatio = ltv > 0 ? (ltv / cac).toFixed(1) : "—"

  const totalAI = usageBreakdown.cvParses.count + usageBreakdown.questions.count + usageBreakdown.videoInterviews.count
  const margin = kpis.totalRevenue > 0 ? ((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1) : "0"

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-5">
      <StatCardGridLoader count={5} theme="dark" />
      <StatCardGridLoader count={4} theme="dark" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[0, 1].map(i => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <Skeleton className="h-5 w-40 mb-4" theme="dark" />
            <div className="h-56 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => <div key={i} className="h-40 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── 1. Executive 4-card KPI Row (clickable nav) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <NavCard icon={Building2} label="Active Companies" value={activeCompanies} sub={`${platformStats.companies} total · +${platformStats.newCompanies} new`} color="text-cyan-400" to="companies" />
        <NavCard icon={Activity} label="LTV / CAC Ratio" value={`${ltvCacRatio}x`} sub={`LTV: $${ltv.toFixed(0)} · CAC: $${cac}`} color="text-violet-400" to="companies" />
        <NavCard icon={Cpu} label="AI Operations" value={totalAI.toLocaleString()} sub={`${usageBreakdown.videoInterviews.minutes.toFixed(0)} interview mins`} color="text-amber-400" to="jobs" />
        <div
          onClick={() => router.push("/admin-hiregenai/support-centre")}
          className={`bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all group ${breachedTickets > 0 ? "border-red-800 hover:border-red-600" : "border-slate-800 hover:border-slate-600"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <Headphones className={`h-4 w-4 ${breachedTickets > 0 ? "text-red-400" : "text-blue-400"}`} />
            <ArrowRight className="h-3 w-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
          </div>
          <div className={`text-2xl font-extrabold ${openTickets > 0 ? "text-amber-400" : "text-slate-200"}`}>{openTickets}</div>
          <div className="text-xs text-slate-400 mt-0.5">Open Tickets</div>
          {breachedTickets > 0 && <div className="text-[10px] text-red-400 mt-0.5">⚠ {breachedTickets} SLA breached</div>}
        </div>
      </div>

      {/* ── 2. Financial KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-200">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-100">${kpis.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-emerald-300 mt-1">All-time earnings</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-900 to-slate-900 border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">This Period</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-100">${kpis.monthRevenue.toFixed(2)}</div>
            <p className="text-xs text-blue-300 mt-1">
              <span className={kpis.revenueChange >= 0 ? "text-emerald-400" : "text-red-400"}>
                {kpis.revenueChange >= 0 ? "↑" : "↓"} {Math.abs(kpis.revenueChange).toFixed(1)}% vs prev period
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900 to-slate-900 border-orange-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-100">${kpis.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-orange-300 mt-1">AI & infrastructure costs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900 to-slate-900 border-purple-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Net Profit</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-100">${kpis.netProfit.toFixed(2)}</div>
            <p className="text-xs text-purple-300 mt-1">
              <span className="text-emerald-400">{margin}% margin</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Charts: Revenue Trend + Plan Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">📈 Revenue Trend</CardTitle>
            <CardDescription>Revenue vs Expenses over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} labelStyle={{ color: "#e2e8f0" }} formatter={(v: number) => `$${v.toFixed(4)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" dot={false} />
                  <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} name="Expenses" dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="#a78bfa" strokeWidth={2} name="Profit" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">No trend data for this period</div>
            )}
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Period spend: ${kpis.monthRevenue.toFixed(3)}</span>
              <span>Expenses: ${kpis.totalExpenses.toFixed(3)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">🥧 Companies by Plan</CardTitle>
            <CardDescription>Subscription tier distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {planChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={planChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {planChartData.map(entry => (
                        <Cell key={entry.name} fill={PLAN_COLORS[entry.name] ?? "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} labelStyle={{ color: "#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3 cursor-pointer"
                  onClick={() => router.push("/admin-hiregenai/companies")}
                >
                  {planChartData.map(p => (
                    <div key={p.name} className="text-center">
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: PLAN_COLORS[p.name] ?? "#64748b" }} />
                      <div className="text-[10px] text-slate-400 font-semibold">{p.name}</div>
                      <div className="text-sm font-bold text-slate-200">{p.value}</div>
                    </div>
                  ))}
                  <div className="col-span-full text-center text-xs text-emerald-500 mt-1">View all companies →</div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">No company data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Support Performance (clickable) ── */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-slate-600 transition-all group"
        onClick={() => router.push("/admin-hiregenai/support-centre")}
      >
        <div className="px-5 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-blue-400" />
            <h2 className="font-semibold text-slate-100 text-sm">Support Performance Analytics</h2>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:underline">
            Open Support Centre <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Tickets", value: totalTickets, color: "text-slate-200" },
              { label: "Open / Active", value: openTickets, color: "text-amber-400" },
              { label: "SLA Breached", value: breachedTickets, color: breachedTickets > 0 ? "text-red-400" : "text-slate-400" },
              { label: "Resolved", value: tickets.filter(t => ["resolved", "closed"].includes(t.status)).length, color: "text-emerald-400" },
              { label: "Feedback", value: tickets.filter(t => t.status === "open" && (t as any).type === "feedback").length, color: "text-violet-400" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. At-Risk Companies + LTV ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          className="bg-slate-900 border-slate-800 cursor-pointer hover:border-slate-600 transition-all"
          onClick={() => router.push("/admin-hiregenai/companies")}
        >
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" /> At-Risk Companies
              <ArrowRight className="h-3 w-3 text-slate-600 ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No at-risk companies</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRisk.map(c => (
                  <div key={c.id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-slate-200 font-medium text-sm">{c.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{c.plan_tier}</span>
                    </div>
                    <span className={`text-xs font-semibold ${c.subscriptionStatus === "halted" || c.subscriptionStatus === "past_due" ? "text-red-400" : "text-amber-400"}`}>
                      {c.subscriptionStatus === "halted" ? "⚠ Payment Halted"
                        : c.subscriptionStatus === "past_due" ? "⚠ Past Due"
                        : "⚠ Trial Expired"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-400" /> Customer Lifetime Value (LTV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { label: "Avg Spend / Company (period)", value: `$${avgMonthlySpend.toFixed(3)}` },
                { label: "Estimated Lifetime (24 mo)", value: "24 months" },
                { label: "LTV (Avg × Lifetime)", value: `$${ltv.toFixed(2)}` },
                { label: "Customer Acquisition Cost", value: `$${cac}` },
              ].map(row => (
                <div key={row.label} className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="font-bold text-slate-200">{row.value}</span>
                </div>
              ))}
              <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-800/40 rounded-xl">
                <p className="text-sm font-semibold text-emerald-300">
                  📊 LTV:CAC Ratio: {ltvCacRatio}x
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 6. AI Adoption & Usage Analytics ── */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-400" /> AI Adoption & Usage Analytics
          </CardTitle>
          <CardDescription>Feature consumption for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[
              { label: "Total AI Operations", value: totalAI.toLocaleString(), color: "text-violet-400" },
              { label: "Video Interview Minutes", value: usageBreakdown.videoInterviews.minutes.toFixed(0), color: "text-blue-400" },
              { label: "Total AI Spend", value: `$${(usageBreakdown.cvParses.cost + usageBreakdown.questions.cost + usageBreakdown.videoInterviews.cost).toFixed(3)}`, color: "text-emerald-400" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[
              { label: "CV Parsing", count: usageBreakdown.cvParses.count, cost: usageBreakdown.cvParses.cost, color: "bg-amber-500", textColor: "text-amber-400", icon: FileText },
              { label: "Question Generation", count: usageBreakdown.questions.count, cost: usageBreakdown.questions.cost, color: "bg-blue-500", textColor: "text-blue-400", icon: BarChart3 },
              { label: "AI Video Interviews", count: usageBreakdown.videoInterviews.count, cost: usageBreakdown.videoInterviews.cost, color: "bg-violet-500", textColor: "text-violet-400", icon: Video },
            ].map(f => {
              const Icon = f.icon
              const pct = totalAI > 0 ? (f.count / totalAI) * 100 : 0
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${f.textColor}`} />
                      <span className="text-sm text-slate-300">{f.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className={`font-bold text-sm ${f.textColor}`}>{f.count}</span>
                      <span className="text-slate-600 text-xs">${f.cost.toFixed(3)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full">
                    <div className={`h-2 ${f.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          {topCompanies.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Top Companies by Spend</p>
              <div className="space-y-2">
                {topCompanies.map((c, i) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400"><span className="text-slate-600 mr-2">{i + 1}</span>{c.name}</span>
                      <span className="text-emerald-400 font-bold">${c.spend.toFixed(3)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full">
                      <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${(c.spend / (topCompanies[0]?.spend || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 7. Generate Reports ── */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-400" /> Generate Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <a href="/api/admin/jobs?format=csv" className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              <Briefcase className="h-3.5 w-3.5" /> Company Usage CSV
            </a>
            <a href="/api/admin/companies-list" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              <Building2 className="h-3.5 w-3.5" /> Companies Data
            </a>
            <a href="/api/admin/tickets" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              <Headphones className="h-3.5 w-3.5" /> Support Tickets
            </a>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

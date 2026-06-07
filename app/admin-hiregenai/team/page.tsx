"use client"

import { useState, useEffect } from "react"
import { UserPlus, Trash2, Edit2, Check, Shield } from "lucide-react"

const ALL_TABS = [
  { id: "companies",            label: "Companies" },
  { id: "jobs",                 label: "Company Usage" },
  { id: "anomalies",            label: "Anomalies" },
  { id: "customer-interaction", label: "Customer Interaction" },
  { id: "support-centre",       label: "Support Centre" },
  { id: "product-feedback",     label: "Product Feedback" },
]

const SUPPORT_TIERS = ["Enterprise", "Ultra", "Large", "Business", "Professional", "Starter", "Trial"]

const NEEDS_TIERS = ["support-centre", "product-feedback"]

interface Member {
  id: string; email: string; name: string
  assigned_tabs: string[]; assigned_support_tiers: string[] | null
  invited_by: string; created_at: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [formEmail, setFormEmail] = useState("")
  const [formName, setFormName] = useState("")
  const [formTabs, setFormTabs] = useState<string[]>([])
  const [formTiers, setFormTiers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/team")
      const data = await res.json()
      if (data.ok) setMembers(data.members || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchMembers() }, [])

  const needsTierSelection = formTabs.some(t => NEEDS_TIERS.includes(t))

  const resetForm = () => {
    setFormEmail(""); setFormName(""); setFormTabs([]); setFormTiers([])
    setError(""); setSuccessMsg(""); setShowForm(false); setEditingEmail(null)
  }

  const toggleTab = (tabId: string) => {
    setFormTabs(prev => {
      const next = prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
      // Clear tiers if no tier-needing tabs remain
      if (!next.some(t => NEEDS_TIERS.includes(t))) setFormTiers([])
      return next
    })
  }

  const toggleTier = (tier: string) =>
    setFormTiers(prev => prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier])

  const handleSubmit = async () => {
    if (!formEmail.trim() || !formName.trim()) { setError("Email and name are required"); return }
    if (formTabs.length === 0) { setError("Assign at least one page"); return }
    if (needsTierSelection && formTiers.length === 0) { setError("Assign at least one support tier for Support Centre / Product Feedback"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/team", {
        method: editingEmail ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail.trim(), name: formName.trim(),
          assignedTabs: formTabs,
          assignedSupportTiers: needsTierSelection ? formTiers : [],
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || "Failed"); return }
      setSuccessMsg(editingEmail ? "Member updated." : "Member invited — login link sent to their email.")
      setTimeout(resetForm, 2000)
      fetchMembers()
    } finally { setSaving(false) }
  }

  const startEdit = (m: Member) => {
    setFormEmail(m.email); setFormName(m.name)
    setFormTabs(m.assigned_tabs); setFormTiers(m.assigned_support_tiers || [])
    setEditingEmail(m.email); setShowForm(true); setError(""); setSuccessMsg("")
  }

  const handleDelete = async (email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return
    await fetch("/api/admin/team", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
    fetchMembers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-slate-400 text-sm">
            Invite members and assign which admin pages and support tiers they can access.
            An invite email with the login link is sent automatically.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            <UserPlus className="h-4 w-4" /> Invite Member
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-slate-200 font-semibold text-sm">
            {editingEmail ? "Edit Member Access" : "Invite New Team Member"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Full Name</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Jane Doe"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Email</label>
              <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="jane@company.com"
                disabled={!!editingEmail}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-600 disabled:opacity-50" />
            </div>
          </div>

          {/* Tab assignment */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">
              Assign Page Access <span className="text-slate-600">— select which pages this member can see</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TABS.map(tab => {
                const selected = formTabs.includes(tab.id)
                return (
                  <button key={tab.id} onClick={() => toggleTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      selected ? "bg-emerald-900/60 border-emerald-500 text-emerald-200" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}>
                    {selected && <Check className="h-3 w-3" />} {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Support Tier sub-selection — only when support/feedback is selected */}
          {needsTierSelection && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
              <label className="text-xs text-slate-400 font-semibold block">
                Support Plan Tiers <span className="text-slate-600 font-normal">— which company plan tiers can this member handle in Support Centre / Product Feedback?</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_TIERS.map(tier => {
                  const selected = formTiers.includes(tier)
                  const tierColor: Record<string, string> = {
                    Enterprise: "border-violet-500 text-violet-300 bg-violet-900/40",
                    Ultra:      "border-blue-500 text-blue-300 bg-blue-900/40",
                    Large:      "border-cyan-500 text-cyan-300 bg-cyan-900/40",
                    Business:   "border-emerald-500 text-emerald-300 bg-emerald-900/40",
                    Professional:"border-amber-500 text-amber-300 bg-amber-900/40",
                    Starter:    "border-orange-500 text-orange-300 bg-orange-900/40",
                    Trial:      "border-slate-500 text-slate-300 bg-slate-700/40",
                  }
                  return (
                    <button key={tier} onClick={() => toggleTier(tier)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        selected ? tierColor[tier] : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
                      }`}>
                      {selected && <Check className="h-3 w-3" />} {tier}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-slate-600">Only selected tiers will be visible on their Support Centre / Product Feedback page.</p>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {successMsg && <p className="text-emerald-400 text-xs">{successMsg}</p>}

          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              {saving ? "Saving…" : editingEmail ? "Save Changes" : "Invite & Send Email"}
            </button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <Shield className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No team members yet</p>
            <p className="text-slate-600 text-xs mt-1">Invite someone to give them limited admin access</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Member", "Pages", "Support Tiers", "Invited By", "Added", ""].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-5">
                    <div className="text-slate-200 font-medium">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.email}</div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-1.5">
                      {(m.assigned_tabs || []).map(tabId => {
                        const tab = ALL_TABS.find(t => t.id === tabId)
                        return <span key={tabId} className="text-[10px] px-2 py-0.5 bg-emerald-900/40 text-emerald-300 border border-emerald-800 rounded-full font-semibold">{tab?.label ?? tabId}</span>
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    {m.assigned_support_tiers?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {m.assigned_support_tiers.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded font-semibold">{t}</span>
                        ))}
                      </div>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="py-3 px-5 text-xs text-slate-500">{m.invited_by || "—"}</td>
                  <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => startEdit(m)} className="text-slate-500 hover:text-blue-400 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(m.email)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p><span className="text-slate-400 font-semibold">How it works:</span> Members log in via <code className="bg-slate-800 px-1 rounded">/owner-login</code> using email OTP. An invite email with the login link is sent when you add them.</p>
        <p>After login they land on their first assigned page and can only navigate to their assigned pages.</p>
        <p>For Support Centre / Product Feedback, only their assigned plan tiers (e.g., Enterprise, Starter) are visible.</p>
      </div>
    </div>
  )
}

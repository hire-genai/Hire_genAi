"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, RefreshCw, Lightbulb } from "lucide-react"
import { useAdminUser } from "../_context/AdminUserContext"

interface FeedbackTicket {
  id: string
  ticket_number: string
  title: string
  category: string | null
  priority: string
  status: string
  type: string
  user_email: string
  user_name: string
  company_name: string
  message_count: number
  first_message: string
  last_message_from: string | null
  last_message_at: string | null
  last_message_preview: string | null
  plan_tier: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  sender_type: "customer" | "support" | "system"
  sender_name: string
  message: string
  screenshot_url: string | null
  created_at: string
}

interface TicketDetail extends FeedbackTicket {
  messages: Message[]
}

const PLAN_TIERS = ["Enterprise", "Ultra", "Large", "Business", "Professional", "Starter", "Trial"] as const
type PlanTier = typeof PLAN_TIERS[number]

const TIER_ACTIVE: Record<string, string> = {
  Enterprise: "bg-violet-900/60 border-violet-400 text-violet-200",
  Ultra:      "bg-blue-900/60 border-blue-400 text-blue-200",
  Large:      "bg-cyan-900/60 border-cyan-400 text-cyan-200",
  Business:   "bg-emerald-900/60 border-emerald-400 text-emerald-200",
  Professional:"bg-amber-900/60 border-amber-400 text-amber-200",
  Starter:    "bg-orange-900/60 border-orange-400 text-orange-200",
  Trial:      "bg-slate-800 border-slate-500 text-slate-200",
}

const TIER_COLORS: Record<string, string> = {
  Enterprise: "border-violet-500 text-violet-300",
  Ultra:      "border-blue-500 text-blue-300",
  Large:      "border-cyan-500 text-cyan-300",
  Business:   "border-emerald-500 text-emerald-300",
  Professional:"border-amber-500 text-amber-300",
  Starter:    "border-orange-500 text-orange-300",
  Trial:      "border-slate-500 text-slate-400",
}

const statusStyles: Record<string, string> = {
  open:        "bg-yellow-900/40 text-yellow-300",
  in_progress: "bg-blue-900/40 text-blue-300",
  waiting:     "bg-purple-900/40 text-purple-300",
  resolved:    "bg-emerald-900/40 text-emerald-300",
  closed:      "bg-slate-700 text-slate-300",
}

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-900/40 text-red-300 border border-red-800",
  high:   "bg-orange-900/40 text-orange-300 border border-orange-800",
  medium: "bg-amber-900/40 text-amber-300 border border-amber-800",
  low:    "bg-blue-900/40 text-blue-300 border border-blue-800",
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}
function timeAgo(dt: string) {
  const diff = Date.now() - new Date(dt).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function ProductFeedbackTab() {
  const { assignedSupportTiers } = useAdminUser()
  const visibleTiers = (assignedSupportTiers && assignedSupportTiers.length > 0
    ? PLAN_TIERS.filter(t => assignedSupportTiers.includes(t))
    : [...PLAN_TIERS]) as PlanTier[]

  const [tickets, setTickets] = useState<FeedbackTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<PlanTier>(visibleTiers[0] ?? "Enterprise")
  const [modalTicket, setModalTicket] = useState<TicketDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [replyMsg, setReplyMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const msgListRef = useRef<HTMLDivElement>(null)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tickets?type=feedback")
      const data = await res.json()
      if (data.success) setTickets(data.tickets)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [])

  useEffect(() => {
    if (modalTicket?.messages && msgListRef.current) {
      msgListRef.current.scrollTop = msgListRef.current.scrollHeight
    }
  }, [modalTicket?.messages?.length])

  const tierCount = (tier: string) => tickets.filter(t => t.plan_tier === tier).length
  const tierTickets = tickets.filter(t => t.plan_tier === selectedTier)

  // Summary counts for selected tier
  const openCount     = tierTickets.filter(t => t.status === "open" || t.status === "waiting").length
  const inReviewCount = tierTickets.filter(t => t.status === "in_progress").length
  const reviewedCount = tierTickets.filter(t => t.status === "resolved" || t.status === "closed").length

  const openModal = async (ticket: FeedbackTicket) => {
    setModalLoading(true)
    setModalTicket({ ...ticket, messages: [] })
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`)
      const data = await res.json()
      if (data.success) setModalTicket(data.ticket)
    } finally {
      setModalLoading(false)
    }
  }

  const sendReply = async () => {
    if (!modalTicket || (!replyMsg.trim() && !pendingFile) || sending) return
    setSending(true)
    try {
      let screenshotUrl: string | undefined
      if (pendingFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append("file", pendingFile)
        const upRes = await fetch("/api/admin/support/upload", { method: "POST", body: fd })
        const upData = await upRes.json()
        setUploading(false)
        if (upData.success) screenshotUrl = upData.url
        else { alert(upData.error || "Upload failed"); setSending(false); return }
      }
      const res = await fetch(`/api/admin/tickets/${modalTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMsg.trim() || null, screenshot: screenshotUrl }),
      })
      if (!res.ok) { const e = await res.json(); alert(e.error || "Failed to send"); return }
      setReplyMsg("")
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      const r = await fetch(`/api/admin/tickets/${modalTicket.id}`)
      const d = await r.json()
      if (d.success) setModalTicket(d.ticket)
      fetchTickets()
    } finally {
      setSending(false)
    }
  }

  const changeStatus = async (status: string) => {
    if (!modalTicket || changingStatus) return
    setChangingStatus(true)
    try {
      await fetch(`/api/admin/tickets/${modalTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const r = await fetch(`/api/admin/tickets/${modalTicket.id}`)
      const d = await r.json()
      if (d.success) setModalTicket(d.ticket)
      fetchTickets()
    } finally {
      setChangingStatus(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Plan Tier Tabs */}
      <div className="flex flex-wrap gap-2">
        {visibleTiers.map(tier => {
          const count = tierCount(tier)
          const isActive = selectedTier === tier
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                isActive ? TIER_ACTIVE[tier] : `border-slate-700 bg-slate-900 ${TIER_COLORS[tier]} hover:border-opacity-70`
              }`}
            >
              {tier}
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">New / Open</div>
          <div className={`text-2xl font-extrabold ${openCount > 0 ? "text-amber-400" : "text-slate-200"}`}>{openCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">awaiting response</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">In Review</div>
          <div className="text-2xl font-extrabold text-blue-400">{inReviewCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">being considered</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reviewed</div>
          <div className="text-2xl font-extrabold text-emerald-400">{reviewedCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">out of {tierTickets.length} total</div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading feedback...</div>
        ) : tierTickets.length === 0 ? (
          <div className="p-8 flex flex-col items-center gap-2 text-slate-500">
            <Lightbulb className="h-8 w-8 text-slate-700" />
            <p className="text-sm">No feedback from {selectedTier} companies</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 820 }}>
              <thead>
                <tr className="border-b border-slate-800">
                  {["ID", "Title", "Company / User", "Type", "Priority", "Last Activity", "Preview", "Status", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tierTickets.map(ticket => {
                  const preview = ticket.last_message_preview || ticket.first_message
                  const lastAt = ticket.last_message_at || ticket.updated_at
                  return (
                    <tr
                      key={ticket.id}
                      className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition-colors"
                      onClick={() => openModal(ticket)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                          {ticket.ticket_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium max-w-[160px]">
                        <div className="truncate">{ticket.title}</div>
                        {ticket.category && <div className="text-xs text-slate-500 truncate">{ticket.category}</div>}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-[130px]">
                        <div className="text-slate-300 truncate font-medium">{ticket.company_name}</div>
                        <div className="text-slate-500 truncate">{ticket.user_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 font-semibold">
                          {ticket.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityStyles[ticket.priority] || "bg-slate-700 text-slate-300"}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">{timeAgo(lastAt)}</td>
                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="text-xs text-slate-500 truncate">{preview?.substring(0, 70)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusStyles[ticket.status] || "bg-slate-700 text-slate-300"}`}>
                          {ticket.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full font-semibold">View</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- MODAL ---------- */}
      {modalTicket && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setModalTicket(null) }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[95%] max-w-3xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">

            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-slate-100 text-sm">
                  {modalTicket.ticket_number} — {modalTicket.title}
                </span>
              </div>
              <button onClick={() => setModalTicket(null)} className="text-slate-400 hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-slate-800/50 border-b border-slate-700 text-xs">
              <div>
                <div className="text-slate-500 mb-0.5">Company</div>
                <div className="text-slate-200 font-medium truncate">{modalTicket.company_name}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">User</div>
                <div className="text-slate-200 font-medium truncate">{modalTicket.user_name}</div>
                <div className="text-slate-500 text-[10px] truncate">{modalTicket.user_email}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Plan · Type</div>
                <div className="text-slate-200 font-medium">{modalTicket.plan_tier}</div>
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 font-semibold">{modalTicket.type}</span>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Status</div>
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${statusStyles[modalTicket.status] || ""}`}>
                  {modalTicket.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Category</div>
                <div className="text-slate-300">{modalTicket.category || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Submitted</div>
                <div className="text-slate-300">{fmtTime(modalTicket.created_at)}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={msgListRef}>
              {modalLoading ? (
                <div className="text-center text-slate-500 text-sm py-8">Loading...</div>
              ) : !modalTicket.messages?.length ? (
                <div className="text-center text-slate-500 text-sm py-8">No messages</div>
              ) : (
                modalTicket.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 border text-sm ${
                      msg.sender_type === "support"
                        ? "bg-amber-900/20 border-amber-800/40 ml-8"
                        : "bg-slate-800/60 border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5 text-xs text-slate-500">
                      <span className="font-semibold text-slate-300">
                        {msg.sender_type === "support" ? "🟡 Support" : `👤 ${msg.sender_name}`}
                      </span>
                      <span>{fmtTime(msg.created_at)}</span>
                    </div>
                    <p className="text-slate-200 whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-700 bg-slate-800/60 p-4 space-y-3">
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-slate-500">Mark as:</span>
                {[
                  { s: "open",        label: "Open",        cls: "bg-yellow-900/40 text-yellow-300 border-yellow-800" },
                  { s: "in_progress", label: "In Review",   cls: "bg-blue-900/40 text-blue-300 border-blue-800" },
                  { s: "resolved",    label: "Reviewed",    cls: "bg-emerald-900/40 text-emerald-300 border-emerald-800" },
                ].map(({ s, label, cls }) => (
                  <button
                    key={s}
                    disabled={changingStatus || modalTicket.status === s}
                    onClick={() => changeStatus(s)}
                    className={`text-xs px-3 py-1 rounded-full border font-semibold transition-opacity disabled:opacity-40 ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <textarea
                  value={replyMsg}
                  onChange={e => setReplyMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply() }}
                  placeholder="Respond to feedback… (Ctrl+Enter to send)"
                  rows={3}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-sm placeholder-slate-600 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-amber-600"
                />
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors whitespace-nowrap">
                    📎 Attach
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={e => setPendingFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <button
                    onClick={sendReply}
                    disabled={sending || uploading || (!replyMsg.trim() && !pendingFile)}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {(sending || uploading) ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading…" : "Send"}
                  </button>
                </div>
              </div>
              {pendingFile && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800 rounded-lg px-3 py-1.5">
                  <span>📎 {pendingFile.name}</span>
                  <span className="text-slate-600">({(pendingFile.size / 1024).toFixed(1)}KB)</span>
                  <button onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                    className="ml-auto text-slate-500 hover:text-red-400 transition-colors">✕</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

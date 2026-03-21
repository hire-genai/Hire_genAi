"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Mail, 
  Building2, 
  Clock, 
  User,
  Search,
  Plus,
  FileText,
  Send,
  Eye,
  X,
  Video,
  Link2,
  Unplug,
  Paperclip,
  AlertTriangle,
  ClipboardList,
  Phone,
  MessageSquare,
  RefreshCw,
  CalendarClock,
  Inbox,
  ExternalLink
} from "lucide-react"

interface ContactMessage {
  id: string
  full_name: string
  work_email: string
  company_name: string
  phone_number: string | null
  subject: string
  message: string
  status: string
  created_at: string
  updated_at: string
  admin_notes?: string
  interaction_summary?: string
  replied?: boolean
}

interface AssessmentAnswer {
  questionText: string
  answerValue: string
  answerIndex: number
}

interface Assessment {
  id: string
  contactName: string | null
  contactEmail: string | null
  contactCompany: string | null
  contactPhone: string | null
  answers: Record<string, AssessmentAnswer>
  status: string
  score: number | null
  createdAt: string
}

const contactStatusColors: Record<string, string> = {
  new_lead: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active_prospect: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive_prospect: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  converted_to_customer: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30"
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new_lead', label: 'New Lead' },
  { value: 'active_prospect', label: 'Active' },
  { value: 'inactive_prospect', label: 'Inactive' },
  { value: 'converted_to_customer', label: 'Converted' },
  { value: 'archived', label: 'Archived' }
]

export default function CustomerInteractionPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("contacts")
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)
  const [contactFilter, setContactFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [contactStats, setContactStats] = useState({ total: 0, new: 0, responded: 0 })
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  const [repliedContacts, setRepliedContacts] = useState<Set<string>>(new Set())
  const [interactionSummaries, setInteractionSummaries] = useState<Record<string, string[]>>({})
  const [newSummaryInput, setNewSummaryInput] = useState<Record<string, string>>({})
  const [savingSummary, setSavingSummary] = useState<string | null>(null)

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalLoading, setGcalLoading] = useState(true)
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false)

  
  // View Meeting Modal state
  const [viewMeetingModal, setViewMeetingModal] = useState<any | null>(null)

  // Email Reply Modal state
  const [emailReplyModal, setEmailReplyModal] = useState<any | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [emailSending, setEmailSending] = useState(false)

  // Assessment state
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [assessmentFilter, setAssessmentFilter] = useState("all")
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null)
  const [viewAnswersModal, setViewAnswersModal] = useState<Assessment | null>(null)

  useEffect(() => {
    loadData()
    // Handle OAuth callback params
    const urlParams = new URLSearchParams(window.location.search)
    const googleConnected = urlParams.get('google_connected')
    const googleError = urlParams.get('google_error')
    if (googleConnected === 'true') {
      setActiveTab('google-calendar')
      setGcalConnected(true)
      router.replace('/admin-hiregenai/customer-interaction')
    } else if (googleError) {
      setActiveTab('google-calendar')
      router.replace('/admin-hiregenai/customer-interaction')
    }
  }, [])

  const loadMeetings = async () => {
    try {
      const res = await fetch("/api/meeting-bookings?limit=100")
      const data = await res.json()
      if (data.success) {
        setMeetings(data.bookings || [])
      }
    } catch (error) {
      console.error("Failed to load meetings:", error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadContacts(), loadMeetings(), loadGoogleCalendarStatus(), loadAssessments()])
    setLoading(false)
  }

  const loadContacts = async () => {
    try {
      const res = await fetch("/api/contact?limit=100")
      const data = await res.json()
      if (data.success) {
        setContacts(data.data || [])
        const total = data.data?.length || 0
        const newCount = data.data?.filter((c: ContactMessage) => c.status === 'new_lead').length || 0
        const respondedCount = data.data?.filter((c: ContactMessage) => c.status === 'active_prospect').length || 0
        setContactStats({ total, new: newCount, responded: respondedCount })
        
        const repliedSet = new Set<string>()
        const summaries: Record<string, string[]> = {}
        data.data?.forEach((contact: ContactMessage) => {
          if (contact.replied) {
            repliedSet.add(contact.id)
          }
          if (contact.interaction_summary) {
            try {
              summaries[contact.id] = JSON.parse(contact.interaction_summary)
            } catch {
              summaries[contact.id] = []
            }
          }
        })
        setRepliedContacts(repliedSet)
        setInteractionSummaries(prev => ({ ...prev, ...summaries }))
      }
    } catch (error) {
      console.error("Failed to load contacts:", error)
    }
  }

  
  const loadGoogleCalendarStatus = async () => {
    setGcalLoading(true)
    try {
      const res = await fetch("/api/google/status")
      const data = await res.json()
      setGcalConnected(data.connected || false)
    } catch (error) {
      console.error("Failed to load Google Calendar status:", error)
      setGcalConnected(false)
    } finally {
      setGcalLoading(false)
    }
  }

  const handleGcalConnect = () => {
    window.location.href = "/api/google/auth"
  }

  const handleGcalDisconnect = async () => {
    setGcalDisconnecting(true)
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" })
      if (res.ok) {
        setGcalConnected(false)
      }
    } catch (error) {
      console.error("Failed to disconnect Google Calendar:", error)
    } finally {
      setGcalDisconnecting(false)
    }
  }

  
  const openEmailReplyModal = (meeting: any) => {
    setEmailReplyModal(meeting)
    setEmailSubject(`Re: Meeting Schedule - ${meeting.full_name}`)
    setEmailMessage("")
  }

  
  const updateMeetingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/meeting-bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        await loadMeetings()
      }
    } catch (error) {
      console.error("Failed to update meeting:", error)
    }
  }

  const handleSendEmail = async () => {
    if (!emailReplyModal || !emailMessage.trim()) return
    setEmailSending(true)
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: emailReplyModal.work_email,
          recipientName: emailReplyModal.full_name,
          subject: emailSubject,
          message: emailMessage,
          meetingId: emailReplyModal.id,
        })
      })
      if (res.ok) {
        setEmailReplyModal(null)
        setEmailSubject("")
        setEmailMessage("")
        alert("Email sent successfully!")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Failed to send email:", error)
      alert("Failed to send email. Please try again.")
    } finally {
      setEmailSending(false)
    }
  }

  const loadAssessments = async () => {
    try {
      const res = await fetch("/api/admin/assessments?limit=100")
      const data = await res.json()
      if (data.success) {
        setAssessments(data.assessments || [])
      }
    } catch (error) {
      console.error("Failed to load assessments:", error)
    }
  }

  const sendAssessmentReply = async (assessment: Assessment) => {
    if (!assessment.contactEmail || !replyMessages[`assessment_${assessment.id}`]?.trim()) return
    
    setSendingReply(`assessment_${assessment.id}`)
    try {
      const res = await fetch("/api/contact/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: assessment.id,
          recipientEmail: assessment.contactEmail,
          recipientName: assessment.contactName || "User",
          subject: "Your Assessment Submission",
          message: replyMessages[`assessment_${assessment.id}`]
        })
      })
      if (res.ok) {
        setReplyMessages(prev => ({ ...prev, [`assessment_${assessment.id}`]: "" }))
        alert("Reply sent successfully!")
      }
    } catch (error) {
      console.error("Failed to send reply:", error)
      alert("Failed to send reply")
    } finally {
      setSendingReply(null)
    }
  }

  const updateContactStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        loadContacts()
      }
    } catch (error) {
      console.error("Failed to update contact:", error)
    }
  }

  
  const sendReplyEmail = async (contact: ContactMessage) => {
    const replyMessage = replyMessages[contact.id]
    if (!replyMessage?.trim()) {
      alert("Please enter a reply message")
      return
    }

    setSendingReply(contact.id)
    try {
      const res = await fetch("/api/contact/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          recipientEmail: contact.work_email,
          recipientName: contact.full_name,
          subject: `Re: ${contact.subject}`,
          message: replyMessage
        })
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        alert("Reply sent successfully!")
        setRepliedContacts(prev => new Set([...prev, contact.id]))
        const timestamp = new Date().toLocaleString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        })
        const newSummary = `[${timestamp}] Email reply sent: "${replyMessage.substring(0, 100)}${replyMessage.length > 100 ? '...' : ''}"`
        const updatedSummaries = [...(interactionSummaries[contact.id] || []), newSummary]
        setInteractionSummaries(prev => ({
          ...prev,
          [contact.id]: updatedSummaries
        }))
        
        await fetch("/api/contact", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: contact.id,
            replied: true,
            interactionSummary: JSON.stringify(updatedSummaries)
          })
        })
        
        setReplyMessages(prev => ({ ...prev, [contact.id]: "" }))
        loadContacts()
      } else {
        alert(data.error || "Failed to send reply")
      }
    } catch (error) {
      console.error("Failed to send reply:", error)
      alert("Failed to send reply. Please try again.")
    } finally {
      setSendingReply(null)
    }
  }

  const addInteractionSummary = async (entityId: string) => {
    const summaryText = newSummaryInput[entityId]?.trim()
    if (!summaryText) return

    setSavingSummary(entityId)
    try {
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })
      
      const newNote = `[${timestamp}] ${summaryText}`
      const updatedSummaries = [...(interactionSummaries[entityId] || []), newNote]
      
      setInteractionSummaries(prev => ({
        ...prev,
        [entityId]: updatedSummaries
      }))
      
      setNewSummaryInput(prev => ({ ...prev, [entityId]: "" }))
      
      const isMeeting = entityId.startsWith('meeting_')
      const actualId = isMeeting ? entityId.replace('meeting_', '') : entityId
      const apiUrl = isMeeting ? '/api/meeting-bookings' : '/api/contact'
      
      await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actualId,
          interactionSummary: JSON.stringify(updatedSummaries)
        })
      })
      
    } catch (error) {
      console.error("Failed to add summary:", error)
    } finally {
      setSavingSummary(null)
    }
  }

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  
  const filteredContacts = contacts.filter(contact => {
    const matchesFilter = contactFilter === "all" || contact.status === contactFilter
    const matchesSearch = searchQuery === "" || 
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  
  const filteredAssessments = assessments.filter(assessment => {
    const matchesFilter = assessmentFilter === "all" || assessment.status === assessmentFilter
    const matchesSearch = searchQuery === "" || 
      (assessment.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (assessment.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (assessment.contactCompany?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    return matchesFilter && matchesSearch
  })

  // Close modals on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewMeetingModal(null)
        setEmailReplyModal(null)
        setViewAnswersModal(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Customer Interactions</h1>
        <p className="text-slate-400">Manage contact submissions and meeting requests</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-2 px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <TabsList className="bg-slate-800 border border-slate-700">
                <TabsTrigger 
                  value="contacts" 
                  className="text-slate-400 hover:text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Requests
                  {contactStats.new > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0">
                      {contactStats.new}
                    </Badge>
                  )}
                </TabsTrigger>
                                <TabsTrigger 
                  value="google-calendar"
                  className="text-slate-400 hover:text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Google Calendar
                  {!gcalConnected && !gcalLoading && (
                    <Badge className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0">
                      !
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="assessments"
                  className="text-slate-400 hover:text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Assessments
                </TabsTrigger>
              </TabsList>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white w-64"
                />
              </div>
            </div>

            {/* Contact Requests Tab */}
            <TabsContent value="contacts" className="mt-0">
              <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-700">
                {STATUS_TABS.map(tab => {
                  const count = tab.value === 'all' 
                    ? contacts.length 
                    : contacts.filter(c => c.status === tab.value).length
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setContactFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        contactFilter === tab.value
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          contactFilter === tab.value ? 'bg-white/20' : 'bg-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No contact requests found</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div 
                      key={contact.id}
                      className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden transition-all hover:border-slate-600"
                    >
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-slate-700 rounded-full">
                                <User className="h-4 w-4 text-slate-300" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{contact.full_name}</h4>
                                <p className="text-sm text-slate-400">{contact.work_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {contact.company_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDate(contact.created_at)}
                              </span>
                              {contact.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">{contact.phone_number}</span>
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-slate-300 font-medium truncate">{contact.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={contact.status} 
                                onValueChange={(value) => updateContactStatus(contact.id, value)}
                              >
                                <SelectTrigger className="p-0 border-0 bg-transparent h-auto min-h-0 w-auto">
                                  <Badge className={`${contactStatusColors[contact.status]} border cursor-pointer hover:bg-slate-700/30`}>
                                    {formatStatusLabel(contact.status)}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-emerald-600">
                                  <SelectItem value="new_lead">New Lead</SelectItem>
                                  <SelectItem value="active_prospect">Active Prospect</SelectItem>
                                  <SelectItem value="inactive_prospect">Inactive Prospect</SelectItem>
                                  <SelectItem value="converted_to_customer">Converted to Customer</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                                                      </div>
                        </div>
                      </div>

                      {expandedContact === contact.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Original Message
                              </h5>
                              <div className="bg-slate-900 rounded-lg p-3 text-slate-400 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-700/50">
                                {contact.message}
                              </div>
                            </div>

                            <div>
                              {!repliedContacts.has(contact.id) ? (
                                <>
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Send Reply
                                  </h5>
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="Type your reply message here..."
                                      value={replyMessages[contact.id] || ""}
                                      onChange={(e) => setReplyMessages(prev => ({ ...prev, [contact.id]: e.target.value }))}
                                      className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] resize-none"
                                    />
                                    <Button 
                                      size="sm" 
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => sendReplyEmail(contact)}
                                      disabled={sendingReply === contact.id || !replyMessages[contact.id]?.trim()}
                                    >
                                      {sendingReply === contact.id ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          Sending...
                                        </>
                                      ) : (
                                        <>
                                          <Send className="h-4 w-4 mr-2" />
                                          Reply via Email
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5" />
                                    Interaction Summary
                                  </h5>
                                  <div className="space-y-3">
                                    {interactionSummaries[contact.id]?.length > 0 && (
                                      <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 max-h-32 overflow-y-auto">
                                        {interactionSummaries[contact.id].map((summary, idx) => (
                                          <div 
                                            key={idx} 
                                            className={`p-2.5 text-sm ${idx !== 0 ? 'border-t border-slate-700/30' : ''}`}
                                          >
                                            <span className="text-slate-300">{summary}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <Textarea
                                        placeholder="Add notes about this interaction..."
                                        value={newSummaryInput[contact.id] || ""}
                                        onChange={(e) => setNewSummaryInput(prev => ({ ...prev, [contact.id]: e.target.value }))}
                                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none text-sm"
                                      />
                                      <Button 
                                        size="sm" 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => addInteractionSummary(contact.id)}
                                        disabled={savingSummary === contact.id || !newSummaryInput[contact.id]?.trim()}
                                      >
                                        {savingSummary === contact.id ? (
                                          <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Interaction Note
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            
            {/* Google Calendar Tab */}
            <TabsContent value="google-calendar" className="mt-0">
              <div className="space-y-6">

                {/* Connection status warning if disconnected */}
                {!gcalConnected && !gcalLoading && (
                  <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-300 text-sm">
                      Google Calendar disconnected. Reconnect to generate meeting links automatically when bookings are made.
                    </p>
                  </div>
                )}

                {/* Google Calendar Integration Card */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${gcalConnected ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                        <Video className={`h-7 w-7 ${gcalConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Google Calendar Integration</h3>
                        <p className="text-sm text-white mt-0.5">
                          Automatically create calendar events and generate Google Meet links when meetings are booked.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${gcalConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {gcalLoading ? (
                            <span className="text-sm text-slate-400">Checking status...</span>
                          ) : gcalConnected ? (
                            <span className="text-sm text-emerald-400">Connected</span>
                          ) : (
                            <span className="text-sm text-slate-400">Not Connected</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {gcalLoading ? (
                        <Button disabled className="bg-slate-700 text-slate-400">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </Button>
                      ) : gcalConnected ? (
                        <Button
                          onClick={handleGcalDisconnect}
                          disabled={gcalDisconnecting}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/40"
                        >
                          {gcalDisconnecting ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Disconnecting...</>
                          ) : (
                            <><Unplug className="h-4 w-4 mr-2" />Disconnect</>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleGcalConnect}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Connect Google Calendar
                        </Button>
                      )}
                    </div>
                  </div>

                                  </div>

                {/* Meetings Table */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <h3 className="text-base font-semibold text-white">All Meetings</h3>
                  </div>

                  {meetings.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p>No meetings booked yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 bg-slate-900/50">
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Name</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Email</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Meeting Date</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Meeting Time</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Meet Link</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">View</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meetings.map((meeting) => (
                            <tr key={meeting.id} className="border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 text-white font-medium">{meeting.full_name}</td>
                              <td className="px-4 py-3 text-slate-300">{meeting.work_email}</td>
                              <td className="px-4 py-3 text-slate-300">
                                {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : <span className="text-slate-500 italic">Not set</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {meeting.meeting_time ? (
                                  <span>{meeting.meeting_time}</span>
                                ) : (
                                  <span className="text-slate-500 italic">Not set</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {meeting.meeting_link ? (
                                  <a
                                    href={meeting.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <Video className="h-3.5 w-3.5" />
                                    <span>Join</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-500 text-xs italic">No link</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <Select 
                                    value={meeting.status} 
                                    onValueChange={(value) => updateMeetingStatus(meeting.id, value)}
                                  >
                                    <SelectTrigger className="p-0 border-0 bg-transparent h-auto min-h-0 w-auto">
                                      <Badge className={`${contactStatusColors[meeting.status] || 'bg-slate-700 text-slate-300'} border cursor-pointer hover:bg-slate-700/30`}>
                                        {formatStatusLabel(meeting.status)}
                                      </Badge>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                      <SelectItem value="new_lead">New Lead</SelectItem>
                                      <SelectItem value="active_prospect">Active Prospect</SelectItem>
                                      <SelectItem value="inactive_prospect">Inactive Prospect</SelectItem>
                                      <SelectItem value="converted_to_customer">Converted to Customer</SelectItem>
                                      <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white h-7 px-2"
                                  onClick={() => setViewMeetingModal(meeting)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Assessments Tab */}
            <TabsContent value="assessments" className="mt-0">
              <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-700">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'partial', label: 'Partial' }
                ].map(tab => {
                  const count = tab.value === 'all' 
                    ? assessments.length 
                    : assessments.filter(a => a.status === tab.value).length
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setAssessmentFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        assessmentFilter === tab.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          assessmentFilter === tab.value ? 'bg-white/20' : 'bg-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
                <div className="ml-auto flex items-center gap-4 text-sm text-slate-400">
                  <span>Total: <strong className="text-white">{assessments.length}</strong></span>
                  <span>Completed: <strong className="text-emerald-400">{assessments.filter(a => a.status === 'completed').length}</strong></span>
                </div>
              </div>

              <div className="space-y-3">
                {filteredAssessments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No assessment submissions found</p>
                  </div>
                ) : (
                  filteredAssessments.map(assessment => (
                    <div 
                      key={assessment.id}
                      className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
                    >
                      <div 
                        className="p-4 cursor-pointer hover:bg-slate-800/80 transition-colors"
                        onClick={() => setExpandedAssessment(expandedAssessment === assessment.id ? null : assessment.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <User className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">
                                {assessment.contactName || "Anonymous User"}
                              </h4>
                              <div className="flex items-center gap-3 text-sm text-slate-400">
                                {assessment.contactEmail && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    {assessment.contactEmail}
                                  </span>
                                )}
                                {assessment.contactCompany && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" />
                                    {assessment.contactCompany}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatDate(assessment.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {assessment.score !== null && (
                              <div className="text-right">
                                <span className="text-lg font-bold text-emerald-400">{Math.round(assessment.score)}</span>
                                <span className="text-xs text-slate-400 ml-1">pts</span>
                              </div>
                            )}
                            <Badge className={`${
                              assessment.status === 'completed' 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            } border`}>
                              {assessment.status === 'completed' ? 'Completed' : 'Partial'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                setViewAnswersModal(assessment)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Answers
                            </Button>
                                                      </div>
                        </div>
                      </div>

                      {expandedAssessment === assessment.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                  <User className="h-3.5 w-3.5" />
                                  Contact Details
                                </h5>
                                <div className="bg-slate-900 rounded-lg p-3 space-y-2 text-sm border border-slate-700/50">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Name:</span>
                                    <span className="text-white">{assessment.contactName || "Not provided"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Email:</span>
                                    <span className="text-white">{assessment.contactEmail || "Not provided"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Company:</span>
                                    <span className="text-white">{assessment.contactCompany || "Not provided"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Phone:</span>
                                    <span className="text-white">{assessment.contactPhone || "Not provided"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Submitted:</span>
                                    <span className="text-white">{formatDate(assessment.createdAt)}</span>
                                  </div>
                                </div>
                              </div>

                                                          </div>

                            {/* Reply via Email */}
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                <Send className="h-3.5 w-3.5" />
                                Reply via Email
                              </h5>
                              {assessment.contactEmail ? (
                                <div className="space-y-3">
                                  <Textarea
                                    placeholder="Type your reply message..."
                                    value={replyMessages[`assessment_${assessment.id}`] || ""}
                                    onChange={(e) => setReplyMessages(prev => ({ ...prev, [`assessment_${assessment.id}`]: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] resize-none text-sm"
                                  />
                                  <Button 
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => sendAssessmentReply(assessment)}
                                    disabled={sendingReply === `assessment_${assessment.id}` || !replyMessages[`assessment_${assessment.id}`]?.trim()}
                                  >
                                    {sendingReply === `assessment_${assessment.id}` ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Reply via Email
                                      </>
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700/50 text-center">
                                  <Mail className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                                  <p className="text-slate-400 text-sm">No email address provided</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Meeting Modal */}
      {viewMeetingModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setViewMeetingModal(null)}
        >
          <div
            className="bg-slate-900 rounded-xl border border-slate-700 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">Meeting Details</h3>
                <p className="text-sm text-slate-400">{viewMeetingModal.full_name} — {formatDate(viewMeetingModal.created_at)}</p>
              </div>
              <button onClick={() => setViewMeetingModal(null)} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Name', value: viewMeetingModal.full_name },
                  { label: 'Email', value: viewMeetingModal.work_email },
                  { label: 'Company', value: viewMeetingModal.company_name },
                  { label: 'Phone', value: viewMeetingModal.phone_number || '—' },
                  { label: 'Meeting Date', value: viewMeetingModal.meeting_date ? new Date(viewMeetingModal.meeting_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—' },
                  { label: 'Meeting Time', value: viewMeetingModal.meeting_time || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className="text-sm text-white font-medium break-all">{value}</p>
                  </div>
                ))}
              </div>

              {viewMeetingModal.meeting_link && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium">Google Meet Link</span>
                  </div>
                  <a
                    href={viewMeetingModal.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Open Meet <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {viewMeetingModal.notes && (
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Message / Notes</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{viewMeetingModal.notes}</p>
                </div>
              )}

              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between">
                <p className="text-xs text-slate-400">Status</p>
                <Badge className={`${contactStatusColors[viewMeetingModal.status] || 'bg-slate-700 text-slate-300'} border`}>
                  {formatStatusLabel(viewMeetingModal.status)}
                </Badge>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-between gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setViewMeetingModal(null)
                  openEmailReplyModal(viewMeetingModal)
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Reply via Email
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMeetingModal(null)}
                className="border-slate-600 text-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Reply Modal */}
      {emailReplyModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setEmailReplyModal(null)}
        >
          <div
            className="bg-slate-900 rounded-xl border border-slate-700 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">Reply via Email</h3>
                <p className="text-sm text-slate-400">To: {emailReplyModal.work_email}</p>
              </div>
              <button onClick={() => setEmailReplyModal(null)} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* To field (read-only) */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase mb-1 block">To</label>
                <Input
                  value={emailReplyModal.work_email}
                  readOnly
                  className="bg-slate-800 border-slate-700 text-slate-300 cursor-default"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase mb-1 block">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Email subject..."
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase mb-1 block">Message</label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[130px] resize-none"
                  placeholder="Type your message here..."
                />
              </div>

              {/* Attachments note */}
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Paperclip className="h-3.5 w-3.5" />
                <span>Attachments can be added by replying to the sent email directly.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-700 flex gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!emailMessage.trim() || emailSending}
                onClick={handleSendEmail}
              >
                {emailSending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Send</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEmailReplyModal(null)}
                className="border-slate-600 text-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Answers Modal */}
      {viewAnswersModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setViewAnswersModal(null)}
        >
          <div
            className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">Assessment Answers</h3>
                <p className="text-sm text-slate-400">
                  {viewAnswersModal.contactName || "Anonymous"} — {formatDate(viewAnswersModal.createdAt)}
                </p>
              </div>
              <button onClick={() => setViewAnswersModal(null)} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {viewAnswersModal.answers && typeof viewAnswersModal.answers === 'object' && Object.entries(viewAnswersModal.answers).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(viewAnswersModal.answers).map(([key, value], index) => {
                    const answer = typeof value === 'object' && value !== null ? value as AssessmentAnswer : { questionText: key, answerValue: String(value), answerIndex: 0 }
                    return (
                      <div key={key || index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-slate-400 text-sm mb-2">{answer.questionText || key}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-white font-medium mr-4">{answer.answerValue || String(value)}</p>
                              {answer.answerIndex !== undefined && (
                                <span className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-medium">
                                  Index: {answer.answerIndex}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No answers recorded</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-between items-center">
              <div className="text-sm text-slate-400">
                {viewAnswersModal.score !== null && (
                  <span>Score: <strong className="text-emerald-400">{Math.round(viewAnswersModal.score)} pts</strong></span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setViewAnswersModal(null)}
                className="border-slate-600 text-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Mail, 
  Calendar, 
  Building2, 
  Phone, 
  Clock, 
  User, 
  MessageSquare,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Inbox,
  CalendarClock,
  Plus,
  FileText,
  Send,
  ClipboardList,
  Eye,
  X
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

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

interface MeetingBooking {
  id: string
  full_name: string
  work_email: string
  company_name: string
  phone_number: string | null
  meeting_date: string | null
  meeting_time: string | null
  meeting_end_time: string | null
  duration_minutes: number
  timezone: string
  meeting_location: string
  meeting_link: string | null
  notes: string | null
  status: string
  created_at: string
  updated_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  admin_notes?: string
  interaction_summary?: string
}

interface Assessment {
  id: string
  contactName: string | null
  contactEmail: string | null
  contactCompany: string | null
  contactPhone: string | null
  answers: any // Parent project stores answers as direct object from frontend
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
  const [activeTab, setActiveTab] = useState("contacts")
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [meetings, setMeetings] = useState<MeetingBooking[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null)
  const [contactFilter, setContactFilter] = useState("all")
  const [meetingFilter, setMeetingFilter] = useState("all")
  const [assessmentFilter, setAssessmentFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [contactStats, setContactStats] = useState({ total: 0, new: 0, responded: 0 })
  const [meetingStats, setMeetingStats] = useState({ total: 0, scheduled: 0, completed: 0, confirmed: 0, cancelled: 0, no_show: 0, rescheduled: 0 })
  const [assessmentStats, setAssessmentStats] = useState({ total: 0, completed: 0, partial: 0, completedToday: 0 })
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  const [viewAnswersModal, setViewAnswersModal] = useState<Assessment | null>(null)
  const [repliedContacts, setRepliedContacts] = useState<Set<string>>(new Set())
  const [interactionSummaries, setInteractionSummaries] = useState<Record<string, string[]>>({})
  const [newSummaryInput, setNewSummaryInput] = useState<Record<string, string>>({})
  const [savingSummary, setSavingSummary] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadContacts(), loadMeetings(), loadAssessments()])
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

  const loadMeetings = async () => {
    try {
      const res = await fetch("/api/meeting-bookings?limit=100")
      const data = await res.json()
      if (data.success) {
        setMeetings(data.bookings || [])
        const stats = data.stats || {}
        setMeetingStats({ 
          total: stats.total || 0, 
          scheduled: stats.scheduled || 0, 
          completed: stats.completed || 0,
          confirmed: stats.confirmed || 0,
          cancelled: stats.cancelled || 0,
          no_show: stats.no_show || 0,
          rescheduled: stats.rescheduled || 0
        })
        
        const meetingSummaries: Record<string, string[]> = {}
        data.bookings?.forEach((meeting: MeetingBooking) => {
          if (meeting.interaction_summary) {
            try {
              meetingSummaries[`meeting_${meeting.id}`] = JSON.parse(meeting.interaction_summary)
            } catch {
              meetingSummaries[`meeting_${meeting.id}`] = []
            }
          }
        })
        setInteractionSummaries(prev => ({ ...prev, ...meetingSummaries }))
      }
    } catch (error) {
      console.error("Failed to load meetings:", error)
    }
  }

  const loadAssessments = async () => {
    try {
      const res = await fetch("/api/admin/assessments?limit=100")
      const data = await res.json()
      if (data.success) {
        setAssessments(data.assessments || [])
        setAssessmentStats(data.stats || { total: 0, completed: 0, partial: 0, completedToday: 0 })
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

  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return "Not scheduled"
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const filteredMeetings = meetings.filter(meeting => {
    const matchesFilter = meetingFilter === "all" || meeting.status === meetingFilter
    const matchesSearch = searchQuery === "" || 
      meeting.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.company_name.toLowerCase().includes(searchQuery.toLowerCase())
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
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
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
                  value="meetings"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Meeting Bookings
                  {(() => {
                    const pendingCount = meetingStats.scheduled + meetingStats.confirmed + meetingStats.rescheduled
                    return pendingCount > 0 && (
                      <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0">
                        {pendingCount}
                      </Badge>
                    )
                  })()}
                </TabsTrigger>
                <TabsTrigger 
                  value="assessments"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Assessment
                  {assessmentStats.completedToday > 0 && (
                    <Badge className="ml-2 bg-purple-500 text-white text-xs px-1.5 py-0">
                      {assessmentStats.completedToday}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white w-48"
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
                            {expandedContact === contact.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
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

            {/* Meeting Bookings Tab */}
            <TabsContent value="meetings" className="mt-0">
              <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-700">
                {STATUS_TABS.map(tab => {
                  const count = tab.value === 'all' 
                    ? meetings.length 
                    : meetings.filter(m => m.status === tab.value).length
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setMeetingFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        meetingFilter === tab.value
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          meetingFilter === tab.value ? 'bg-white/20' : 'bg-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3">
                {filteredMeetings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No meeting bookings found</p>
                  </div>
                ) : (
                  filteredMeetings.map((meeting) => (
                    <div 
                      key={meeting.id}
                      className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden transition-all hover:border-slate-600"
                    >
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedMeeting(expandedMeeting === meeting.id ? null : meeting.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-slate-700 rounded-full">
                                <User className="h-4 w-4 text-slate-300" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{meeting.full_name}</h4>
                                <p className="text-sm text-slate-400">{meeting.work_email}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {meeting.company_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatMeetingDate(meeting.meeting_date)}
                              </span>
                              {meeting.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">{meeting.phone_number}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {meeting.meeting_time}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={meeting.status} 
                                onValueChange={(value) => updateMeetingStatus(meeting.id, value)}
                              >
                                <SelectTrigger className="p-0 border-0 bg-transparent h-auto min-h-0 w-auto">
                                  <Badge className={`${contactStatusColors[meeting.status]} border cursor-pointer hover:bg-slate-700/30`}>
                                    {formatStatusLabel(meeting.status)}
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
                            {expandedMeeting === meeting.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedMeeting === meeting.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  Meeting Details
                                </h5>
                                <div className="bg-slate-900 rounded-lg p-3 space-y-2 text-sm border border-slate-700/50">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Duration:</span>
                                    <span className="text-white">{meeting.duration_minutes} minutes</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Timezone:</span>
                                    <span className="text-white">{meeting.timezone}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Location:</span>
                                    <span className="text-white capitalize">{meeting.meeting_location?.replace('-', ' ')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Submitted:</span>
                                    <span className="text-white">{formatDate(meeting.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                              {meeting.notes && (
                                <div>
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Notes from Customer
                                  </h5>
                                  <div className="bg-slate-900 rounded-lg p-3 text-slate-400 text-sm whitespace-pre-wrap max-h-16 overflow-hidden border border-slate-700/50">
                                    {meeting.notes}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                Interaction Summary
                              </h5>
                              <div className="space-y-3">
                                {interactionSummaries[`meeting_${meeting.id}`]?.length > 0 && (
                                  <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 max-h-32 overflow-y-auto">
                                    {interactionSummaries[`meeting_${meeting.id}`].map((summary, idx) => (
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
                                    value={newSummaryInput[`meeting_${meeting.id}`] || ""}
                                    onChange={(e) => setNewSummaryInput(prev => ({ ...prev, [`meeting_${meeting.id}`]: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none text-sm"
                                  />
                                  <Button 
                                    size="sm" 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => addInteractionSummary(`meeting_${meeting.id}`)}
                                    disabled={savingSummary === `meeting_${meeting.id}` || !newSummaryInput[`meeting_${meeting.id}`]?.trim()}
                                  >
                                    {savingSummary === `meeting_${meeting.id}` ? (
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
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Assessment Tab */}
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
                  <span>Total: <strong className="text-white">{assessmentStats.total}</strong></span>
                  <span>Completed: <strong className="text-emerald-400">{assessmentStats.completed}</strong></span>
                  <span>Today: <strong className="text-purple-400">{assessmentStats.completedToday}</strong></span>
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
                            {expandedAssessment === assessment.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
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

                              {/* Quick Answers Preview */}
                              <div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                  <ClipboardList className="h-3.5 w-3.5" />
                                  Answers Preview
                                </h5>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700/50 max-h-40 overflow-y-auto">
                                  {assessment.answers && typeof assessment.answers === 'object' ? (
                                    <>
                                      {Object.entries(assessment.answers).slice(0, 3).map(([key, value], index) => {
                                        const answer = typeof value === 'object' && value !== null ? value : { questionText: key, answerValue: value, answerIndex: 0 }
                                        return (
                                          <div key={key || index} className="mb-3 last:mb-0 p-2 bg-slate-800/50 rounded border border-slate-700/30">
                                            <p className="text-xs text-slate-400 mb-1 truncate">{answer.questionText || key}</p>
                                            <div className="flex items-center justify-between">
                                              <p className="text-sm text-white truncate mr-2">{answer.answerValue || value}</p>
                                              {answer.answerIndex !== undefined && (
                                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                                                  Index: {answer.answerIndex}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                      {Object.keys(assessment.answers).length > 3 && (
                                        <p className="text-xs text-purple-400 mt-2 text-center">
                                          +{Object.keys(assessment.answers).length - 3} more answers
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-slate-400 text-center py-4">No answers available</p>
                                  )}
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

      {/* View Answers Modal */}
      {viewAnswersModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">Assessment Answers</h3>
                <p className="text-sm text-slate-400">
                  {viewAnswersModal.contactName || "Anonymous"} - {formatDate(viewAnswersModal.createdAt)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewAnswersModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {viewAnswersModal.answers && typeof viewAnswersModal.answers === 'object' && Object.entries(viewAnswersModal.answers).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(viewAnswersModal.answers).map(([key, value], index) => {
                    const answer = typeof value === 'object' && value !== null ? value : { questionText: key, answerValue: value, answerIndex: 0 }
                    return (
                      <div key={key || index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-slate-400 text-sm mb-2">{answer.questionText || key}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-white font-medium mr-4">{answer.answerValue || value}</p>
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
            <div className="p-4 border-t border-slate-700 flex justify-between items-center">
              <div className="text-sm text-slate-400">
                {viewAnswersModal.score !== null && (
                  <span>Score: <strong className="text-emerald-400">{Math.round(viewAnswersModal.score)} pts</strong></span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setViewAnswersModal(null)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
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

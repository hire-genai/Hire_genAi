'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HeadphonesIcon,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  ImageIcon,
  X,
  CheckCircle,
  Clock,
  Upload,
  Eye,
  Calendar,
} from 'lucide-react'

type TicketType = 'bug' | 'feature_request' | 'question' | 'feedback'
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
type TicketCategory = 'dashboard' | 'applications' | 'job_postings' | 'talent_pool' | 'candidates' | 'ai_screening' | 'messages' | 'documents' | 'delegation' | 'analytics' | 'settings' | 'other'

interface TicketComment {
  id: string
  author: string
  role: 'support' | 'recruiter'
  message: string
  image?: string
  timestamp: string
}

interface Ticket {
  id: string
  type: TicketType
  category: TicketCategory
  title: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  createdBy: string
  createdAt: string
  screenshot?: string
  response?: string
  comments?: TicketComment[]
}

interface TicketStats {
  open: number
  in_progress: number
  resolved: number
  total: number
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'feedback'>('tickets')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all')
  const [newComment, setNewComment] = useState('')
  const [commentImage, setCommentImage] = useState<File | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats>({ open: 0, in_progress: 0, resolved: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    type: 'bug' as TicketType,
    category: 'other' as TicketCategory,
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    screenshot: null as File | null,
  })

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get companyId from localStorage
      let companyId = null
      try {
        const storedSession = localStorage.getItem('mockAuth')
        if (storedSession) {
          const session = JSON.parse(storedSession)
          companyId = session.company?.id
        }
      } catch (e) {
        console.log('Could not parse session from localStorage')
      }
      
      const params = new URLSearchParams()
      if (companyId) params.append('companyId', companyId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      
      const response = await fetch(`/api/support/tickets?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setTickets(data.data || [])
        setStats(data.stats || { open: 0, in_progress: 0, resolved: 0, total: 0 })
      } else {
        console.error('Failed to fetch tickets:', data.error)
        setTickets([])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      // Get companyId from localStorage
      let companyId = null
      try {
        const storedSession = localStorage.getItem('mockAuth')
        if (storedSession) {
          const session = JSON.parse(storedSession)
          companyId = session.company?.id
        }
      } catch (e) {
        console.log('Could not parse session from localStorage')
      }
      
      const params = new URLSearchParams()
      if (companyId) params.append('companyId', companyId)
      
      const response = await fetch(`/api/support/tickets/${ticketId}?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setSelectedTicket(data.data)
      } else {
        console.error('Failed to fetch ticket details:', data.error)
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error)
    }
  }

  const handleCreateTicket = async () => {
    if (!formData.category) {
      alert('Please select a category')
      return
    }
    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }
    if (!formData.description.trim()) {
      alert('Please enter a description')
      return
    }

    try {
      setSubmitting(true)
      
      // Get user/company from localStorage (fallback for mock auth)
      let userId = null
      let companyId = null
      let userName = 'User'
      try {
        const storedSession = localStorage.getItem('mockAuth')
        if (storedSession) {
          const session = JSON.parse(storedSession)
          userId = session.user?.id
          companyId = session.company?.id
          
          // Get user name from session (mock-auth stores it as 'name')
          userName = session.user?.name || session.user?.email || 'User'
        }
      } catch (e) {
        console.error('Could not parse session from localStorage', e)
      }

      // Upload screenshot if provided
      let screenshotUrl = null
      if (formData.screenshot) {
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('screenshot', formData.screenshot)
          
          const uploadResponse = await fetch('/api/support/upload-screenshot', {
            method: 'POST',
            body: uploadFormData,
          })
          
          const uploadData = await uploadResponse.json()
          
          if (uploadData.success) {
            screenshotUrl = uploadData.url
            console.log('Screenshot uploaded:', screenshotUrl)
          } else {
            console.error('Screenshot upload failed:', uploadData.error)
            alert('Failed to upload screenshot. Creating ticket without screenshot.')
          }
        } catch (uploadError) {
          console.error('Error uploading screenshot:', uploadError)
          alert('Failed to upload screenshot. Creating ticket without screenshot.')
        }
      }
      
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          category: formData.category,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          screenshot: screenshotUrl,
          userId,
          companyId,
          userName,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Support ticket submitted successfully! Our team will get back to you soon.')
        setShowCreateDialog(false)
        setFormData({
          type: 'bug',
          category: 'other',
          title: '',
          description: '',
          priority: 'medium',
          screenshot: null,
        })
        fetchTickets()
      } else {
        alert(data.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() && !commentImage) {
      alert('Please enter a comment or attach an image')
      return
    }
    if (!selectedTicket) return

    try {
      setSubmitting(true)
      
      // Get user/company from localStorage (fallback for mock auth)
      let userId = null
      let companyId = null
      try {
        const storedSession = localStorage.getItem('mockAuth')
        if (storedSession) {
          const session = JSON.parse(storedSession)
          userId = session.user?.id
          companyId = session.company?.id
        }
      } catch (e) {
        console.log('Could not parse session from localStorage')
      }

      // Upload image if provided
      let imageUrl = null
      if (commentImage) {
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('screenshot', commentImage)
          
          const uploadResponse = await fetch('/api/support/upload-screenshot', {
            method: 'POST',
            body: uploadFormData,
          })
          
          const uploadData = await uploadResponse.json()
          
          if (uploadData.success) {
            imageUrl = uploadData.url
          } else {
            console.error('Image upload failed:', uploadData.error)
            alert('Failed to upload image. Sending comment without image.')
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          alert('Failed to upload image. Sending comment without image.')
        }
      }
      
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: newComment.trim() || (imageUrl ? '' : 'Message'),
          imageUrl,
          userId,
          companyId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewComment('')
        setCommentImage(null)
        await fetchTicketDetails(selectedTicket.id)
      } else {
        alert(data.error || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setFormData({ ...formData, screenshot: file })
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Support Tickets tab: show all tickets EXCEPT feedback type
    // Product Feedback tab: show ONLY feedback type
    const matchesTab =
      activeTab === 'tickets' 
        ? ticket.type !== 'feedback'  // Support tickets = everything except feedback
        : ticket.type === 'feedback'  // Feedback tab = only feedback
    
    return matchesSearch && matchesTab
  })

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'bug':
        return <AlertCircle className="h-4 w-4" />
      case 'feature_request':
        return <Lightbulb className="h-4 w-4" />
      case 'question':
        return <MessageSquare className="h-4 w-4" />
      case 'feedback':
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: TicketType) => {
    switch (type) {
      case 'bug':
        return 'Bug Report'
      case 'feature_request':
        return 'Feature Request'
      case 'question':
        return 'Question'
      case 'feedback':
        return 'Feedback'
    }
  }

  const getStatusBadge = (status: TicketStatus) => {
    const variants: Record<TicketStatus, string> = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    }
    return (
      <Badge className={variants[status]} variant="secondary">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: TicketPriority) => {
    const variants: Record<TicketPriority, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={variants[priority]} variant="secondary">
        {priority}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support & Feedback</h1>
          <p className="text-sm text-gray-600">Get help and share your ideas with us</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold">{stats.open}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold">{stats.in_progress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold">{stats.resolved}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lightbulb className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Submitted</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tickets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Support Tickets
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'feedback'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Product Feedback
        </button>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-auto md:min-w-[300px] md:max-w-[400px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature_request">Feature</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tickets Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ticket.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(ticket.type)}
                      <span className="text-sm text-gray-900">{getTypeLabel(ticket.type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {ticket.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(ticket.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ticket.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setShowViewDialog(true)
                          setNewComment('')
                          await fetchTicketDetails(ticket.id)
                        }}
                        className="bg-transparent"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm">Loading tickets...</p>
            </div>
          )}

          {!loading && filteredTickets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <HeadphonesIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No tickets found</p>
              <Button
                variant="outline"
                className="mt-4 bg-transparent"
                onClick={() => setShowCreateDialog(true)}
              >
                Create your first ticket
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Ticket ID</Label>
                  <p className="text-sm font-medium mt-1">{selectedTicket.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedTicket.type)}
                    <span className="text-sm font-medium">{getTypeLabel(selectedTicket.type)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Title</Label>
                <p className="text-sm font-medium mt-1">{selectedTicket.title}</p>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <p className="text-sm mt-1 text-gray-700">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Created By</Label>
                  <p className="text-sm font-medium mt-1">{selectedTicket.createdBy}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Created At</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm">{selectedTicket.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp-Style Conversation */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversation
                </Label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                  {/* Initial Ticket Message */}
                  <div className="flex justify-end">
                    <div className="max-w-[75%]">
                      <div className="bg-blue-500 text-white rounded-lg rounded-tr-none p-3 shadow-sm">
                        <p className="text-sm mb-1">{selectedTicket.description}</p>
                        {selectedTicket.screenshot && (
                          <div className="mt-2 bg-white rounded-lg p-2">
                            <a 
                              href={selectedTicket.screenshot} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={selectedTicket.screenshot} 
                                alt="Screenshot" 
                                className="rounded cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
                                style={{ maxHeight: '200px', maxWidth: '100%', display: 'block' }}
                              />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1 px-1">
                        <span className="text-xs text-gray-500">{selectedTicket.createdBy}</span>
                        <span className="text-xs text-gray-400">{selectedTicket.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments/Replies */}
                  {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                    <>
                      {selectedTicket.comments.map((comment) => (
                        <div 
                          key={comment.id}
                          className={`flex ${comment.role === 'support' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className="max-w-[75%]">
                            <div className={`rounded-lg p-3 shadow-sm ${
                              comment.role === 'support'
                                ? 'bg-white border border-gray-200 rounded-tl-none'
                                : 'bg-blue-500 text-white rounded-tr-none'
                            }`}>
                              {comment.message && (
                                <p className={`text-sm ${comment.role === 'support' ? 'text-gray-800' : 'text-white'}`}>
                                  {comment.message}
                                </p>
                              )}
                              {comment.image && (
                                <div className={`${comment.message ? 'mt-2' : ''} bg-white rounded-lg p-2`}>
                                  <a 
                                    href={comment.image} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img 
                                      src={comment.image} 
                                      alt="Attachment" 
                                      className="rounded cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
                                      style={{ maxHeight: '200px', maxWidth: '100%', display: 'block' }}
                                    />
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-2 mt-1 px-1 ${
                              comment.role === 'support' ? 'justify-start' : 'justify-end'
                            }`}>
                              <span className={`text-xs font-medium ${
                                comment.role === 'support' ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {comment.author}
                              </span>
                              <span className="text-xs text-gray-400">{comment.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Empty State */}
                  {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No replies yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reply Section - Only show for open and in_progress tickets */}
              {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                <div className="border-t pt-3">
                  <Label className="text-xs text-gray-500 font-semibold mb-2 block">Add Your Reply</Label>
                  <textarea
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Type your response..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  {/* Image Preview */}
                  {commentImage && (
                    <div className="mt-2 relative inline-block">
                      <img 
                        src={URL.createObjectURL(commentImage)} 
                        alt="Preview" 
                        className="max-w-xs max-h-32 rounded border"
                      />
                      <button
                        onClick={() => setCommentImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => document.getElementById('comment-image-upload')?.click()}
                      disabled={submitting}
                    >
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Attach Image
                    </Button>
                    <input
                      id="comment-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setCommentImage(file)
                      }}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={submitting}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {submitting ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
              className="bg-transparent"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: TicketType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Priority <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: TicketPriority) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm">Category <span className="text-red-500">*</span></Label>
              <Select
                value={formData.category}
                onValueChange={(value: TicketCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="applications">Applications</SelectItem>
                  <SelectItem value="job_postings">Job Postings (JD)</SelectItem>
                  <SelectItem value="talent_pool">Talent Pool</SelectItem>
                  <SelectItem value="candidates">Candidates</SelectItem>
                  <SelectItem value="ai_screening">AI Screening</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="delegation">Delegation</SelectItem>
                  <SelectItem value="analytics">Analytics & Reports</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Title <span className="text-red-500">*</span></Label>
              <Input
                className="h-9"
                placeholder="Brief description"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm">Description <span className="text-red-500">*</span></Label>
              <textarea
                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Detailed information..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm">Screenshot (Optional)</Label>
              {formData.screenshot ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded mt-1">
                  <Upload className="h-4 w-4 text-gray-600" />
                  <span className="text-xs flex-1 truncate">{formData.screenshot.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, screenshot: null })}
                    className="bg-transparent h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 mt-1">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Upload screenshot (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

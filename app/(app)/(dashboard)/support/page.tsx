'use client'

import React from "react"

import { useState } from 'react'
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
  CheckCircle,
  Clock,
  Upload,
  X,
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

// Mock data
const mockTickets: Ticket[] = [
  {
    id: 'TKT-001',
    type: 'bug',
    category: 'applications',
    title: 'Application status not updating',
    description: 'When I change application status, it reverts back after refresh',
    priority: 'high',
    status: 'in_progress',
    createdBy: 'Sarah Johnson',
    createdAt: '2024-02-01',
    response: 'Thank you for reporting this. Our team is investigating the issue.',
    comments: [
      {
        id: 'c1',
        author: 'Support Team',
        role: 'support',
        message: 'Thank you for reporting this. Our team is investigating the issue.',
        timestamp: '2024-02-01 10:30'
      },
      {
        id: 'c2',
        author: 'Sarah Johnson',
        role: 'recruiter',
        message: 'Thanks! It happens specifically with the "Interview Scheduled" status.',
        timestamp: '2024-02-01 14:20'
      }
    ]
  },
  {
    id: 'TKT-002',
    type: 'feature_request',
    category: 'messages',
    title: 'Add bulk email feature',
    description: 'Need ability to send emails to multiple candidates at once',
    priority: 'medium',
    status: 'open',
    createdBy: 'Mike Davis',
    createdAt: '2024-02-03',
  },
  {
    id: 'TKT-003',
    type: 'question',
    category: 'candidates',
    title: 'How to export candidate data?',
    description: 'Need guidance on exporting candidate information to CSV',
    priority: 'low',
    status: 'resolved',
    createdBy: 'Emily Chen',
    createdAt: '2024-01-28',
    response: 'You can export candidates from the Candidates page using the Export button.',
  },
  {
    id: 'TKT-002',
    type: 'feature_request',
    title: 'Bulk email feature for candidates',
    description: 'Would be great to send emails to multiple candidates at once',
    priority: 'medium',
    status: 'open',
    createdBy: 'Sarah Johnson',
    createdAt: '2024-02-03',
  },
  {
    id: 'TKT-003',
    type: 'feedback',
    title: 'Dashboard is very intuitive',
    description: 'Love the new dashboard design. Makes tracking metrics so easy!',
    priority: 'low',
    status: 'closed',
    createdBy: 'Sarah Johnson',
    createdAt: '2024-01-28',
    response: 'Thank you for your feedback! We are glad you like it.',
  },
]

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'feedback'>('tickets')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all')
  const [newComment, setNewComment] = useState('')

  const [formData, setFormData] = useState({
    type: 'bug' as TicketType,
    category: 'other' as TicketCategory,
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    screenshot: null as File | null,
  })

  const handleCreateTicket = () => {
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

    console.log('[v0] Creating ticket:', formData)
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
  }

  const handleAddComment = () => {
    if (!newComment.trim()) {
      alert('Please enter a comment')
      return
    }
    console.log('[v0] Adding comment to ticket:', selectedTicket?.id, newComment)
    alert('Comment added successfully!')
    setNewComment('')
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

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesType = typeFilter === 'all' || ticket.type === typeFilter
    const matchesTab =
      activeTab === 'tickets' || (activeTab === 'feedback' && ticket.type === 'feedback')
    return matchesSearch && matchesStatus && matchesType && matchesTab
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold">
                {mockTickets.filter((t) => t.status === 'open').length}
              </p>
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
              <p className="text-2xl font-bold">
                {mockTickets.filter((t) => t.status === 'in_progress').length}
              </p>
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
              <p className="text-2xl font-bold">
                {mockTickets.filter((t) => t.status === 'resolved').length}
              </p>
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
              <p className="text-2xl font-bold">{mockTickets.length}</p>
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
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
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
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[140px]">
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
                    {ticket.id}
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
                        onClick={() => {
                          setSelectedTicket(ticket)
                          setShowViewDialog(true)
                          setNewComment('')
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

          {filteredTickets.length === 0 && (
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
        <DialogContent className="max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Ticket ID</Label>
                  <p className="text-sm font-medium mt-1">{selectedTicket.id}</p>
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

              {/* Conversation History */}
              {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500 font-semibold mb-2 block">Conversation</Label>
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto space-y-2">
                    {selectedTicket.comments.map((comment) => (
                      <div 
                        key={comment.id}
                        className={`p-2 rounded ${
                          comment.role === 'support' 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${
                            comment.role === 'support' ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {comment.author}
                          </span>
                          <span className="text-xs text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-xs text-gray-700">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={handleAddComment}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Send Reply
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="bg-transparent">
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
            <Button onClick={handleCreateTicket}>Submit Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

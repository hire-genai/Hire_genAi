'use client'

import { DialogFooter } from "@/components/ui/dialog"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  UserCog, 
  Plus, 
  Calendar,
  User,
  Briefcase,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter
} from 'lucide-react'

type DelegationType = 'job' | 'application'
type DelegationStatus = 'active' | 'completed' | 'cancelled'

interface Delegation {
  id: string
  type: DelegationType
  delegatedBy: string
  delegatedTo: string
  itemName: string
  itemId?: string
  delegatedItems?: string[] // For applications, list of specific application IDs
  startDate: string
  endDate: string
  reason: string
  status: DelegationStatus
  createdAt: string
  note?: string // Additional note for job delegation
}

interface AuditLog {
  id: string
  action: string
  delegatedBy: string
  delegatedTo: string
  itemType: string
  itemName: string
  date: string
  reason: string
  status: DelegationStatus
}

const mockDelegations: Delegation[] = [
  {
    id: '1',
    type: 'job',
    delegatedBy: 'Sarah Johnson',
    delegatedTo: 'Mike Davis',
    itemName: 'Senior Frontend Developer',
    startDate: '2024-02-10',
    endDate: '2024-02-24',
    reason: 'Annual Leave',
    status: 'active',
    createdAt: '2024-02-08'
  },
  {
    id: '2',
    type: 'application',
    delegatedBy: 'Sarah Johnson',
    delegatedTo: 'Emily Chen',
    itemName: '3 Applications (Backend Engineer role)',
    delegatedItems: ['app_001', 'app_002', 'app_003'],
    startDate: '2024-02-10',
    endDate: '2024-02-24',
    reason: 'Annual Leave',
    status: 'active',
    createdAt: '2024-02-08'
  },
  {
    id: '4',
    type: 'job',
    delegatedBy: 'Mike Davis',
    delegatedTo: 'Sarah Johnson',
    itemName: 'Product Manager',
    startDate: '2024-01-15',
    endDate: '2024-01-30',
    reason: 'Training Program',
    status: 'completed',
    createdAt: '2024-01-12'
  }
]

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    action: 'Delegation Created',
    delegatedBy: 'Sarah Johnson',
    delegatedTo: 'Mike Davis',
    itemType: 'Job Opening',
    itemName: 'Senior Frontend Developer',
    date: '2024-02-08 10:30 AM',
    reason: 'Annual Leave - Feb 10-24',
    status: 'active'
  },
  {
    id: '2',
    action: 'Delegation Created',
    delegatedBy: 'Sarah Johnson',
    delegatedTo: 'Emily Chen',
    itemName: 'John Smith - Backend Engineer Application',
    itemType: 'Application',
    date: '2024-02-08 10:35 AM',
    reason: 'Annual Leave - Feb 10-24',
    status: 'active'
  },
  {
    id: '3',
    action: 'Team Delegation Created',
    delegatedBy: 'Robert Brown (Manager)',
    delegatedTo: 'Lisa Anderson (Manager)',
    itemType: 'Team Members',
    itemName: 'Mike Davis, Emily Chen',
    date: '2024-02-13 02:15 PM',
    reason: 'Medical Leave - Feb 15 to Mar 1',
    status: 'active'
  },
  {
    id: '4',
    action: 'Delegation Completed',
    delegatedBy: 'Mike Davis',
    delegatedTo: 'Sarah Johnson',
    itemType: 'Job Opening',
    itemName: 'Product Manager',
    date: '2024-01-30 05:00 PM',
    reason: 'Training Program ended',
    status: 'completed'
  },
  {
    id: '5',
    action: 'Delegation Cancelled',
    delegatedBy: 'Emily Chen',
    delegatedTo: 'John Williams',
    itemType: 'Application',
    itemName: 'Jane Doe - Data Scientist Application',
    date: '2024-02-01 09:20 AM',
    reason: 'Original recruiter returned early',
    status: 'cancelled'
  }
]

// Mock jobs list (in production, fetch from API)
const availableJobs = [
  { id: 'job_1', title: 'Senior Frontend Developer', status: 'open' },
  { id: 'job_2', title: 'Backend Engineer', status: 'open' },
  { id: 'job_3', title: 'Product Manager', status: 'open' },
  { id: 'job_4', title: 'UX Designer', status: 'open' },
]

// Mock pending applications (in production, fetch from API)
const pendingApplications = [
  { id: 'app_1', candidateName: 'John Smith', position: 'Backend Engineer', stage: 'CV Screening' },
  { id: 'app_2', candidateName: 'Jane Doe', position: 'Frontend Developer', stage: 'AI Interview' },
  { id: 'app_3', candidateName: 'Michael Chen', position: 'Backend Engineer', stage: 'CV Screening' },
  { id: 'app_4', candidateName: 'Sarah Williams', position: 'Product Manager', stage: 'Shortlisted' },
  { id: 'app_5', candidateName: 'Robert Brown', position: 'Backend Engineer', stage: 'CV Screening' },
]

export default function DelegationPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'audit'>('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DelegationStatus | 'all'>('active')
  const [typeFilter, setTypeFilter] = useState<DelegationType | 'all'>('all')
  
  const [formData, setFormData] = useState({
    type: 'job' as DelegationType,
    delegateTo: '',
    selectedJobId: '',
    selectedApplicationJobFilter: '',
    selectedApplicationIds: [] as string[],
    startDate: '',
    endDate: '',
    reason: ''
  })

  const handleCreateDelegation = () => {
    console.log('[v0] Creating delegation:', formData)
    
    // Validate all mandatory fields
    if (!formData.delegateTo) {
      alert('Please select a person to delegate to')
      return
    }
    
    if (!formData.startDate) {
      alert('Please select a start date')
      return
    }
    
    if (!formData.endDate) {
      alert('Please select an end date')
      return
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      alert('End date must be after start date')
      return
    }
    
    if (!formData.reason.trim()) {
      alert('Please provide a reason for delegation')
      return
    }
    
    if (formData.type === 'job' && !formData.selectedJobId) {
      alert('Please select a job opening')
      return
    }
    
    if (formData.type === 'application' && formData.selectedApplicationIds.length === 0) {
      alert('Please select at least one application')
      return
    }
    
    const delegationSummary = formData.type === 'job'
      ? `Job: ${availableJobs.find(j => j.id === formData.selectedJobId)?.title} - All new applications during ${formData.startDate} to ${formData.endDate}`
      : `${formData.selectedApplicationIds.length} Application(s) delegated`
    
    alert(`Delegation created successfully!\n${delegationSummary}`)
    setShowCreateDialog(false)
    setFormData({
      type: 'job',
      delegateTo: '',
      selectedJobId: '',
      selectedApplicationJobFilter: '',
      selectedApplicationIds: [],
      startDate: '',
      endDate: '',
      reason: ''
    })
  }

  const filteredDelegations = mockDelegations.filter(delegation => {
    const matchesSearch = searchQuery === '' || 
      delegation.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delegation.delegatedTo.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || delegation.status === statusFilter
    const matchesType = typeFilter === 'all' || delegation.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const filteredAuditLogs = mockAuditLogs.filter(log => {
    return searchQuery === '' || 
      log.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.delegatedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.delegatedTo.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const getTypeIcon = (type: DelegationType) => {
    switch(type) {
      case 'job': return <Briefcase className="h-4 w-4" />
      case 'application': return <FileText className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: DelegationType) => {
    switch(type) {
      case 'job': return 'Job Opening'
      case 'application': return 'Application'
    }
  }

  const getStatusBadge = (status: DelegationStatus) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delegation Management</h1>
          <p className="text-sm text-gray-600">
            Delegate job openings and pending applications to other recruiters during absences
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Delegation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Delegations</p>
              <p className="text-2xl font-bold">
                {mockDelegations.filter(d => d.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Jobs Delegated</p>
              <p className="text-2xl font-bold">
                {mockDelegations.filter(d => d.type === 'job').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Applications Delegated</p>
              <p className="text-2xl font-bold">
                {mockDelegations.filter(d => d.type === 'application').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'active'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Delegations
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'audit'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Audit Log
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, delegatee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab === 'active' && (
            <>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DelegationStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DelegationType | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="job">Job Opening</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="team_member">Team Members</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </Card>

      {/* Active Delegations Tab */}
      {activeTab === 'active' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Delegated By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Delegated To</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDelegations.map((delegation) => (
                  <tr key={delegation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(delegation.type)}
                        <span className="text-sm font-medium">{getTypeLabel(delegation.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{delegation.itemName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{delegation.delegatedBy}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{delegation.delegatedTo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {delegation.startDate}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          to {delegation.endDate}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{delegation.reason}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(delegation.status)}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDelegation(delegation)
                          setShowViewDialog(true)
                        }}
                        className="bg-transparent"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDelegations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No delegations found</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card>
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Delegation Audit Trail
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              Complete history of all delegation actions including who, when, and why
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Delegated By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Delegated To</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Item Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {log.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.action}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.delegatedBy}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.delegatedTo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-xs">{log.itemType}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{log.itemName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">{log.reason}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(log.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAuditLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No audit logs found</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* View Delegation Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Delegation Details</DialogTitle>
          </DialogHeader>
          {selectedDelegation && (
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedDelegation.type)}
                    <span className="text-sm font-medium">{getTypeLabel(selectedDelegation.type)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedDelegation.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Delegated By</Label>
                  <p className="text-sm font-medium mt-1">{selectedDelegation.delegatedBy}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Delegated To</Label>
                  <p className="text-sm font-medium mt-1">{selectedDelegation.delegatedTo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Start Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-medium">{selectedDelegation.startDate}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">End Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-medium">{selectedDelegation.endDate}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Item/Job/Applications</Label>
                <p className="text-sm font-medium mt-1">{selectedDelegation.itemName}</p>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Reason</Label>
                <p className="text-sm mt-1 text-gray-700">{selectedDelegation.reason}</p>
              </div>

              {selectedDelegation.type === 'job' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-800">
                    All NEW applications for this job will be auto-assigned to {selectedDelegation.delegatedTo}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="bg-transparent">
              Close
            </Button>
            {selectedDelegation?.status === 'active' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this delegation?')) {
                    console.log('[v0] Cancel delegation:', selectedDelegation.id)
                    alert('Delegation cancelled successfully')
                    setShowViewDialog(false)
                  }
                }}
                className="bg-transparent text-red-600 hover:text-red-700 border-red-300"
              >
                Cancel Delegation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Delegation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Delegation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Top Row: Type and Delegate To */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delegation Type <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({
                    ...formData, 
                    type: value as DelegationType,
                    selectedJobId: '',
                    selectedApplicationIds: []
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Job Opening</SelectItem>
                    <SelectItem value="application">Applications</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === 'job' ? 'All new applications' : 'Select pending apps'}
                </p>
              </div>

              <div>
                <Label>Delegate To <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.delegateTo} 
                  onValueChange={(value) => setFormData({...formData, delegateTo: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recruiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mike Davis">Mike Davis</SelectItem>
                    <SelectItem value="Emily Chen">Emily Chen</SelectItem>
                    <SelectItem value="John Williams">John Williams</SelectItem>
                    <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            {/* Job Selection */}
            {formData.type === 'job' && (
              <div>
                <Label>Select Job Opening <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.selectedJobId} 
                  onValueChange={(value) => setFormData({...formData, selectedJobId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose job opening" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableJobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-blue-600 mt-1">
                  All NEW applications during delegation period will be auto-assigned
                </p>
              </div>
            )}

            {/* Application Selection */}
            {formData.type === 'application' && (
              <div className="space-y-3">
                {/* Job filter dropdown - only shown for application type */}
                <div>
                  <Label>Filter by Job</Label>
                  <Select
                    value={formData.selectedApplicationJobFilter}
                    onValueChange={(value) => setFormData({...formData, selectedApplicationJobFilter: value, selectedApplicationIds: []})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {availableJobs.map(job => (
                        <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Pending Applications <span className="text-red-500">*</span></Label>
                  <div className="mt-2 border rounded max-h-48 overflow-y-auto">
                  {pendingApplications
                    .filter(app => !formData.selectedApplicationJobFilter || formData.selectedApplicationJobFilter === 'all' || availableJobs.find(j => j.id === formData.selectedApplicationJobFilter)?.title === app.position)
                    .map(app => (
                    <label 
                      key={app.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedApplicationIds.includes(app.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...formData.selectedApplicationIds, app.id]
                            : formData.selectedApplicationIds.filter(id => id !== app.id)
                          setFormData({...formData, selectedApplicationIds: newIds})
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{app.candidateName}</div>
                        <div className="text-xs text-gray-500">{app.position} • {app.stage}</div>
                      </div>
                        <Badge variant="secondary" className="text-xs">{app.stage}</Badge>
                    </label>
                  ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.selectedApplicationIds.length} selected
                  </p>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <Label>Reason for Delegation <span className="text-red-500">*</span></Label>
              <textarea
                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="e.g. Annual Leave, Medical Leave, Training..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDelegation}>
              Create Delegation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

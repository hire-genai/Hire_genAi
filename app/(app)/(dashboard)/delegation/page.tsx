'use client'

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { 
  UserCog, 
  Plus, 
  Calendar,
  Briefcase,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  Loader2,
  RefreshCw
} from 'lucide-react'

type DelegationType = 'job' | 'application'
type DelegationStatus = 'active' | 'expired' | 'revoked'

export default function DelegationPage() {
  const { company, user } = useAuth()

  // Data from API
  const [delegations, setDelegations] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, jobsDelegated: 0, applicationsDelegated: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<'active' | 'audit'>('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedDelegation, setSelectedDelegation] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DelegationStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<DelegationType | 'all'>('all')
  
  const [formData, setFormData] = useState({
    type: 'job' as DelegationType,
    delegateTo: '',
    selectedJobId: '',
    selectedApplicationIds: [] as string[],
    startDate: '',
    endDate: '',
    reason: ''
  })

  // Fetch all delegation data from API
  const fetchDelegations = useCallback(async () => {
    if (!company?.id || !user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/delegations?companyId=${company.id}&userId=${user.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch delegations')
      
      setDelegations(data.delegations || [])
      setAuditLogs(data.auditLogs || [])
      setRecruiters(data.recruiters || [])
      setMyJobs(data.myJobs || [])
      setMyApplications(data.myApplications || [])
      setStats(data.stats || { active: 0, jobsDelegated: 0, applicationsDelegated: 0 })
    } catch (err: any) {
      console.error('Failed to fetch delegations:', err)
      setError(err.message || 'Failed to load delegation data')
    } finally {
      setIsLoading(false)
    }
  }, [company?.id, user?.id])

  useEffect(() => {
    fetchDelegations()
  }, [fetchDelegations])

  // Create delegation via API
  const handleCreateDelegation = async () => {
    if (!company?.id || !user?.id) return

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

    setIsSubmitting(true)
    try {
      // For application type, create one delegation per selected application
      const itemIds = formData.type === 'job' 
        ? [formData.selectedJobId] 
        : formData.selectedApplicationIds

      for (const itemId of itemIds) {
        const res = await fetch('/api/delegations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: company.id,
            userId: user.id,
            delegationType: formData.type,
            itemId,
            delegatedTo: formData.delegateTo,
            startDate: formData.startDate,
            endDate: formData.endDate,
            reason: formData.reason
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create delegation')
      }

      alert('Delegation created successfully!')
      setShowCreateDialog(false)
      setFormData({
        type: 'job',
        delegateTo: '',
        selectedJobId: '',
        selectedApplicationIds: [],
        startDate: '',
        endDate: '',
        reason: ''
      })
      fetchDelegations()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Revoke delegation via API
  const handleRevokeDelegation = async (delegationId: string) => {
    if (!company?.id || !user?.id) return
    if (!confirm('Are you sure you want to revoke this delegation?')) return

    try {
      const res = await fetch(`/api/delegations?id=${delegationId}&companyId=${company.id}&userId=${user.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to revoke delegation')
      
      alert('Delegation revoked successfully')
      setShowViewDialog(false)
      fetchDelegations()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Filter delegations
  const filteredDelegations = delegations.filter((d: any) => {
    const matchesSearch = searchQuery === '' || 
      (d.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.delegated_to_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.delegated_by_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    const matchesType = typeFilter === 'all' || d.delegation_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter((log: any) => {
    return searchQuery === '' || 
      (log.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.delegated_by_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.delegated_to_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchQuery.toLowerCase())
  })

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'job': return <Briefcase className="h-4 w-4" />
      case 'application': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'job': return 'Job Opening'
      case 'application': return 'Application'
      default: return type
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
      case 'revoked':
        return <Badge className="bg-red-100 text-red-800">Revoked</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return dateStr }
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    } catch { return dateStr }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-gray-500">Loading delegation data...</p>
        </div>
      </div>
    )
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDelegations} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Delegation
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Delegations</p>
              <p className="text-2xl font-bold">{stats.active}</p>
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
              <p className="text-2xl font-bold">{stats.jobsDelegated}</p>
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
              <p className="text-2xl font-bold">{stats.applicationsDelegated}</p>
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
          Delegations
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
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
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
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </Card>

      {/* Delegations Tab */}
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
                {filteredDelegations.map((delegation: any) => (
                  <tr key={delegation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(delegation.delegation_type)}
                        <span className="text-sm font-medium">{getTypeLabel(delegation.delegation_type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{delegation.item_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{delegation.delegated_by_name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{delegation.delegated_to_name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(delegation.start_date)}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          to {formatDate(delegation.end_date)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{delegation.reason || '-'}</div>
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
                <p className="text-xs mt-1">Create a delegation to share job or application access with another recruiter</p>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Performed By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Delegated By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Delegated To</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAuditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-xs capitalize">{log.action}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.performed_by_name || 'System'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.delegated_by_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.delegated_to_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {log.item_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{log.details || '-'}</div>
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
                    {getTypeIcon(selectedDelegation.delegation_type)}
                    <span className="text-sm font-medium">{getTypeLabel(selectedDelegation.delegation_type)}</span>
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
                  <p className="text-sm font-medium mt-1">{selectedDelegation.delegated_by_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Delegated To</Label>
                  <p className="text-sm font-medium mt-1">{selectedDelegation.delegated_to_name || 'Unknown'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Start Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-medium">{formatDate(selectedDelegation.start_date)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">End Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-medium">{formatDate(selectedDelegation.end_date)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Item</Label>
                <p className="text-sm font-medium mt-1">{selectedDelegation.item_name}</p>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Reason</Label>
                <p className="text-sm mt-1 text-gray-700">{selectedDelegation.reason || 'No reason provided'}</p>
              </div>

              {selectedDelegation.delegation_type === 'job' && selectedDelegation.status === 'active' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-800">
                    {selectedDelegation.delegated_to_name} can see this job and all its applications during the delegation period.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="bg-transparent">
              Close
            </Button>
            {selectedDelegation?.status === 'active' && selectedDelegation?.delegated_by === user?.id && (
              <Button 
                variant="outline" 
                onClick={() => handleRevokeDelegation(selectedDelegation.id)}
                className="bg-transparent text-red-600 hover:text-red-700 border-red-300"
              >
                Revoke Delegation
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
                  {formData.type === 'job' ? 'Grants access to the job and all its applications' : 'Grants access to specific applications'}
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
                    {recruiters.length === 0 && (
                      <SelectItem value="_none" disabled>No other recruiters found</SelectItem>
                    )}
                    {recruiters.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.full_name} ({r.email})
                      </SelectItem>
                    ))}
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
                <Label>Select Job Opening (you own) <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.selectedJobId} 
                  onValueChange={(value) => setFormData({...formData, selectedJobId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose job opening" />
                  </SelectTrigger>
                  <SelectContent>
                    {myJobs.length === 0 && (
                      <SelectItem value="_none" disabled>No jobs found - you must own a job to delegate it</SelectItem>
                    )}
                    {myJobs.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} ({job.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-blue-600 mt-1">
                  The delegatee will see this job and all its applications during the delegation period
                </p>
              </div>
            )}

            {/* Application Selection */}
            {formData.type === 'application' && (
              <div>
                <Label>Select Applications (from your jobs) <span className="text-red-500">*</span></Label>
                <div className="mt-2 border rounded max-h-48 overflow-y-auto">
                  {myApplications.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No applications found for your jobs
                    </div>
                  )}
                  {myApplications.map((app: any) => (
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
                            : formData.selectedApplicationIds.filter((id: string) => id !== app.id)
                          setFormData({...formData, selectedApplicationIds: newIds})
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{app.candidate_name}</div>
                        <div className="text-xs text-gray-500">{app.job_title} &bull; {app.current_stage}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{app.current_stage}</Badge>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.selectedApplicationIds.length} selected
                </p>
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
            <Button onClick={handleCreateDelegation} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Delegation'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

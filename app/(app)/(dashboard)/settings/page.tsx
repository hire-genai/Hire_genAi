'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Settings, User, Bell, Lock, Building2, Users, CreditCard, Plus, Trash2, Edit, Mail, MapPin, FileText, CheckCircle2, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

// Industries list (same as signup)
const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Hospitality",
  "Other",
]

// Company sizes list (same as signup)
const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
]

// Country options (same as signup)
const countryOptions = [
  { name: "United States", code: "US" },
  { name: "India", code: "IN" },
  { name: "United Kingdom", code: "GB" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Singapore", code: "SG" },
  { name: "UAE", code: "AE" },
  { name: "Other", code: "XX" },
]

type UserRole = 'admin' | 'director' | 'manager' | 'recruiter' | 'hiring_manager' | 'viewer' | string
type SettingsTab = 'profile' | 'company' | 'users' | 'payment' | 'notifications'

interface TeamUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'invited'
  addedDate: string
}

export default function SettingsPage() {
  const { user, company } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [autoScreening, setAutoScreening] = useState(true)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'recruiter' as UserRole })
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false)
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingCompany, setSavingCompany] = useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    bio: '',
  })

  // Company form state (matching signup structure)
  const [companyForm, setCompanyForm] = useState({
    // Step 1: Company Information
    companyName: '',
    industry: '',
    companySize: '',
    website: '',
    companyDescription: '',
    // Step 2: Contact Information
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    // Step 3: Legal Information
    legalCompanyName: '',
    taxId: '',
    registrationNumber: '',
  })

  // Team users state - fetched from database
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [addingUser, setAddingUser] = useState(false)

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    if (!user?.id && !user?.email) return
    setLoadingProfile(true)
    try {
      // Use email for lookup (more reliable with mock auth system)
      const params = new URLSearchParams()
      if (user?.email) params.append('email', user.email)
      if (user?.id) params.append('userId', user.id)
      
      const res = await fetch(`/api/settings/profile?${params.toString()}`)
      const data = await res.json()
      console.log('📋 [SETTINGS] Profile data received:', data)
      
      if (data.user) {
        // Use database data
        const u = data.user
        const fullName = u.full_name || ''
        const spaceIdx = fullName.indexOf(' ')
        const firstName = spaceIdx >= 0 ? fullName.substring(0, spaceIdx) : fullName
        const lastName = spaceIdx >= 0 ? fullName.substring(spaceIdx + 1) : ''
        setProfileForm({
          firstName,
          lastName,
          email: u.email || '',
          role: u.role || u.job_title || '',
          bio: '',
        })
      } else if (user) {
        // Fallback to auth context data when user not in database
        const fullName = user.full_name || ''
        const spaceIdx = fullName.indexOf(' ')
        const firstName = spaceIdx >= 0 ? fullName.substring(0, spaceIdx) : fullName
        const lastName = spaceIdx >= 0 ? fullName.substring(spaceIdx + 1) : ''
        setProfileForm({
          firstName,
          lastName,
          email: user.email || '',
          role: user.role || '',
          bio: '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      // Fallback to auth context data on error
      if (user) {
        const fullName = user.full_name || ''
        const spaceIdx = fullName.indexOf(' ')
        const firstName = spaceIdx >= 0 ? fullName.substring(0, spaceIdx) : fullName
        const lastName = spaceIdx >= 0 ? fullName.substring(spaceIdx + 1) : ''
        setProfileForm({
          firstName,
          lastName,
          email: user.email || '',
          role: user.role || '',
          bio: '',
        })
      }
    } finally {
      setLoadingProfile(false)
    }
  }, [user])

  // Fetch company data
  const fetchCompanyData = useCallback(async () => {
    if (!company?.id) return
    setLoadingCompany(true)
    try {
      const res = await fetch(`/api/settings/company?companyId=${company.id}`)
      const data = await res.json()
      if (data.company) {
        const c = data.company
        console.log('📋 [SETTINGS] Company data received:', c)
        setCompanyForm({
          companyName: c.name || '',
          industry: c.industry || '',
          companySize: c.companySize || '',
          website: c.website || '',
          companyDescription: c.description || '',
          street: c.street || '',
          city: c.city || '',
          state: c.state || '',
          postalCode: c.postalCode || '',
          country: c.country || '',
          phone: c.phone || '',
          legalCompanyName: c.legalCompanyName || '',
          taxId: c.taxId || '',
          registrationNumber: c.registrationNumber || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch company:', error)
    } finally {
      setLoadingCompany(false)
    }
  }, [company?.id])

  // Fetch team users
  const fetchTeamUsers = useCallback(async () => {
    if (!company?.id) return
    setLoadingUsers(true)
    try {
      const res = await fetch(`/api/settings/users?companyId=${company.id}`)
      const data = await res.json()
      console.log('👥 [SETTINGS] Team users received:', data)
      if (data.users) {
        setTeamUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch team users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }, [company?.id])

  // Fetch data on mount and tab change
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfileData()
    } else if (activeTab === 'company') {
      fetchCompanyData()
    } else if (activeTab === 'users') {
      fetchTeamUsers()
    }
  }, [activeTab, fetchProfileData, fetchCompanyData, fetchTeamUsers])

  // Save profile
  const handleSaveProfile = async () => {
    if (!user?.id) return
    setSavingProfile(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          full_name: `${profileForm.firstName} ${profileForm.lastName}`.trim(),
        }),
      })
      if (res.ok) {
        alert('Profile updated successfully!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // Save company (only editable fields)
  const handleSaveCompany = async () => {
    if (!company?.id) return
    setSavingCompany(true)
    try {
      // Only send editable fields (non-mandatory ones)
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          // Editable fields only
          website_url: companyForm.website,
          description_md: companyForm.companyDescription,
          phone: companyForm.phone,
          tax_id: companyForm.taxId,
          registration_number: companyForm.registrationNumber,
          // Address fields
          street: companyForm.street,
          city: companyForm.city,
          state: companyForm.state,
          postal_code: companyForm.postalCode,
          country: companyForm.country,
        }),
      })
      if (res.ok) {
        alert('Company profile updated successfully!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update company profile')
      }
    } catch (error) {
      console.error('Failed to save company:', error)
      alert('Failed to update company profile')
    } finally {
      setSavingCompany(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) return

    try {
      const res = await fetch(`/api/settings/users?userId=${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to delete user')
        return
      }
      alert(data.message || `${userName} has been removed.`)
      await fetchTeamUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user. Please try again.')
    }
  }

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      alert('Please fill in all required fields')
      return
    }
    if (!company?.id) {
      alert('Company information not available')
      return
    }

    setAddingUser(true)
    try {
      console.log('👥 [SETTINGS] Adding user:', newUser)
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          companyId: company.id,
          adminUserId: user?.id
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to add user')
        return
      }

      console.log('✅ [SETTINGS] User added:', data)
      alert(data.message || `User ${newUser.name} has been added successfully!`)
      
      // Refresh the users list
      await fetchTeamUsers()
      
      setShowAddUserDialog(false)
      setNewUser({ name: '', email: '', role: 'recruiter' })
    } catch (error) {
      console.error('Failed to add user:', error)
      alert('Failed to add user. Please try again.')
    } finally {
      setAddingUser(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      director: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      hiring_manager: 'bg-blue-100 text-blue-800',
      recruiter: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription? Your access will continue until the end of the current billing period.')) {
      console.log('[v0] Cancelling subscription')
      alert('Your subscription has been cancelled. You will have access until March 15, 2024.')
    }
  }

  const handleChangePlan = (plan: string) => {
    console.log('[v0] Changing plan to:', plan)
    alert(`Plan changed to ${plan} successfully!`)
    setShowChangePlanDialog(false)
  }

  const handleAddPaymentMethod = (method: string) => {
    console.log('[v0] Adding payment method:', method)
    alert(`${method} payment method added successfully!`)
    setShowAddPaymentDialog(false)
  }

  const handleEditPaymentMethod = (method: string) => {
    console.log('[v0] Editing payment method:', method)
    alert(`Edit ${method} payment method`)
  }

  const handleRemovePaymentMethod = (method: string) => {
    if (confirm(`Are you sure you want to remove ${method} payment method?`)) {
      console.log('[v0] Removing payment method:', method)
      alert(`${method} payment method removed successfully!`)
    }
  }

  const handleDownloadInvoice = (invoiceDate: string) => {
    console.log('[v0] Downloading invoice for:', invoiceDate)
    alert(`Downloading invoice for ${invoiceDate}...`)
  }

  const handleBillingCycleChange = (cycle: 'monthly' | 'yearly') => {
    setBillingCycle(cycle)
    console.log('[v0] Billing cycle changed to:', cycle)
    alert(`Billing cycle changed to ${cycle}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className={`${activeTab === 'profile' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'bg-transparent hover:bg-gray-100'}`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className={`${activeTab === 'company' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'bg-transparent hover:bg-gray-100'}`}
            onClick={() => setActiveTab('company')}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Company Profile
          </Button>
          <Button
            variant="ghost"
            className={`${activeTab === 'users' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'bg-transparent hover:bg-gray-100'}`}
            onClick={() => setActiveTab('users')}
          >
            <Users className="h-4 w-4 mr-2" />
            User Management
          </Button>
          <Button
            variant="ghost"
            className={`${activeTab === 'payment' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'bg-transparent hover:bg-gray-100'}`}
            onClick={() => setActiveTab('payment')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Payment
          </Button>
          <Button
            variant="ghost"
            className={`${activeTab === 'notifications' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'bg-transparent hover:bg-gray-100'}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
        </div>
      </Card>

      {/* Settings Content */}
      <div className="space-y-4">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Profile Settings</h2>
              </div>

              {loadingProfile ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profileForm.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input 
                      id="role" 
                      value={profileForm.role || 'Not assigned'}
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      placeholder="Tell us about yourself..." 
                      rows={3}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    />
                  </div>

                  <Button 
                    className="w-full sm:w-auto" 
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Company Profile - Signup Style UI */}
          {activeTab === 'company' && (
            <>
              {loadingCompany ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Section 1: Company Information (same as signup step 1) */}
                  <Card className="sr-card">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <CardTitle className="text-2xl">Company Information</CardTitle>
                      <CardDescription>Tell us about your company and what you do</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name *</Label>
                          <Input 
                            id="companyName" 
                            value={companyForm.companyName}
                            disabled
                            className="sr-input bg-gray-50"
                          />
                          <p className="text-xs text-gray-500">Cannot be changed after signup</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry *</Label>
                          <Select value={companyForm.industry} disabled>
                            <SelectTrigger id="industry" className="sr-select w-full bg-gray-50">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {industries.map((i) => (
                                <SelectItem key={i} value={i}>{i}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">Cannot be changed after signup</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companySize">Company Size *</Label>
                          <Select value={companyForm.companySize} disabled>
                            <SelectTrigger id="companySize" className="sr-select w-full bg-gray-50">
                              <SelectValue placeholder="Select company size" />
                            </SelectTrigger>
                            <SelectContent>
                              {companySizes.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">Cannot be changed after signup</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input 
                            id="website" 
                            placeholder="https://www.example.com" 
                            value={companyForm.website}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                            className="sr-input" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyDescription">Company Description</Label>
                        <Textarea 
                          id="companyDescription" 
                          placeholder="Brief description of your company and what you do..." 
                          value={companyForm.companyDescription}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, companyDescription: e.target.value }))}
                          className="sr-input" 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 2: Contact Information (same as signup step 2) */}
                  <Card className="sr-card">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-2xl">Contact Information</CardTitle>
                      <CardDescription>Where is your company located?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address *</Label>
                        <Input 
                          id="street" 
                          value={companyForm.street}
                          disabled
                          className="sr-input bg-gray-50" 
                        />
                        <p className="text-xs text-gray-500">Cannot be changed after signup</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input 
                            id="city" 
                            value={companyForm.city}
                            disabled
                            className="sr-input bg-gray-50" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State/Province *</Label>
                          <Input 
                            id="state" 
                            value={companyForm.state}
                            disabled
                            className="sr-input bg-gray-50" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">ZIP/Postal Code *</Label>
                          <Input 
                            id="postalCode" 
                            value={companyForm.postalCode}
                            disabled
                            className="sr-input bg-gray-50" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Select value={companyForm.country} disabled>
                            <SelectTrigger id="country" className="sr-select w-full bg-gray-50">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countryOptions.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                          id="phone" 
                          placeholder="+1 (555) 123-4567" 
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="sr-input" 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 3: Legal Information (same as signup step 3) */}
                  <Card className="sr-card">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-indigo-600" />
                      </div>
                      <CardTitle className="text-2xl">Legal Information</CardTitle>
                      <CardDescription>Legal details for compliance and verification</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="legalCompanyName">Legal Company Name *</Label>
                        <Input 
                          id="legalCompanyName" 
                          value={companyForm.legalCompanyName}
                          disabled
                          className="sr-input bg-gray-50" 
                        />
                        <p className="text-xs text-gray-500">Cannot be changed after signup</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="taxId">Tax ID / EIN</Label>
                          <Input 
                            id="taxId" 
                            value={companyForm.taxId}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, taxId: e.target.value }))}
                            className="sr-input" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registrationNumber">Business Registration Number</Label>
                          <Input 
                            id="registrationNumber" 
                            value={companyForm.registrationNumber}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                            className="sr-input" 
                          />
                        </div>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                        This information is used for verification purposes and is kept secure and confidential.
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveCompany}
                      disabled={savingCompany}
                      className="w-full sm:w-auto"
                    >
                      {savingCompany ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Company Profile'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* User Management */}
          {activeTab === 'users' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold">User Management</h2>
                    <p className="text-sm text-gray-600">Manage team access and roles</p>
                  </div>
                </div>
                <Button onClick={() => setShowAddUserDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions:</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li><strong>Admin:</strong> Full access to all features including user management and billing</li>
                  <li><strong>Director:</strong> Access to analytics, reports, and can manage recruiters and managers</li>
                  <li><strong>Manager:</strong> Can manage job postings, applications, and assigned recruiters</li>
                  <li><strong>Recruiter:</strong> Can manage assigned applications and candidates</li>
                </ul>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : teamUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No team members yet</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add User" to add your first team member</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamUsers.map((teamUser) => (
                        <tr key={teamUser.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{teamUser.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{teamUser.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getRoleBadgeColor(teamUser.role)}>
                              {teamUser.role.charAt(0).toUpperCase() + teamUser.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={teamUser.status === 'active' ? 'default' : 'secondary'}>
                              {teamUser.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {teamUser.addedDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="bg-transparent">
                                <Edit className="h-3 w-3" />
                              </Button>
                              {teamUser.role !== 'admin' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteUser(teamUser.id, teamUser.name)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Payment Settings */}
          {activeTab === 'payment' && (
            <>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold">Subscription Plan</h2>
                    <p className="text-sm text-gray-600">Manage your billing and subscription</p>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Professional Plan</h3>
                      <p className="text-sm text-gray-600">Billed monthly</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">$99</p>
                      <p className="text-sm text-gray-600">per month</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="bg-transparent" onClick={() => setShowChangePlanDialog(true)}>
                      Change Plan
                    </Button>
                    <Button variant="outline" className="bg-transparent text-red-600 border-red-300" onClick={handleCancelSubscription}>
                      Cancel Subscription
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Billing Cycle</Label>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className={billingCycle === 'monthly' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-transparent'}
                        onClick={() => handleBillingCycleChange('monthly')}
                      >
                        Monthly
                      </Button>
                      <Button 
                        variant="outline" 
                        className={billingCycle === 'yearly' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-transparent'}
                        onClick={() => handleBillingCycleChange('yearly')}
                      >
                        Yearly (Save 20%)
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Next billing date: <strong>March 15, 2024</strong></p>
                    <p className="text-sm text-gray-600 mt-1">Amount: <strong>$99.00</strong></p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Payment Methods</h3>
                    <p className="text-sm text-gray-600">Manage your payment options</p>
                  </div>
                  <Button variant="outline" className="bg-transparent" onClick={() => setShowAddPaymentDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                        <p className="text-xs text-gray-600">Expires 12/2025</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">Default</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleEditPaymentMethod('Visa')}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent text-red-600" onClick={() => handleRemovePaymentMethod('Visa')}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <svg className="w-8 h-5" fill="white" viewBox="0 0 24 24">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l1.12-7.106c.082-.518.526-.9 1.05-.9h2.19c4.298 0 7.664-1.747 8.647-6.797.03-.149.054-.294.077-.437a5.11 5.11 0 0 1 .141.32z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">PayPal</p>
                        <p className="text-xs text-gray-600">user@example.com</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleEditPaymentMethod('PayPal')}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent text-red-600" onClick={() => handleRemovePaymentMethod('PayPal')}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Billing History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm">Feb 15, 2024</td>
                        <td className="px-4 py-3 text-sm">Professional Plan - Monthly</td>
                        <td className="px-4 py-3 text-sm font-medium">$99.00</td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" className="bg-transparent text-xs" onClick={() => handleDownloadInvoice('Feb 15, 2024')}>
                            Download
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm">Jan 15, 2024</td>
                        <td className="px-4 py-3 text-sm">Professional Plan - Monthly</td>
                        <td className="px-4 py-3 text-sm font-medium">$99.00</td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" className="bg-transparent text-xs" onClick={() => handleDownloadInvoice('Jan 15, 2024')}>
                            Download
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive email updates about applications</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">New Application Alerts</p>
                    <p className="text-sm text-gray-600">Get notified when new candidates apply</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Interview Reminders</p>
                    <p className="text-sm text-gray-600">Reminders 1 hour before interviews</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">AI Screening Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Auto AI Screening</p>
                    <p className="text-sm text-gray-600">Automatically screen new applications with AI</p>
                  </div>
                  <Switch checked={autoScreening} onCheckedChange={setAutoScreening} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scoreThreshold">Minimum CV Score Threshold</Label>
                  <Input id="scoreThreshold" type="number" defaultValue="70" min="0" max="100" />
                  <p className="text-xs text-gray-600">Applications below this score will be flagged for review</p>
                </div>
              </div>
            </Card>
          )}
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                <h3 className="font-semibold text-lg mb-2">Basic</h3>
                <p className="text-3xl font-bold mb-2">$49<span className="text-sm text-gray-600">/mo</span></p>
                <ul className="text-sm space-y-2 mb-4">
                  <li>✓ Up to 10 job postings</li>
                  <li>✓ 100 candidates</li>
                  <li>✓ Basic analytics</li>
                  <li>✓ Email support</li>
                </ul>
                <Button variant="outline" className="w-full bg-transparent" onClick={() => handleChangePlan('Basic')}>
                  Select Basic
                </Button>
              </div>

              <div className="border-2 border-blue-500 rounded-lg p-4 relative bg-blue-50">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                  Current Plan
                </div>
                <h3 className="font-semibold text-lg mb-2">Professional</h3>
                <p className="text-3xl font-bold mb-2">$99<span className="text-sm text-gray-600">/mo</span></p>
                <ul className="text-sm space-y-2 mb-4">
                  <li>✓ Unlimited job postings</li>
                  <li>✓ Unlimited candidates</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Priority support</li>
                  <li>✓ AI screening</li>
                </ul>
                <Button className="w-full" disabled>Current Plan</Button>
              </div>

              <div className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                <h3 className="font-semibold text-lg mb-2">Enterprise</h3>
                <p className="text-3xl font-bold mb-2">$299<span className="text-sm text-gray-600">/mo</span></p>
                <ul className="text-sm space-y-2 mb-4">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Custom integrations</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ White-label option</li>
                  <li>✓ SLA guarantee</li>
                </ul>
                <Button variant="outline" className="w-full bg-transparent" onClick={() => handleChangePlan('Enterprise')}>
                  Select Enterprise
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)} className="bg-transparent">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start bg-transparent h-auto py-4"
                onClick={() => handleAddPaymentMethod('Credit/Debit Card')}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold">Credit or Debit Card</p>
                    <p className="text-xs text-gray-600">Visa, Mastercard, Amex</p>
                  </div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start bg-transparent h-auto py-4"
                onClick={() => handleAddPaymentMethod('PayPal')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">PayPal</p>
                    <p className="text-xs text-gray-600">Pay with your PayPal account</p>
                  </div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start bg-transparent h-auto py-4"
                onClick={() => handleAddPaymentMethod('Stripe')}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold">Stripe</p>
                    <p className="text-xs text-gray-600">Secure payment via Stripe</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)} className="bg-transparent">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              A login email will be sent to the user with their account details.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)} className="bg-transparent" disabled={addingUser}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding User...
                </>
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

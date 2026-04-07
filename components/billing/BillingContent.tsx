"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Wallet, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  DollarSign,
  Settings as SettingsIcon,
  Shield,
  Loader2,
  Filter
} from "lucide-react"
import SubscriptionCard, { BillingStatus, SubscriptionInfo } from "./SubscriptionCard"
import { useAuth } from '@/contexts/auth-context'
import { StatCardGridLoader, TableLoader, CardLoader } from '@/components/ui/skeleton-loader'

interface BillingContentProps {
  companyId: string
}

export default function BillingContent({ companyId }: BillingContentProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<any>(null)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionInfo | null>(null)
  const [usageData, setUsageData] = useState<any>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [currentTab, setCurrentTab] = useState<string>("overview")
  // Handle payment cancel → redirect to settings payment tab
  const handlePaymentCancel = () => {
    router.push('/settings?tab=payment')
  }

  // Currency Detection
  const [currency, setCurrency] = useState<'INR' | 'USD'>('USD')

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        if (!res.ok) throw new Error('Country detection failed')
        const data = await res.json()
        const countryCode = data.country_code || data.country
        setCurrency(countryCode === 'IN' ? 'INR' : 'USD')
      } catch (err) {
        console.warn('[BillingContent] Country detection failed, defaulting to USD:', err)
        setCurrency('USD')
      }
    }
    detectCountry()
  }, [])

  // Formatted upgrade amount based on pricing page logic
  const upgradeDisplayAmount = currency === 'INR' ? '₹10,000' : '$100'

  // Auto-Recharge
  const [autoRecharge, setAutoRecharge] = useState(false)

  // Filters for Usage Tab
  const [usageDateRange, setUsageDateRange] = useState<string>("30")
  const [usageJobFilter, setUsageJobFilter] = useState<string>("all")
  const [usageStartDate, setUsageStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date
  })
  const [usageEndDate, setUsageEndDate] = useState<Date>(new Date())

  // Overview date range
  const [overviewDateRange, setOverviewDateRange] = useState<string>("30")
  const [overviewStartDate, setOverviewStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date
  })
  const [overviewEndDate, setOverviewEndDate] = useState<Date>(new Date())
  const [overviewData, setOverviewData] = useState<any>(null)

  // Invoice generation
  const [invoiceStartDate, setInvoiceStartDate] = useState<string>("")
  const [invoiceEndDate, setInvoiceEndDate] = useState<string>("")
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<boolean>(false)
  const [isTogglingAutoRecharge, setIsTogglingAutoRecharge] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (companyId) {
      loadBillingData()
    }
  }, [companyId])

  useEffect(() => {
    if (companyId && billingData) {
      loadUsageData()
    }
  }, [companyId, billingData])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      // Detect country for billing status calculation
      let countryCode = 'US'
      try {
        const countryRes = await fetch('/api/detect-country')
        if (countryRes.ok) {
          const countryData = await countryRes.json()
          countryCode = countryData.countryCode || 'US'
        }
      } catch {
        countryCode = currency === 'INR' ? 'IN' : 'US'
      }
      
      const res = await fetch(`/api/billing/status?companyId=${companyId}&country=${countryCode}`)
      const data = await res.json()
      if (data.ok) {
        setBillingData(data.billing)
        setAutoRecharge(data.billing.autoRechargeEnabled)
        // Store subscription info for SubscriptionCard
        if (data.subscription) {
          setSubscriptionData({
            id: data.subscription.id,
            status: data.subscription.status,
            planId: data.subscription.planId,
            nextBillingDate: data.subscription.nextBillingDate,
            subscriberEmail: data.subscription.subscriberEmail
          })
        } else {
          setSubscriptionData(null)
        }
      }
    } catch (error) {
      console.error('Failed to load billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsageData = async (startOverride?: Date, endOverride?: Date, jobFilterOverride?: string) => {
    try {
      setLoadingUsage(true)
      const startToUse = startOverride || usageStartDate
      const endToUse = endOverride || usageEndDate
      const jobFilterToUse = jobFilterOverride !== undefined ? jobFilterOverride : usageJobFilter

      const params = new URLSearchParams({
        startDate: startToUse.toISOString(),
        endDate: endToUse.toISOString(),
        companyId
      })

      if (jobFilterToUse && jobFilterToUse !== 'all') {
        params.append('jobId', jobFilterToUse)
      }

      const res = await fetch(`/api/billing/usage?${params.toString()}`)
      const data = await res.json()
      
      if (data.ok) {
        console.log('Usage data loaded:', data)
        console.log('All jobs:', data.allJobs)
        setUsageData(data)
      }
    } catch (error) {
      console.error('Failed to load usage data:', error)
    } finally {
      setLoadingUsage(false)
    }
  }

  const loadOverviewData = async () => {
    try {
      const params = new URLSearchParams({
        startDate: overviewStartDate.toISOString(),
        endDate: overviewEndDate.toISOString(),
        companyId
      })
      
      const res = await fetch(`/api/billing/usage?${params.toString()}`)
      const data = await res.json()
      
      if (data.ok) {
        setOverviewData(data)
      }
    } catch (error) {
      console.error('Failed to load overview usage data:', error)
    }
  }


  const handleGenerateInvoice = async () => {
    if (!invoiceStartDate || !invoiceEndDate) {
      alert('Please select both start and end dates')
      return
    }

    setIsGeneratingInvoice(true)
    try {
      const response = await fetch('/api/billing/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          startDate: invoiceStartDate,
          endDate: invoiceEndDate
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate invoice')
      }

      const data = await response.json()
      const invoice = data.invoice

      // Generate HTML invoice
      const invoiceHtml = generateInvoiceHtml(invoice)
      
      // Create and download HTML file
      const blob = new Blob([invoiceHtml], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceStartDate}-to-${invoiceEndDate}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      alert('Invoice downloaded successfully! Open the HTML file and print to PDF if needed.')
    } catch (error: any) {
      console.error('Invoice generation error:', error)
      alert(error.message || 'Failed to generate invoice')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const generateInvoiceHtml = (invoice: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #059669; }
        .invoice-info { text-align: right; }
        .invoice-info h1 { margin: 0; color: #374151; }
        .invoice-info p { margin: 5px 0; color: #6b7280; }
        .company-info { margin-bottom: 30px; }
        .company-info h3 { margin: 0 0 10px 0; color: #374151; }
        .company-info p { margin: 2px 0; color: #6b7280; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
        .table .amount { text-align: right; }
        .summary { margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .summary-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb; padding-top: 15px; margin-top: 15px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">HireGenAI</div>
        <div class="invoice-info">
            <h1>INVOICE</h1>
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoice.invoiceDate}</p>
            <p><strong>Period:</strong> ${invoice.startDate} to ${invoice.endDate}</p>
        </div>
    </div>

    <div class="company-info">
        <h3>Bill To:</h3>
        <p><strong>${invoice.company.name || 'Company'}</strong></p>
        ${invoice.company.legal_company_name ? `<p>${invoice.company.legal_company_name}</p>` : ''}
        ${invoice.company.tax_id_ein ? `<p>Tax ID: ${invoice.company.tax_id_ein}</p>` : ''}
        ${invoice.company.phone_number ? `<p>Phone: ${invoice.company.phone_number}</p>` : ''}
        ${invoice.company.website_url ? `<p>Website: ${invoice.company.website_url}</p>` : ''}
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.itemizedUsage.map((item: any) => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.service}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unitPrice.toFixed(2)}</td>
                    <td class="amount">₹${item.amount.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="summary">
        <div class="summary-row">
            <span>CV Parsing:</span>
            <span>₹${invoice.totals.cvParsing.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Question Generation:</span>
            <span>₹${invoice.totals.questionGeneration.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Video Interviews:</span>
            <span>₹${invoice.totals.videoInterviews.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
            <span>Total Amount:</span>
            <span>₹${invoice.totals.total.toFixed(2)}</span>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for using HireGenAI!</p>
        <p>This is a computer-generated invoice. No signature required.</p>
    </div>
</body>
</html>`
  }


  if (loading && !billingData) {
    return (
      <div className="space-y-4">
        {/* Skeleton for Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Skeleton for Overview Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardLoader />
          <CardLoader />
          <CardLoader />
        </div>

        {/* Skeleton for Subscription Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-2 w-full bg-gray-200 rounded animate-pulse mb-2" />
            <div className="flex gap-4">
              <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton for Usage Table */}
        <TableLoader rows={4} columns={5} />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    // 5 billing status values: active, trial, trial_over, low_balance, recharge_over
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      trial: { color: 'bg-amber-100 text-amber-800', icon: AlertCircle, label: 'Free Trial' },
      trial_over: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Trial Expired' },
      low_balance: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Low Balance' },
      recharge_over: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Recharge Required' },
    }
    
    const config = statusConfig[status] || statusConfig.trial
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4 relative">

      <Tabs 
        value={currentTab} 
        onValueChange={setCurrentTab}
        className="space-y-3"
      >
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Usage</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Invoices</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Overview Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Wallet Balance Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Wallet Balance</p>
                    <p className="text-2xl font-semibold">₹{billingData?.walletBalance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="ml-3">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                {billingData?.status === 'trial' ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Free Trial
                  </Badge>
                ) : (billingData?.walletBalance || 0) < 200 && (
                  <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">Low Balance</Badge>
                )}
              </CardContent>
            </Card>

            {/* Current Month Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Current Month</p>
                    <p className="text-2xl font-semibold">₹{billingData?.currentMonthSpent?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {billingData?.monthlySpendCap
                        ? `Cap: ₹${billingData.monthlySpendCap.toFixed(2)}`
                        : 'No cap set'}
                    </p>
                  </div>
                  <div className="ml-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Spent Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Spent</p>
                    <p className="text-2xl font-semibold">₹{billingData?.totalSpent?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">All-time usage</p>
                  </div>
                  <div className="ml-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Recharge Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-3">Auto-Recharge</p>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={autoRecharge}
                        disabled={isTogglingAutoRecharge}
                        onCheckedChange={async (checked) => {
                          setIsTogglingAutoRecharge(true)
                          const previousState = autoRecharge
                          setAutoRecharge(checked)
                          
                          try {
                            const res = await fetch('/api/billing/settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                companyId,
                                autoRechargeEnabled: checked
                              })
                            })
                            
                            const data = await res.json()
                            if (!data.ok) {
                              setAutoRecharge(previousState)
                              setToastMessage(`Error: ${data.error || 'Failed to update auto-recharge'}`)
                              setTimeout(() => setToastMessage(null), 3000)
                            } else {
                              setToastMessage(`Auto-recharge ${checked ? 'enabled' : 'disabled'}`)
                              setTimeout(() => setToastMessage(null), 3000)
                            }
                          } catch (error: any) {
                            setAutoRecharge(previousState)
                            setToastMessage('Error: Failed to update auto-recharge')
                            setTimeout(() => setToastMessage(null), 3000)
                          } finally {
                            setIsTogglingAutoRecharge(false)
                          }
                        }}
                      />
                      {isTogglingAutoRecharge && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {autoRecharge ? 'Auto recharge active' : 'Manual top-up'}
                    </p>
                  </div>
                  <div className="ml-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Subscription Card - Directly triggers Razorpay/PayPal */}
          <SubscriptionCard
            status={(billingData?.billingStatus || billingData?.status || 'trial') as BillingStatus}
            trialDaysRemaining={billingData?.trialDaysRemaining ?? 7}
            trialTotalDays={billingData?.trialTotalDays ?? 7}
            planName="Pro Plan"
            nextBillingDate={billingData?.nextBillingDate}
            autoRenewal={billingData?.autoRechargeEnabled ?? true}
            currency={billingData?.currency ?? 'INR'}
            companyId={companyId}
            userEmail={user?.email}
            subscription={subscriptionData}
            walletBalance={billingData?.walletBalance ?? 0}
            currentMonthSpent={billingData?.currentMonthSpent ?? 0}
            totalSpent={billingData?.totalSpent ?? 0}
          />

        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
              <p className="text-muted-foreground">Track your AI service consumption and costs</p>
            </div>
          </div>

          {/* Filters - Exact Match */}
          <Card className="border-dashed">
            <CardHeader className="pb-0 mb-[-4px]">
              <CardTitle className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                <SettingsIcon className="h-5 w-5" />
                Filter Usage Data
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Customize your view of usage analytics</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <div>
                  <Label className="text-sm font-medium">Job Description</Label>
                  <Select value={usageJobFilter} onValueChange={setUsageJobFilter}>
                    <SelectTrigger className="mt-2 h-10 w-full px-3 py-2 text-sm">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {usageData?.allJobs?.map((job: any) => (
                        <SelectItem key={job.jobId} value={job.jobId}>{job.jobTitle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date Range</Label>
                  <Select value={usageDateRange} onValueChange={setUsageDateRange}>
                    <SelectTrigger className="mt-2 h-10 w-full px-3 py-2 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 md:col-span-1 flex items-end">
                  <Button
                    className="w-full h-10 px-4 py-2 text-sm font-medium"
                    onClick={() => {
                      const days = parseInt(usageDateRange || "30")
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - days)
                      setUsageStartDate(start)
                      setUsageEndDate(end)
                      loadUsageData(start, end, usageJobFilter)
                    }}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Overview Cards */}
          {usageData?.totals && (
            <div className="grid grid-cols-4 gap-1.5">
              <Card className="border-l-4 border-l-blue-500 py-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-1">
                  <CardTitle className="text-xs font-medium text-blue-700">CV Parsing</CardTitle>
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 py-1">
                  <div className="text-lg font-bold text-blue-900">₹{usageData.totals.cvParsing.toFixed(2)}</div>
                  <p className="text-[10px] text-muted-foreground">
                    {usageData.totals.cvCount || 0} CVs processed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 py-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-1">
                  <CardTitle className="text-xs font-medium text-green-700">JD Questions</CardTitle>
                  <div className="p-1 bg-green-100 rounded-lg">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 py-1">
                  <div className="text-lg font-bold text-green-900">₹{usageData.totals.jdQuestions.toFixed(2)}</div>
                  <p className="text-[10px] text-muted-foreground">
                    {usageData.totals.questionCount || 0} questions generated
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 py-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-1">
                  <CardTitle className="text-xs font-medium text-purple-700">Video Interviews</CardTitle>
                  <div className="p-1 bg-purple-100 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 py-1">
                  <div className="text-lg font-bold text-purple-900">₹{usageData.totals.video.toFixed(2)}</div>
                  <p className="text-[10px] text-muted-foreground">
                    {usageData.totals.interviewCount || 0} interviews ({(usageData.totals.videoMinutes || 0).toFixed(1)} mins)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500 py-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-1">
                  <CardTitle className="text-xs font-medium text-orange-700">Total Usage</CardTitle>
                  <div className="p-1 bg-orange-100 rounded-lg">
                    <DollarSign className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 py-1">
                  <div className="text-lg font-bold text-orange-900">
                    ₹{((usageData.totals.cvParsing || 0) + (usageData.totals.jdQuestions || 0) + (usageData.totals.video || 0)).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    All services combined
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Usage Type Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Usage Type Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Categories</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">CV Parsing</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">₹{usageData?.totals?.cvParsing?.toFixed(2) || '0.00'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">JD Questions</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">₹{usageData?.totals?.jdQuestions?.toFixed(2) || '0.00'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Video Interviews</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">₹{usageData?.totals?.video?.toFixed(2) || '0.00'}</Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage Statistics</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Total CVs Processed</span>
                      <span className="text-sm font-semibold">{usageData?.totals?.cvCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Total Tokens Used</span>
                      <span className="text-sm font-semibold">{(usageData?.totals?.tokenCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Total Video Minutes</span>
                      <span className="text-sm font-semibold">{(usageData?.totals?.videoMinutes || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage by Job */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Usage Breakdown by Job
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {usageData?.jobUsage?.length > 0 ? (
                  usageData.jobUsage.map((job: any, index: number) => (
                    <div key={job.jobId} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">#{index + 1}</span>
                          <div>
                            <h4 className="text-sm font-semibold">{job.jobTitle}</h4>
                            <p className="text-xs text-muted-foreground">ID: {job.jobId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-green-600">₹{job.totalCost.toFixed(2)}</div>
                          <span className="text-xs text-gray-400">total</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800">CV Parsing</span>
                          </div>
                          <div className="text-sm font-semibold text-blue-900">₹{job.cvParsingCost.toFixed(2)}</div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium text-green-800">Questions</span>
                          </div>
                          <div className="text-sm font-semibold text-green-900">₹{job.jdQuestionsCost.toFixed(2)}</div>
                        </div>
                        <div className="bg-purple-50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-800">Video</span>
                          </div>
                          <div className="text-sm font-semibold text-purple-900">₹{job.videoCost.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">No Usage Data Available</p>
                    <p className="text-xs text-gray-400">Start using AI services to see analytics here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="py-2 pt-4">
            <CardHeader className="pb-2 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5" />
                    Generate Invoice
                  </CardTitle>
                  <CardDescription className="text-sm">Create and download invoices for specific date ranges</CardDescription>
                </div>
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={!invoiceStartDate || !invoiceEndDate || isGeneratingInvoice}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  {isGeneratingInvoice ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Generate & Download
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Date Range Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={invoiceStartDate}
                      onChange={(e) => setInvoiceStartDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={invoiceEndDate}
                      onChange={(e) => setInvoiceEndDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Quick Date Range Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                      setInvoiceStartDate(lastMonth.toISOString().split('T')[0])
                      setInvoiceEndDate(lastMonthEnd.toISOString().split('T')[0])
                    }}
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                      setInvoiceStartDate(thisMonth.toISOString().split('T')[0])
                      setInvoiceEndDate(today.toISOString().split('T')[0])
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                      setInvoiceStartDate(last30Days.toISOString().split('T')[0])
                      setInvoiceEndDate(today.toISOString().split('T')[0])
                    }}
                  >
                    Last 30 Days
                  </Button>
                </div>

                {/* Preview Section */}
                {invoiceStartDate && invoiceEndDate && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <h4 className="font-medium mb-2 text-sm">Invoice Preview ({invoiceStartDate} to {invoiceEndDate})</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>CV Parsing:</span>
                        <span>₹{((billingData?.usageCounts?.cvParsed || 0) * parseFloat(usageData?.pricing?.cvParsingCost || "2")).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Question Generation:</span>
                        <span>₹{(((billingData?.usageCounts?.questionsGenerated || 0) / 10) * parseFloat(usageData?.pricing?.questionGenerationCost || "0.5")).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Video Interviews:</span>
                        <span>₹{((billingData?.usageCounts?.videoInterviews || 0) * parseFloat(usageData?.pricing?.videoInterviewCost || "10")).toFixed(2)}</span>
                      </div>
                      <hr className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>₹{billingData?.totalSpent?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}
    </div>
  )
}

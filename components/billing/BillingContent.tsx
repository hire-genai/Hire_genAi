"use client"

import { useState, useEffect } from "react"
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

interface BillingContentProps {
  companyId: string
}

export default function BillingContent({ companyId }: BillingContentProps) {
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<any>(null)
  const [usageData, setUsageData] = useState<any>(null)
  const [currentTab, setCurrentTab] = useState<string>("overview")

  // Settings
  const [autoRecharge, setAutoRecharge] = useState(false)
  const [monthlyCapEnabled, setMonthlyCapEnabled] = useState(false)
  const [monthlyCapAmount, setMonthlyCapAmount] = useState("1000")

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

  useEffect(() => {
    if (companyId) {
      loadBillingData()
      loadUsageData()
    }
  }, [companyId])

  const loadBillingData = async () => {
    try {
      const res = await fetch(`/api/billing/status?companyId=${companyId}`)
      const data = await res.json()
      if (data.ok) {
        setBillingData(data.billing)
        setAutoRecharge(data.billing.autoRechargeEnabled)
      }
    } catch (error) {
      console.error('Failed to load billing data:', error)
    }
  }

  const loadUsageData = async (startOverride?: Date, endOverride?: Date) => {
    try {
      setLoading(true)
      const startToUse = startOverride || usageStartDate
      const endToUse = endOverride || usageEndDate

      const params = new URLSearchParams({
        startDate: startToUse.toISOString(),
        endDate: endToUse.toISOString(),
        companyId
      })

      const res = await fetch(`/api/billing/usage?${params.toString()}`)
      const data = await res.json()
      
      if (data.ok) {
        setUsageData(data)
      }
    } catch (error) {
      console.error('Failed to load usage data:', error)
    } finally {
      setLoading(false)
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

  const updateSettings = async () => {
    try {
      const res = await fetch('/api/billing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          autoRechargeEnabled: autoRecharge,
          monthlySpendCap: monthlyCapEnabled ? parseFloat(monthlyCapAmount) : null
        })
      })
      const data = await res.json()
      if (data.ok) {
        alert('Billing settings updated successfully')
        loadBillingData()
      } else {
        alert(data.error || 'Failed to update settings')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update settings')
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

  // Load overview data when filters change
  useEffect(() => {
    if (companyId && currentTab === 'overview') {
      loadOverviewData()
    }
  }, [overviewStartDate, overviewEndDate, companyId, currentTab])

  if (loading && !billingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      trial: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, label: 'Free Trial' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      past_due: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Past Due' },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Suspended' },
    }
    
    const config = statusConfig[status] || statusConfig.active
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Past Due Banner */}
      {billingData?.status === 'past_due' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Payment Required</h3>
                <p className="text-sm text-red-700">
                  Your account is past due. Please update your payment method to continue using the service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs 
        value={currentTab} 
        onValueChange={setCurrentTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Usage</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Invoices</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{billingData?.walletBalance?.toFixed(2) || '0.00'}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {getStatusBadge(billingData?.status || 'trial')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{billingData?.currentMonthSpent?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {billingData?.monthlySpendCap 
                    ? `Cap: ₹${billingData.monthlySpendCap.toFixed(2)}`
                    : 'No cap set'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{billingData?.totalSpent?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground mt-1">All-time usage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Recharge</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{billingData?.autoRechargeEnabled ? 'ON' : 'OFF'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {billingData?.autoRechargeEnabled ? 'Automatic ₹100' : 'Manual top-up'}
                </p>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
              <p className="text-muted-foreground">Track your AI service consumption and costs</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Filters - Exact Match */}
          <Card className="border-dashed">
            <CardHeader className="pb-0 mb-[-8px]">
              <CardTitle className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                <SettingsIcon className="h-5 w-5" />
                Filter Usage Data
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Customize your view of usage analytics</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <Label className="text-sm font-medium">Job Description</Label>
                  <Select value={usageJobFilter} onValueChange={setUsageJobFilter}>
                    <SelectTrigger className="mt-2 h-10 w-full px-3 py-2 text-sm">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {usageData?.jobUsage?.map((job: any) => (
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
                <div className="flex items-end">
                  <Button
                    className="w-full h-10 px-4 py-2 text-sm font-medium"
                    onClick={() => {
                      const days = parseInt(usageDateRange || "30")
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - days)
                      setUsageStartDate(start)
                      setUsageEndDate(end)
                      loadUsageData(start, end)
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">CV Parsing</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">₹{usageData.totals.cvParsing.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usageData.totals.cvCount || 0} CVs processed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">JD Questions</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">₹{usageData.totals.jdQuestions.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usageData.totals.questionCount || 0} questions generated
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Video Interviews</CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">₹{usageData.totals.video.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usageData.totals.interviewCount || 0} interviews ({(usageData.totals.videoMinutes || 0).toFixed(1)} mins)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Total Usage</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">
                    ₹{((usageData.totals.cvParsing || 0) + (usageData.totals.jdQuestions || 0) + (usageData.totals.video || 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All services combined
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Usage Type Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Usage Type Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Usage Breakdown by Job
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
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
        <TabsContent value="invoices" className="space-y-6">
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

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Billing Settings
              </CardTitle>
              <CardDescription>Configure auto-recharge and spending limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="auto-recharge" className="text-base font-medium">Auto-Recharge</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically add funds to your wallet when balance is low
                  </p>
                </div>
                <Switch 
                  id="auto-recharge"
                  checked={autoRecharge} 
                  onCheckedChange={setAutoRecharge}
                />
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="monthly-cap" className="text-base font-medium">Monthly Spend Cap</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Set a maximum monthly spending limit
                    </p>
                  </div>
                  <Switch 
                    id="monthly-cap"
                    checked={monthlyCapEnabled} 
                    onCheckedChange={setMonthlyCapEnabled}
                  />
                </div>
                {monthlyCapEnabled && (
                  <div className="pt-4">
                    <Label htmlFor="cap-amount">Monthly Cap Amount (₹)</Label>
                    <Input
                      id="cap-amount"
                      type="number"
                      value={monthlyCapAmount}
                      onChange={(e) => setMonthlyCapAmount(e.target.value)}
                      placeholder="1000.00"
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Pricing Info */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Current Pricing
                  </CardTitle>
                  <CardDescription>Per-feature pricing from configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-blue-600 font-medium">CV Parsing</p>
                      <p className="text-lg font-bold text-blue-900">₹{usageData?.pricing?.cvParsingCost || '2'}</p>
                      <p className="text-xs text-blue-500">per CV</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-green-600 font-medium">Questions</p>
                      <p className="text-lg font-bold text-green-900">₹{usageData?.pricing?.questionGenerationCost || '0.5'}</p>
                      <p className="text-xs text-green-500">per question</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-xs text-purple-600 font-medium">Video Interview</p>
                      <p className="text-lg font-bold text-purple-900">₹{usageData?.pricing?.videoInterviewCost || '10'}</p>
                      <p className="text-xs text-purple-500">per interview</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-center">
                      <p className="text-xs text-amber-600 font-medium">AI Evaluation</p>
                      <p className="text-lg font-bold text-amber-900">₹{usageData?.pricing?.aiEvaluationCost || '1'}</p>
                      <p className="text-xs text-amber-500">per evaluation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button onClick={updateSettings}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

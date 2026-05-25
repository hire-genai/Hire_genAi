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
  Filter,
  Receipt
} from "lucide-react"
import SubscriptionCard, { BillingStatus, SubscriptionInfo } from "./SubscriptionCard"
import AutoRechargeSettings from "./AutoRechargeSettings"
import SavedCardSettings from "./SavedCardSettings"
import { useAuth } from '@/contexts/auth-context'
import { StatCardGridLoader, TableLoader, CardLoader } from '@/components/ui/skeleton-loader'

// Helper functions for payment data processing
function normalizeMethod(method: string | null | undefined): string {
  // Return actual method from database without hardcoding
  return method || "-"
}

function getProviderLabel(raw: any): string {
  if (!raw) return "-"
  
  return raw.bank || 
         raw.wallet || 
         raw.vpa || 
         raw.card?.network || 
         "-"
}

function formatPaymentDate(date: string | Date): string {
  if (!date) return "-"
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  
  return d.toLocaleDateString("en-IN", { 
    day: "2-digit", 
    month: "short", 
    year: "numeric" 
  })
}

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

  // Payment history
  const [payments, setPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentMonthFilter, setPaymentMonthFilter] = useState<string>("all")
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [isTogglingAutoRecharge, setIsTogglingAutoRecharge] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null)

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

  useEffect(() => {
    if (currentTab === 'invoices' && companyId) {
      loadPaymentHistory()
    }
  }, [currentTab, companyId])

  // Listen for subscription updates (from SubscriptionCard actions)
  useEffect(() => {
    const handleSubscriptionUpdate = async () => {
      console.log('[BillingContent] Subscription updated, waiting for webhook processing...')
      
      // Poll for subscription status change (webhook processing)
      let attempts = 0
      const maxAttempts = 10
      const pollInterval = 500 // 500ms between polls
      
      const pollForUpdate = async () => {
        try {
          const res = await fetch(`/api/billing/status?companyId=${companyId}&country=US`)
          const data = await res.json()
          
          // Check if subscription status changed from trial/pending to active
          if (data.ok && data.subscription) {
            const currentStatus = data.subscription.status
            console.log(`[BillingContent] Current subscription status: ${currentStatus}`)
            
            // If status is active or subscription exists, webhook has processed
            if (currentStatus === 'active' || currentStatus === 'paid') {
              console.log('[BillingContent] Subscription activated, loading full billing data...')
              await loadBillingData()
              return true
            }
          }
          
          // Check if wallet was credited (for subscription.charged event)
          if (data.ok && data.billing && data.billing.walletBalance > 0) {
            console.log(`[BillingContent] Wallet updated to ${data.billing.walletBalance}, loading full billing data...`)
            await loadBillingData()
            return true
          }
        } catch (error) {
          console.log('[BillingContent] Poll error (will retry):', error)
        }
        
        return false
      }
      
      // Poll until update detected or max attempts reached
      while (attempts < maxAttempts) {
        const updated = await pollForUpdate()
        if (updated) break
        
        attempts++
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval))
        }
      }
      
      // Final load regardless of poll result
      if (attempts >= maxAttempts) {
        console.log('[BillingContent] Max poll attempts reached, loading data anyway...')
        await loadBillingData()
      }
    }

    window.addEventListener('subscription-updated', handleSubscriptionUpdate)
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate)
    }
  }, [companyId])

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
        countryCode = 'US'
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
            status: data.subscription.status || 'unknown',
            planId: data.subscription.planId,
            nextBillingDate: data.subscription.nextBillingDate,
            currentEnd: data.subscription.currentEnd,
            cancelAtCycleEnd: data.subscription.cancelAtCycleEnd,
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


  const loadPaymentHistory = async () => {
    if (!companyId) return
    
    try {
      setLoadingPayments(true)
      const res = await fetch(`/api/billing/invoices?companyId=${companyId}`)
      const data = await res.json()
      
      if (data.ok) {
        console.log('[BillingContent] Payments received:', data.payments?.length || 0, data.payments)
        setPayments(data.payments || [])
        setCompanyInfo(data.company || null)
      }
    } catch (error) {
      console.error('Failed to load payment history:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const generatePaymentReceiptHtml = (payment: any) => {
    // Fallback HTML receipt generation (kept for emergency fallback)
    const paymentDate = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const amount = payment.amount?.toFixed(2) || '0.00'
    const currency = '$'

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Receipt - ${payment.paymentId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #059669; }
        .logo { font-size: 28px; font-weight: bold; color: #059669; margin-bottom: 10px; }
        .receipt-title { font-size: 20px; color: #374151; margin: 0; }
        .receipt-info { margin-bottom: 30px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { color: #6b7280; }
        .info-value { font-weight: 600; color: #374151; }
        .amount-section { background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
        .amount-label { color: #059669; font-size: 14px; margin-bottom: 5px; }
        .amount-value { font-size: 32px; font-weight: bold; color: #059669; }
        .status-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
        @media print { body { margin: 0; padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">HireGenAI</div>
        <h1 class="receipt-title">Payment Receipt (Fallback)</h1>
    </div>

    <div class="receipt-info">
        <div class="info-row">
            <span class="info-label">Receipt ID</span>
            <span class="info-value">${payment.paymentId}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Payment Date</span>
            <span class="info-value">${paymentDate}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value"><span class="status-badge">Paid</span></span>
        </div>
        ${companyInfo?.name ? `
        <div class="info-row">
            <span class="info-label">Company</span>
            <span class="info-value">${companyInfo.name}</span>
        </div>
        ` : ''}
    </div>

    <div class="amount-section">
        <div class="amount-label">Amount Paid</div>
        <div class="amount-value">${currency}${amount}</div>
    </div>

    <div class="footer">
        <p>Thank you for your payment!</p>
        <p>This is a computer-generated receipt (fallback). No signature required.</p>
    </div>
</body>
</html>`
  }

  const handleDownloadReceipt = async (payment: any) => {
    const paymentId = payment.paymentId
    
    if (!paymentId) {
      setToastMessage('Error: Payment ID not found')
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    setDownloadingInvoice(paymentId)
    
    try {
      // Call the PDF generation API with companyId
      const response = await fetch(`/api/invoice/generate-pdf?paymentId=${encodeURIComponent(paymentId)}&companyId=${encodeURIComponent(companyId)}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }))
        throw new Error(errorData.error || 'Failed to generate PDF')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `invoice_${paymentId}.pdf` 
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setToastMessage('Invoice downloaded successfully!')
      setTimeout(() => setToastMessage(null), 3000)
      
    } catch (error: any) {
      console.error('[BillingContent] PDF download error:', error)
      
      // Show proper error message
      const errorMessage = error.message || 'Failed to generate PDF invoice'
      setToastMessage(errorMessage)
      setTimeout(() => setToastMessage(null), 5000)
    } finally {
      setDownloadingInvoice(null)
    }
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
          {/* Overview Cards Grid — 2x2 on mobile, 4 across on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Wallet Balance Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Wallet Balance</p>
                    <p className="text-lg sm:text-2xl font-semibold break-words">${billingData?.walletBalance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="ml-2 shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Current Month</p>
                    <p className="text-lg sm:text-2xl font-semibold break-words">${billingData?.currentMonthSpent?.toFixed(2) || '0.00'}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                      {billingData?.monthlySpendCap
                        ? `Cap: $${billingData.monthlySpendCap.toFixed(2)}`
                        : 'No cap set'}
                    </p>
                  </div>
                  <div className="ml-2 shrink-0">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Spent Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Total Spent</p>
                    <p className="text-lg sm:text-2xl font-semibold break-words">${billingData?.totalSpent?.toFixed(2) || '0.00'}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">All-time usage</p>
                  </div>
                  <div className="ml-2 shrink-0">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Recharge Card */}
            <Card className="border rounded-lg shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-3">Auto-Recharge</p>
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
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      {autoRecharge ? 'Auto recharge active' : 'Manual top-up'}
                    </p>
                  </div>
                  <div className="ml-2 shrink-0">
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

          {/* Saved Card for Auto-Recharge */}
          <SavedCardSettings companyId={companyId} />

          {/* Auto-Recharge Settings */}
          <AutoRechargeSettings companyId={companyId} />

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
                  <div className="text-lg font-bold text-blue-900">${usageData.totals.cvParsing.toFixed(2)}</div>
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
                  <div className="text-lg font-bold text-green-900">${usageData.totals.jdQuestions.toFixed(2)}</div>
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
                  <div className="text-lg font-bold text-purple-900">${usageData.totals.video.toFixed(2)}</div>
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
                    ${((usageData.totals.cvParsing || 0) + (usageData.totals.jdQuestions || 0) + (usageData.totals.video || 0)).toFixed(2)}
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
                      <Badge variant="secondary" className="text-xs">${usageData?.totals?.cvParsing?.toFixed(2) || '0.00'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">JD Questions</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">${usageData?.totals?.jdQuestions?.toFixed(2) || '0.00'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Video Interviews</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">${usageData?.totals?.video?.toFixed(2) || '0.00'}</Badge>
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
                          <div className="text-base font-bold text-green-600">${job.totalCost.toFixed(2)}</div>
                          <span className="text-xs text-gray-400">total</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800">CV Parsing</span>
                          </div>
                          <div className="text-sm font-semibold text-blue-900">${job.cvParsingCost.toFixed(2)}</div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium text-green-800">Questions</span>
                          </div>
                          <div className="text-sm font-semibold text-green-900">${job.jdQuestionsCost.toFixed(2)}</div>
                        </div>
                        <div className="bg-purple-50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-800">Video</span>
                          </div>
                          <div className="text-sm font-semibold text-purple-900">${job.videoCost.toFixed(2)}</div>
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

        {/* Payment History Tab */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Header with Filter Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 truncate">Payment History</h2>
              <p className="text-slate-500 text-sm mt-1">Invoices & receipts · Powered by Razorpay</p>
            </div>
            <div className="w-[180px] flex-shrink-0">
              <div className="relative">
                {/* Hidden native select for functionality */}
                <select 
                  ref={(el) => {
                    if (el && !el.dataset.initialized) {
                      el.dataset.initialized = 'true'
                      el.addEventListener('change', (e) => {
                        setPaymentMonthFilter((e.target as HTMLSelectElement).value)
                      })
                    }
                    // Update value when state changes
                    if (el && el.value !== paymentMonthFilter) {
                      el.value = paymentMonthFilter
                    }
                  }}
                  defaultValue={paymentMonthFilter}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  tabIndex={0}
                >
                  <option value="all">All time</option>
                  {(() => {
                    const months = new Set<string>()
                    payments.forEach(p => {
                      const d = new Date(p.paymentDate)
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                      months.add(key)
                    })
                    return Array.from(months).sort().reverse().map(month => {
                      const [year, monthNum] = month.split('-')
                      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
                      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      return <option key={month} value={month}>{label}</option>
                    })
                  })()}
                </select>
                
                {/* Custom styled UI */}
                <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <span className="text-slate-700 truncate">
                    {paymentMonthFilter === 'all' 
                      ? 'All time' 
                      : (() => {
                          const [year, monthNum] = paymentMonthFilter.split('-')
                          const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
                          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        })()
                    }
                  </span>
                  <svg className="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Cards */}
          {(() => {
            const totalRecharged = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
            const lastPayment = payments.length > 0 ? payments[0] : null
            const walletBalance = billingData?.walletBalance || 0
            
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Recharge</p>
                      <p className="text-3xl font-extrabold text-slate-800 mt-2">${totalRecharged.toLocaleString('en-US')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Current Balance</p>
                      <p className="text-3xl font-extrabold text-emerald-700 mt-2">${walletBalance.toLocaleString('en-US')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M6 14h6m-6 4h12M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Last Recharge</p>
                      {lastPayment ? (
                        <>
                          <p className="text-2xl font-bold text-slate-800 mt-2">${lastPayment.amount?.toLocaleString('en-US')}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(lastPayment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </>
                      ) : (
                        <p className="text-2xl font-bold text-slate-300 mt-2">$0</p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Invoices List */}
          {(() => {
            // Filter payments by selected month
            const filteredPayments = paymentMonthFilter === 'all' 
              ? payments 
              : payments.filter(p => {
                  const d = new Date(p.paymentDate)
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                  return key === paymentMonthFilter
                })

            // Group by month using paymentDate field (consistent with backend)
            const grouped: Record<string, any[]> = {}
            filteredPayments.forEach((payment, idx) => {
              const date = new Date(payment.paymentDate)
              const monthKey = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
              if (!grouped[monthKey]) grouped[monthKey] = []
              payment._index = idx
              grouped[monthKey].push(payment)
            })

            const sortedMonths = Object.keys(grouped).sort((a, b) => {
              const dateA = new Date(grouped[a][0].paymentDate)
              const dateB = new Date(grouped[b][0].paymentDate)
              return dateB.getTime() - dateA.getTime()
            })

            if (loadingPayments) {
              return (
                <div className="flex justify-center py-16 bg-white/40 rounded-3xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-slate-500 text-sm">Fetching premium invoice data...</span>
                  </div>
                </div>
              )
            }

            if (filteredPayments.length === 0) {
              return (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                  <div className="text-slate-400 flex flex-col items-center gap-3">
                    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p className="font-medium">No invoices for this period</p>
                    <p className="text-xs">Select another month from filter</p>
                  </div>
                </div>
              )
            }

            return (
              <div className="overflow-x-auto">
                <div className="space-y-7 min-w-full">
                  {sortedMonths.map(monthKey => {
                    const monthPayments = grouped[monthKey]
                    return (
                      <div key={monthKey}>
                        {/* Month Header */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{monthKey}</h3>
                          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                          <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">
                            {monthPayments.length} receipt{monthPayments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Invoice Cards */}
                        <div className="space-y-3">
                          {monthPayments.map((payment: any, idx: number) => {
                            const paymentDate = new Date(payment.paymentDate)
                            const amount = payment.amount?.toLocaleString('en-US') || '0'
                            
                            // Generate invoice number
                            const invoiceYear = paymentDate.getFullYear()
                            const invoiceMonth = String(paymentDate.getMonth() + 1).padStart(2, '0')
                            const invoiceNum = String((payments.length - payments.indexOf(payment)) || idx + 1).padStart(4, '0')
                            const invoiceNumber = `INV-${invoiceYear}${invoiceMonth}${invoiceNum}`
                            

                            // Extract data using helper functions from enhanced rawData
                            const raw = payment.rawData || {}
                            const method = normalizeMethod(raw.method || payment.method)
                            const provider = getProviderLabel(raw)
                            const authType = raw.authType || raw.auth_type || null
                            const cardNetwork = raw.card?.network || null
                            const email = raw.email || "-"
                            const contact = raw.contact || "-"
                            const formattedDate = formatPaymentDate(payment.paymentDate)
                            const shortPaymentId = payment.paymentId?.length > 14 
                              ? payment.paymentId.slice(0, 12) + '...' 
                              : payment.paymentId || 'N/A'

                            return (
                              <div 
                                key={payment.id || idx}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 px-5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5"
                              >
                                {/* LEFT: Icon + Invoice ID + Paid Badge */}
                                <div className="flex items-center gap-3 min-w-[180px] w-full sm:w-auto">
                                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="font-semibold text-slate-800 text-sm truncate">{invoiceNumber}</span>
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full mr-1"></span>
                                        Paid
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* MIDDLE: Date + Payment Method + Auth Type */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 text-slate-700 text-sm bg-slate-50 px-3 py-1.5 rounded-full">
                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span className="font-medium text-xs">{formattedDate}</span>
                                  </div>
                                  <div className="bg-blue-50 rounded-full px-3 py-1.5 text-xs font-medium text-blue-700">
                                    {method}
                                  </div>
                                  {method === "Auto Debit (eMandate)" && authType && (
                                    <div className="bg-green-50 rounded-full px-3 py-1.5 text-xs font-medium text-green-700">
                                      {authType}
                                    </div>
                                  )}
                                </div>
                                
                                {/* RIGHT: Amount + Download Button */}
                                <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[160px] w-full sm:w-auto">
                                  <div className="text-right">
                                    <div className="text-xl font-extrabold text-slate-800 tracking-tight">${amount}</div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadReceipt(payment)}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 transition-all border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 hover:scale-95"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 10v6m0 0l-3-3m3 3l3-3M4 4h16v16H4z"/>
                                    </svg>
                                    PDF
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
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

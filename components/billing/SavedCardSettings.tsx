"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2,
  Shield,
  AlertCircle
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any
  }
}

interface SavedCardSettingsProps {
  companyId: string
}

interface SavedCard {
  last4: string | null
  network: string | null
  type: string | null
  issuer: string | null
  tokenCreatedAt: string | null
}

export default function SavedCardSettings({ companyId }: SavedCardSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [hasSavedCard, setHasSavedCard] = useState(false)
  const [card, setCard] = useState<SavedCard | null>(null)
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  
  const [addingCard, setAddingCard] = useState(false)
  const [removingCard, setRemovingCard] = useState(false)
  const [togglingAutoRecharge, setTogglingAutoRecharge] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Load saved card data on mount
  useEffect(() => {
    if (companyId) {
      loadSavedCard()
    }
  }, [companyId])

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const loadSavedCard = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/billing/saved-card', {
        method: 'GET',
        credentials: 'include'
      })
      
      const data = await res.json()
      
      if (data.ok) {
        setHasSavedCard(data.hasSavedCard)
        setCard(data.card)
        setAutoRechargeEnabled(data.autoRechargeEnabled)
        setCustomerId(data.customerId)
      }
    } catch (error) {
      console.error('Failed to load saved card:', error)
      showFeedback('error', 'Failed to load saved card')
    } finally {
      setLoading(false)
    }
  }

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleAddCard = async () => {
    try {
      setAddingCard(true)
      
      // 1. Create authorization order
      const res = await fetch('/api/billing/authorize-card', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await res.json()
      
      if (!data.ok) {
        showFeedback('error', data.error || 'Failed to initiate card authorization')
        return
      }

      // 2. Open Razorpay Checkout
      const options = {
        ...data.checkoutOptions,
        handler: async function (response: any) {
          // 3. Verify payment and save token
          try {
            const verifyRes = await fetch('/api/billing/authorize-card', {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            })
            
            const verifyData = await verifyRes.json()
            
            if (verifyData.ok) {
              showFeedback('success', 'Card saved successfully for auto-recharge!')
              await loadSavedCard()
            } else {
              showFeedback('error', verifyData.error || 'Failed to save card')
            }
          } catch (error) {
            console.error('Failed to verify payment:', error)
            showFeedback('error', 'Failed to verify card authorization')
          }
        },
        modal: {
          ondismiss: function() {
            setAddingCard(false)
          }
        }
      }

      if (typeof window !== 'undefined' && window.Razorpay) {
        const razorpay = new window.Razorpay(options)
        razorpay.open()
      } else {
        showFeedback('error', 'Payment system not loaded. Please refresh the page.')
      }
      
    } catch (error) {
      console.error('Failed to add card:', error)
      showFeedback('error', 'Failed to add card')
    } finally {
      setAddingCard(false)
    }
  }

  const handleRemoveCard = async () => {
    try {
      setRemovingCard(true)
      setShowRemoveDialog(false)
      
      const res = await fetch('/api/billing/saved-card', {
        method: 'DELETE',
        credentials: 'include'
      })
      
      const data = await res.json()
      
      if (data.ok) {
        showFeedback('success', 'Card removed successfully')
        setHasSavedCard(false)
        setCard(null)
        setAutoRechargeEnabled(false)
      } else {
        showFeedback('error', data.error || 'Failed to remove card')
      }
    } catch (error) {
      console.error('Failed to remove card:', error)
      showFeedback('error', 'Failed to remove card')
    } finally {
      setRemovingCard(false)
    }
  }

  const handleToggleAutoRecharge = async (enabled: boolean) => {
    if (!hasSavedCard && enabled) {
      showFeedback('error', 'Please add a card first to enable auto-recharge')
      return
    }

    try {
      setTogglingAutoRecharge(true)
      
      const res = await fetch('/api/billing/auto-recharge-settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auto_recharge_enabled: enabled,
          auto_recharge_amount: 2,
          auto_recharge_threshold: 50
        })
      })
      
      const data = await res.json()
      
      if (data.ok) {
        setAutoRechargeEnabled(enabled)
        showFeedback('success', `Auto-recharge ${enabled ? 'enabled' : 'disabled'}`)
      } else {
        showFeedback('error', data.error || 'Failed to update auto-recharge')
      }
    } catch (error) {
      console.error('Failed to toggle auto-recharge:', error)
      showFeedback('error', 'Failed to update auto-recharge')
    } finally {
      setTogglingAutoRecharge(false)
    }
  }

  const getCardIcon = (network: string | null) => {
    // Return appropriate styling based on card network
    const networkLower = (network || '').toLowerCase()
    if (networkLower.includes('visa')) {
      return 'text-blue-600'
    } else if (networkLower.includes('master')) {
      return 'text-orange-600'
    } else if (networkLower.includes('rupay')) {
      return 'text-green-600'
    }
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <Card className="border rounded-lg shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">Saved Payment Method</CardTitle>
          </div>
          <CardDescription>Manage your saved card for auto-recharge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-lg">Saved Payment Method</CardTitle>
        </div>
        <CardDescription>Manage your saved card for auto-recharge</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feedback Message */}
        {feedback && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            feedback.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Saved Card Display */}
        {hasSavedCard && card ? (
          <div className="space-y-4">
            {/* Card Visual */}
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg max-w-sm">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-2">
                  <CreditCard className={`h-8 w-8 ${getCardIcon(card.network)}`} />
                  <span className="text-sm font-medium opacity-80">
                    {card.network || 'Card'}
                  </span>
                </div>
                <Badge className="bg-emerald-500 text-white border-0">
                  Saved
                </Badge>
              </div>
              
              <div className="mb-4">
                <p className="text-xl tracking-widest font-mono">
                  •••• •••• •••• {card.last4 || '****'}
                </p>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs opacity-60 uppercase">Card Type</p>
                  <p className="text-sm font-medium capitalize">
                    {card.type || 'Credit/Debit'}
                  </p>
                </div>
                {card.issuer && (
                  <div className="text-right">
                    <p className="text-xs opacity-60 uppercase">Issuer</p>
                    <p className="text-sm font-medium">{card.issuer}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Recharge Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label className="text-sm font-medium">Enable Auto-Recharge</Label>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically recharge wallet when balance is low
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRechargeEnabled}
                  disabled={togglingAutoRecharge}
                  onCheckedChange={handleToggleAutoRecharge}
                />
                {togglingAutoRecharge && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Auto-Recharge Status</span>
              </div>
              <Badge 
                className={`${
                  autoRechargeEnabled 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {autoRechargeEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            {/* Remove Card Button */}
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowRemoveDialog(true)}
              disabled={removingCard}
            >
              {removingCard ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Card
            </Button>
          </div>
        ) : (
          /* No Card - Add Card UI */
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <CreditCard className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Card Saved</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Add a card to enable automatic wallet recharge when your balance is low
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAddCard}
                disabled={addingCard}
              >
                {addingCard ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Card
              </Button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">How it works</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                    <li>A small authorization charge of ₹1 will be made to verify your card</li>
                    <li>Your card will be saved securely for future auto-recharge payments</li>
                    <li>You can remove your card at any time</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Remove Card Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Saved Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your saved card and disable auto-recharge. 
              You can add a new card anytime to re-enable auto-recharge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRemoveCard}
            >
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

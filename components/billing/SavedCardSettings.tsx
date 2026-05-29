"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
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

interface SavedCardSettingsProps {
  companyId: string
}

interface SavedCard {
  last4: string | null
  network: string | null
  type: string | null
  savedAt: string | null
}

export default function SavedCardSettings({ companyId }: SavedCardSettingsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hasSavedCard, setHasSavedCard] = useState(false)
  const [card, setCard] = useState<SavedCard | null>(null)
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false)

  const [addingCard, setAddingCard] = useState(false)
  const [removingCard, setRemovingCard] = useState(false)
  const [togglingAutoRecharge, setTogglingAutoRecharge] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const showFeedback = useCallback((type: "success" | "error", message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }, [])

  const loadSavedCard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/billing/stripe/saved-card", { credentials: "include" })
      const data = await res.json()
      if (data.ok) {
        setHasSavedCard(data.hasSavedCard)
        setCard(data.card)
        setAutoRechargeEnabled(data.autoRechargeEnabled)
      }
    } catch {
      showFeedback("error", "Failed to load saved card")
    } finally {
      setLoading(false)
    }
  }, [showFeedback])

  // On mount: load card info
  useEffect(() => {
    if (companyId) loadSavedCard()
  }, [companyId, loadSavedCard])

  // Handle return from Stripe Checkout (setup mode)
  useEffect(() => {
    const cardSaved = searchParams.get("stripe_card_saved")
    const sessionId = searchParams.get("session_id")

    if (cardSaved === "1" && sessionId) {
      // Confirm and persist the card from the Checkout Session
      ;(async () => {
        try {
          setLoading(true)
          const res = await fetch("/api/billing/stripe/saved-card", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          })
          const data = await res.json()
          if (data.ok) {
            showFeedback("success", "Card saved successfully for auto-recharge!")
            await loadSavedCard()
          } else {
            showFeedback("error", data.error || "Failed to save card")
          }
        } catch {
          showFeedback("error", "Failed to confirm card setup")
        } finally {
          setLoading(false)
          // Remove query params from URL (clean up)
          const url = new URL(window.location.href)
          url.searchParams.delete("stripe_card_saved")
          url.searchParams.delete("session_id")
          router.replace(url.pathname + url.search, { scroll: false })
        }
      })()
    }

    if (searchParams.get("stripe_card_cancel") === "1") {
      showFeedback("error", "Card setup was cancelled")
      const url = new URL(window.location.href)
      url.searchParams.delete("stripe_card_cancel")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddCard = async () => {
    try {
      setAddingCard(true)
      const res = await fetch("/api/billing/stripe/setup-intent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!data.ok || !data.url) {
        showFeedback("error", data.error || "Failed to start card setup")
        setAddingCard(false)
        return
      }
      // Redirect to Stripe hosted setup page
      window.location.href = data.url
    } catch {
      showFeedback("error", "Failed to start card setup")
      setAddingCard(false)
    }
  }

  const handleRemoveCard = async () => {
    try {
      setRemovingCard(true)
      setShowRemoveDialog(false)
      const res = await fetch("/api/billing/stripe/saved-card", {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data.ok) {
        showFeedback("success", "Card removed successfully")
        setHasSavedCard(false)
        setCard(null)
        setAutoRechargeEnabled(false)
      } else {
        showFeedback("error", data.error || "Failed to remove card")
      }
    } catch {
      showFeedback("error", "Failed to remove card")
    } finally {
      setRemovingCard(false)
    }
  }

  const handleToggleAutoRecharge = async (enabled: boolean) => {
    if (!hasSavedCard && enabled) {
      showFeedback("error", "Please add a card first to enable auto-recharge")
      return
    }
    try {
      setTogglingAutoRecharge(true)
      const res = await fetch("/api/billing/auto-recharge-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_recharge_enabled: enabled,
          auto_recharge_amount: 2,
          auto_recharge_threshold: 50,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setAutoRechargeEnabled(enabled)
        showFeedback("success", `Auto-recharge ${enabled ? "enabled" : "disabled"}`)
      } else {
        showFeedback("error", data.error || "Failed to update auto-recharge")
      }
    } catch {
      showFeedback("error", "Failed to update auto-recharge")
    } finally {
      setTogglingAutoRecharge(false)
    }
  }

  const getNetworkColor = (network: string | null) => {
    const n = (network || "").toLowerCase()
    if (n.includes("visa")) return "text-blue-600"
    if (n.includes("master")) return "text-orange-600"
    if (n.includes("amex")) return "text-green-700"
    return "text-gray-600"
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
        <CardContent>
          <div className="space-y-3 py-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
            <div className="h-8 bg-gray-100 rounded-full animate-pulse w-32 mt-4" />
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
      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              feedback.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        {hasSavedCard && card ? (
          <div className="space-y-4">
            {/* Card Visual */}
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 text-white shadow-lg w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className={`h-5 w-5 sm:h-6 sm:w-6 ${getNetworkColor(card.network)}`} />
                  <span className="text-xs sm:text-sm font-medium opacity-80 capitalize">
                    {card.network || "Card"}
                  </span>
                </div>
                <Badge className="bg-emerald-500 text-white border-0 text-xs">Saved</Badge>
              </div>
              <p className="text-sm sm:text-base tracking-widest font-mono mb-4 break-words">
                •••• •••• •••• {card.last4 || "****"}
              </p>
              <div className="grid grid-cols-2 sm:flex sm:justify-between sm:items-end gap-4">
                <div>
                  <p className="text-xs opacity-60 uppercase">Card Type</p>
                  <p className="text-xs sm:text-sm font-medium capitalize">{card.type || "Credit/Debit"}</p>
                </div>
                {card.savedAt && (
                  <div className="text-right">
                    <p className="text-xs opacity-60 uppercase">Saved</p>
                    <p className="text-xs sm:text-sm font-medium">
                      {new Date(card.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Recharge Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 py-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 flex-wrap">
                <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-sm font-medium">Auto-Recharge</span>
                <Badge
                  className={`text-xs ${autoRechargeEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {autoRechargeEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRechargeEnabled}
                  disabled={togglingAutoRecharge}
                  onCheckedChange={handleToggleAutoRecharge}
                />
                {togglingAutoRecharge && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
            </div>

            {/* Remove Card */}
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-sm sm:text-base"
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
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <CreditCard className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1 text-center">No Card Saved</h3>
              <p className="text-xs text-gray-600 text-center mb-4 max-w-xs">
                Add a card to enable automatic wallet recharge
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base w-full sm:w-auto"
                onClick={handleAddCard}
                disabled={addingCard}
                size="sm"
              >
                {addingCard ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {addingCard ? "Redirecting to Stripe..." : "Add Card"}
              </Button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-800">How it works</p>
                  <ul className="text-xs text-amber-700 mt-2 space-y-1.5 list-disc list-inside">
                    <li>Securely saved via Stripe — no card details stored on our servers</li>
                    <li>Auto-charges when wallet balance falls below threshold</li>
                    <li>Remove card anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Saved Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your saved card and disable auto-recharge. You can add a new card
              anytime to re-enable it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleRemoveCard}>
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

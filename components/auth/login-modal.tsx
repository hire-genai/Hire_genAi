"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { X, RefreshCw } from "lucide-react"

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { setAuthSession } = useAuth() as any
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])


  useEffect(() => {
    if (!open) {
      setStep("email")
      setEmail("")
      setOtp("")
      setCountdown(0)
    }
  }, [open])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send OTP")
      }
            setStep("otp")
      setCountdown(30)
    } catch (err: any) {
      toast({ title: "Login error", description: err?.message || "Failed to send OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/otp/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to verify OTP")
      }
      if (data.user && data.company) {
        setAuthSession(data.user, data.company)
      }
      toast({ title: "Welcome back!", description: "Login successful" })
      onClose()
      // ensure state commit is observed
      await Promise.resolve()
      router.push("/dashboard")
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to verify OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to resend OTP")
      toast({ title: "OTP resent", description: "Use the latest code" })
      setCountdown(30)
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to resend OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">Sign in</DialogTitle>
          <DialogDescription className="text-slate-600">
            Enter your email to receive a one-time password
          </DialogDescription>
        </div>

        {/* Sign In Form */}
        <div className="px-6 pb-6">
            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" 
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-slate-700">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-center font-mono tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" 
                  disabled={loading || otp.length < 4}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign in"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={handleResend} 
                  disabled={loading || countdown > 0}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-slate-700"
                  onClick={() => setStep("email")}
                >
                  ← Back to email
                </Button>
              </form>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

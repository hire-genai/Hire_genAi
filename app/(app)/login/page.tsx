"use client"

export const dynamic = 'force-dynamic';

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { setAuthSession, user, loading: authLoading } = useAuth() as any
  const router = useRouter()
  const { toast } = useToast()
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null)

  // Check for session expired message
  useEffect(() => {
    const msg = sessionStorage.getItem('sessionExpiredMessage')
    if (msg) {
      setSessionExpiredMsg(msg)
      sessionStorage.removeItem('sessionExpiredMessage')
    }
  }, [])

  // Helper to get redirect destination after login
  const getPostLoginRedirect = () => {
    const postLoginRedirect = localStorage.getItem('postLoginRedirect')
    if (postLoginRedirect) {
      localStorage.removeItem('postLoginRedirect')
      return postLoginRedirect
    }
    return '/dashboard'
  }

  useEffect(() => {
    if (!authLoading && user) {
      router.push(getPostLoginRedirect())
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])


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
      // ensure state commit is observed
      await Promise.resolve()
      router.push(getPostLoginRedirect())
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


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Session Expired Message */}
      {sessionExpiredMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{sessionExpiredMsg}</span>
            <button 
              onClick={() => setSessionExpiredMsg(null)}
              className="ml-2 text-amber-600 hover:text-amber-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <Card className="w-full max-w-md shadow-sm border-0">
        {/* Header */}
        <CardHeader className="text-center pb-2">
          <Link href="/">
            <CardTitle className="text-3xl font-bold mb-2 flex items-center justify-center gap-1">
              <Home className="h-6 w-6 text-slate-500 hover:text-emerald-600 transition-colors" />
              <span className="text-slate-800">Hire</span>
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">GenAI</span>
            </CardTitle>
          </Link>
          <CardDescription className="text-slate-600">
            Enter your email to receive a one-time password
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-3">
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
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-center font-mono tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                      maxLength={6}
                      required
                      disabled={loading}
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

          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Don't have an account?{" "}
              <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

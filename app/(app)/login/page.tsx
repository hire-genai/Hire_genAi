"use client"

export const dynamic = 'force-dynamic';

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw } from "lucide-react"
import Link from "next/link"

const darkPage: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03110A', padding: '16px' }
const card: React.CSSProperties = { width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.25)', borderRadius: '20px', padding: '40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }
const inputStyle: React.CSSProperties = { width: '100%', height: '44px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '0 14px', outline: 'none', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }
const btnPrimary: React.CSSProperties = { width: '100%', height: '44px', background: 'linear-gradient(135deg,#00B14F,#00C853)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
const btnOutline: React.CSSProperties = { width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { width: '100%', height: '38px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '14px', cursor: 'pointer' }

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { setAuthSession, user, loading: authLoading } = useAuth() as any
  const router = useRouter()
  const { toast } = useToast()

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
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to send OTP")
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
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to verify OTP")
      if (data.user && data.company) {
        setAuthSession(data.user, data.company)
      }
      toast({ title: "Welcome back!", description: "Login successful" })
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

  if (authLoading || user) {
    return (
      <div style={darkPage}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(0,177,79,0.3)', borderTopColor: '#00B14F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{user ? 'Redirecting to dashboard...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={darkPage}>
      <div style={card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '26px', fontWeight: 800 }}>
              <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#00B14F,#00C853)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚡</div>
              <span><span style={{ color: '#fff' }}>Hire-</span><span style={{ color: '#00B14F' }}>GenAI</span></span>
            </div>
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginTop: '8px' }}>Enter your email to receive a one-time password</p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={inputStyle}
                required
              />
            </div>
            <button type="submit" style={{ ...btnPrimary, opacity: loading || !email ? 0.6 : 1, cursor: loading || !email ? 'not-allowed' : 'pointer' }} disabled={loading || !email}>
              {loading ? <><RefreshCw style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> Sending OTP...</> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Enter OTP</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                style={{ ...inputStyle, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.3em', fontSize: '20px' }}
                maxLength={6}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" style={{ ...btnPrimary, opacity: loading || otp.length < 4 ? 0.6 : 1, cursor: loading || otp.length < 4 ? 'not-allowed' : 'pointer' }} disabled={loading || otp.length < 4}>
              {loading ? <><RefreshCw style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> Verifying...</> : 'Verify & Sign in'}
            </button>
            <button type="button" style={{ ...btnOutline, opacity: loading || countdown > 0 ? 0.5 : 1 }} onClick={handleResend} disabled={loading || countdown > 0}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
            <button type="button" style={btnGhost} onClick={() => setStep("email")}>
              ← Back to email
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: '#00B14F', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

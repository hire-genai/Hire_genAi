"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { MockAuthService } from "@/lib/mock-auth"
import { RoleManagementService, UserRole } from "@/lib/role-management-service"
import { SessionManager } from "@/utils/session"

interface User {
  id: string
  email: string
  full_name: string
  status: string
  phone?: string
  timezone?: string
  role?: "admin" | "interviewer" | "ai_recruiter" | "recruiter" | "company_admin"
}

interface Company {
  id: string
  name: string
  status: string
  verified: boolean
  website?: string
  industry?: string
  size?: string
  description?: string
}

interface AuthContextType {
  user: User | null
  company: Company | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: { message: string } }>
  signInWithEmail: (email: string) => Promise<{ error?: { message: string } }>
  signUp: (
    email: string,
    password: string,
    companyName: string,
    fullName: string,
  ) => Promise<{ error?: { message: string } }>
  signOut: () => Promise<void>
  setAuthSession: (user: User, company: Company) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  // Handle session expiry - logout and redirect
  const handleSessionExpiry = useCallback(() => {
    console.log("⏰ Session expired, logging out...")
    SessionManager.clearSession()
    setUser(null)
    setCompany(null)
    // Show expiry message and redirect
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sessionExpiredMessage', SessionManager.getExpiryMessage())
      window.location.replace('/login')
    }
  }, [])

  // Session timeout checker
  useEffect(() => {
    if (!user) return

    // Check session validity every minute
    const checkSession = () => {
      if (!SessionManager.isSessionValid()) {
        handleSessionExpiry()
      }
    }

    const intervalId = setInterval(checkSession, 60 * 1000) // Check every minute
    
    // Also check immediately
    checkSession()

    return () => clearInterval(intervalId)
  }, [user, handleSessionExpiry])

  // Activity-based session extension
  useEffect(() => {
    if (!user) return

    let lastActivityTime = Date.now()
    const ACTIVITY_THROTTLE_MS = 30 * 1000 // Only extend session every 30 seconds max

    const handleActivity = () => {
      const now = Date.now()
      // Throttle to avoid too many localStorage writes
      if (now - lastActivityTime > ACTIVITY_THROTTLE_MS) {
        lastActivityTime = now
        SessionManager.extendSession()
      }
    }

    // Activity events to track
    const activityEvents = ['mousemove', 'click', 'keypress', 'scroll', 'touchstart']
    
    // Add listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Extend session on API calls (via fetch interceptor)
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      handleActivity()
      return originalFetch.apply(window, args)
    }

    return () => {
      // Remove listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      // Restore original fetch
      window.fetch = originalFetch
    }
  }, [user])

  useEffect(() => {
    // Initialize the auth system
    const initAuth = async () => {
      try {
        console.log("🔄 Initializing auth system...")

        // Check if session has expired
        if (!SessionManager.isSessionValid() && SessionManager.getRemainingTime() === 0 && localStorage.getItem('mockAuth')) {
          console.log("⏰ Session expired on init, clearing...")
          SessionManager.clearSession()
          MockAuthService.signOut()
          setLoading(false)
          return
        }

        // Initialize mock users and storage
        MockAuthService.initializeUsers()

        // Check if we should skip session restoration (e.g., on homepage)
        const skipSessionRestore = sessionStorage.getItem('skipAuthRestore') === 'true'
        
        if (!skipSessionRestore) {
          // Check for existing session
          const session = MockAuthService.getSession()
          if (session.data.session?.user) {
            const currentUser = MockAuthService.getCurrentUser()
            if (currentUser) {
              // Convert mock format to new format
              const newUser: User = {
                id: currentUser.user.id,
                email: currentUser.user.email,
                full_name: currentUser.user.name,
                status: 'active',
                // Get phone and timezone from stored session
                phone: currentUser.user.phone || '',
                timezone: currentUser.user.timezone || 'UTC',
                role: currentUser.user.role as any // Preserve the role from mock auth
              }
              const newCompany: Company = {
                id: currentUser.company.id,
                name: currentUser.company.name,
                status: 'active',
                verified: false
              }
              setUser(newUser)
              setCompany(newCompany)
              console.log("✅ Restored session for:", currentUser.user.email)

              // Sync user+company to database on session restore
              try {
                await fetch('/api/auth/sync-company', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    company: currentUser.company,
                    user: { id: currentUser.user.id, email: currentUser.user.email, name: currentUser.user.name, role: currentUser.user.role }
                  })
                })
              } catch (syncErr) {
                console.warn("⚠️ Failed to sync session to DB:", syncErr)
              }

              // Fetch real role from database to override cached mock role
              try {
                const profileRes = await fetch(`/api/settings/profile?email=${encodeURIComponent(currentUser.user.email)}`)
                const profileData = await profileRes.json()
                if (profileData.user?.role) {
                  console.log("🔄 Syncing role from DB:", profileData.user.role)
                  setUser(prev => prev ? { ...prev, role: profileData.user.role } : prev)
                  // Also update mock auth so it persists across refreshes
                  MockAuthService.setSessionFromServer(
                    { ...currentUser.user, role: profileData.user.role },
                    currentUser.company
                  )
                }
              } catch (e) {
                console.log("⚠️ Could not sync role from DB:", e)
              }
            }
          } else {
            console.log("ℹ️ No existing session found")
          }
        } else {
          console.log("ℹ️ Session restore skipped")
          sessionStorage.removeItem('skipAuthRestore')
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])



  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const result = await MockAuthService.signIn(email, password)
      if (result.error) {
        return { error: result.error }
      }
      const currentUser = MockAuthService.getCurrentUser()
      if (currentUser) {
        // Convert mock format to new format
        const newUser: User = {
          id: currentUser.user.id,
          email: currentUser.user.email,
          full_name: currentUser.user.name,
          status: 'active',
          phone: undefined,
          timezone: 'UTC',
          role: currentUser.user.role as any // Preserve the role from mock auth
        }
        const newCompany: Company = {
          id: currentUser.company.id,
          name: currentUser.company.name,
          status: 'active',
          verified: false
        }
        setUser(newUser)
        setCompany(newCompany)
        // Start session timer
        SessionManager.startSession()
      }
      return {}
    } catch (error) {
      return { error: { message: "An unexpected error occurred" } }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, companyName: string, fullName: string) => {
    try {
      setLoading(true)
      console.log("📝 Signing up user:", email)

      const result = await MockAuthService.signUp(email, password, companyName, fullName)

      if (result.error) {
        console.log("❌ Sign up failed:", result.error.message)
        return { error: result.error }
      }

      if (result.data.user) {
        const currentUser = MockAuthService.getCurrentUser()
        if (currentUser) {
          const newUser: User = {
            id: currentUser.user.id,
            email: currentUser.user.email,
            full_name: currentUser.user.name,
            status: 'active',
            phone: undefined,
            timezone: 'UTC',
            role: currentUser.user.role as any // Preserve the role from mock auth
          }
          const newCompany: Company = {
            id: currentUser.company.id,
            name: currentUser.company.name,
            status: 'active',
            verified: false
          }
          setUser(newUser)
          setCompany(newCompany)
          // Start session timer
          SessionManager.startSession()
          console.log("✅ Sign up successful for:", currentUser.user.email)
        }
      }

      return {}
    } catch (error) {
      console.error("❌ Sign up error:", error)
      return { error: { message: "An unexpected error occurred" } }
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string) => {
    try {
      setLoading(true)
      const result = await MockAuthService.signInWithEmail(email)
      if (result.error) {
        return { error: result.error }
      }
      const currentUser = MockAuthService.getCurrentUser()
      if (currentUser) {
        // Convert mock format to new format
        const newUser: User = {
          id: currentUser.user.id,
          email: currentUser.user.email,
          full_name: currentUser.user.name,
          status: 'active',
          phone: undefined,
          timezone: 'UTC',
          role: currentUser.user.role as any // Preserve the role from mock auth
        }
        const newCompany: Company = {
          id: currentUser.company.id,
          name: currentUser.company.name,
          status: 'active',
          verified: false
        }
        setUser(newUser)
        setCompany(newCompany)
        // Start session timer
        SessionManager.startSession()
      }
      return {}
    } catch (error) {
      return { error: { message: "An unexpected error occurred" } }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log("🚪 Signing out user")

      await MockAuthService.signOut()
      // Clear session timer
      SessionManager.clearSession()
      setUser(null)
      setCompany(null)

      console.log("✅ Sign out successful")
    } catch (error) {
      console.error("❌ Sign out error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Allow setting session directly from server response (e.g., OTP verify)
  const setAuthSession = (userObj: User, companyObj: Company) => {
    try {
      // Convert new format to mock format for compatibility
      const mockUser = {
        id: userObj.id,
        email: userObj.email,
        name: userObj.full_name,
        role: userObj.role || 'admin' // Preserve the actual user role
      }
      const mockCompany = {
        id: companyObj.id,
        name: companyObj.name,
        slug: companyObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        industry: 'Technology',
        size: '1-10',
        website: ''
      }
      
      MockAuthService.setSessionFromServer(mockUser, mockCompany)
      setUser(userObj)
      setCompany(companyObj)
      // Start session timer
      SessionManager.startSession()
    } catch (e) {
      console.error("Failed to set auth session:", e)
    }
  }

  const value: AuthContextType = {
    user,
    company,
    loading,
    signIn,
    signInWithEmail,
    signUp,
    signOut,
    setAuthSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

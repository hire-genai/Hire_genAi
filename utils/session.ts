// Session management utility with 1-hour timeout

const SESSION_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour in milliseconds
const SESSION_KEY = 'sessionStartTime'
const SESSION_EXPIRY_KEY = 'sessionExpiresAt'

export const SessionManager = {
  // Start a new session with expiry timestamp
  startSession(): void {
    if (typeof window === 'undefined') return
    
    const now = Date.now()
    const expiresAt = now + SESSION_TIMEOUT_MS
    
    localStorage.setItem(SESSION_KEY, now.toString())
    localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt.toString())
  },

  // Check if session is still valid
  isSessionValid(): boolean {
    if (typeof window === 'undefined') return false
    
    const expiresAt = localStorage.getItem(SESSION_EXPIRY_KEY)
    if (!expiresAt) return false
    
    return Date.now() < parseInt(expiresAt, 10)
  },

  // Get remaining session time in milliseconds
  getRemainingTime(): number {
    if (typeof window === 'undefined') return 0
    
    const expiresAt = localStorage.getItem(SESSION_EXPIRY_KEY)
    if (!expiresAt) return 0
    
    const remaining = parseInt(expiresAt, 10) - Date.now()
    return remaining > 0 ? remaining : 0
  },

  // Clear session data
  clearSession(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_EXPIRY_KEY)
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('mockAuth')
    localStorage.removeItem('mockAuth_backup')
  },

  // Extend session (call on user activity)
  extendSession(): void {
    if (typeof window === 'undefined') return
    
    // Only extend if session exists and is valid
    if (this.isSessionValid()) {
      const now = Date.now()
      const expiresAt = now + SESSION_TIMEOUT_MS
      localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt.toString())
    }
  },

  // Get session expiry message
  getExpiryMessage(): string {
    return 'Session Expired. Please login again.'
  }
}

export default SessionManager

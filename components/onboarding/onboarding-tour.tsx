'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    const tourKey = `hasSeenOnboardingTour_${user.id}`
    if (localStorage.getItem(tourKey) === 'true') return

    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)

    const timer = setTimeout(() => setIsOpen(true), 600)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', check)
    }
  }, [user?.id])

  const handleClose = () => {
    if (user?.id) {
      localStorage.setItem(`hasSeenOnboardingTour_${user.id}`, 'true')
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="relative w-full"
        style={{ maxWidth: isMobile ? '380px' : 'min(900px, calc(100vw - 32px))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
          >
            <X className="h-3.5 w-3.5" />
            Skip
          </button>
        </div>

        {/* Demo iframe */}
        <div
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(0,177,79,0.35)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,177,79,0.25)',
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          {isMobile ? (
            <iframe
              src="https://app.storylane.io/demo/gf7pvswwwra6?embed=inline"
              name="sl-embed"
              allow="fullscreen"
              allowFullScreen
              style={{ display: 'block', width: '100%', height: 'min(560px, calc(100vh - 120px))', border: 'none' }}
              title="HireGenAI Product Demo"
            />
          ) : (
            <div style={{ position: 'relative', paddingBottom: 'min(calc(57.74% + 25px), calc(100vh - 120px))', width: '100%', height: 0 }}>
              <iframe
                src="https://app.storylane.io/demo/kx2z3fuhmzqd?embed=inline"
                name="sl-embed"
                allow="fullscreen"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                title="HireGenAI Product Demo"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

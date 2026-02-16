'use client'

import React from "react"
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { MobileMenuProvider } from '@/components/dashboard/mobile-menu-context'
import { DashboardLayoutContent } from '@/components/dashboard/layout-content'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Check if current page is candidate-report - if so, render without sidebar
  const isCandidateReportPage = pathname?.includes('/candidate-report')

  if (isCandidateReportPage) {
    // Render without sidebar for candidate report page
    return (
      <MobileMenuProvider>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </MobileMenuProvider>
    )
  }

  return (
    <MobileMenuProvider>
      <DashboardLayoutContent>
        <DashboardSidebar />
        <DashboardHeader />
        {children}
      </DashboardLayoutContent>
    </MobileMenuProvider>
  )
}

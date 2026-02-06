import React from "react"
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { MobileMenuProvider } from '@/components/dashboard/mobile-menu-context'
import { DashboardLayoutContent } from '@/components/dashboard/layout-content'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

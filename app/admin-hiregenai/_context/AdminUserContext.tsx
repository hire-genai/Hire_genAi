"use client"

import { createContext, useContext } from "react"

export interface AdminUser {
  role: string                       // 'admin' | 'support' | 'team' | 'unknown'
  assignedTabs: string[] | null      // null = full access
  assignedSupportTiers: string[] | null  // null = all tiers; only relevant for support/feedback tabs
}

export const AdminUserContext = createContext<AdminUser>({
  role: "unknown",
  assignedTabs: null,
  assignedSupportTiers: null,
})

export function useAdminUser(): AdminUser {
  return useContext(AdminUserContext)
}

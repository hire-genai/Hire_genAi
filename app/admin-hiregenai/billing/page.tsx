"use client"

import { useState } from "react"
import BillingTab from "@/app/admin-hiregenai/_components/BillingTab"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"

export const dynamic = 'force-dynamic';


export default function BillingPage() {
  const [fetchFn, setFetchFn] = useState<((start: string, end: string) => void) | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Usage</h1>
          <p className="text-slate-400">Track all usage and costs in real-time</p>
        </div>
        {fetchFn && (
          <DashboardDateFilter onApply={fetchFn} defaultPreset="last90Days" />
        )}
      </div>
      <BillingTab onReady={(fn) => setFetchFn(() => fn)} />
    </div>
  )
}

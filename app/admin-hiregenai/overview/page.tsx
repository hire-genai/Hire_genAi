"use client"

import { useState } from "react"
import OverviewTab from "@/app/admin-hiregenai/_components/OverviewTab"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  const [fetchData, setFetchData] = useState<((start: string, end: string) => void) | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Overview</h1>
          <p className="text-slate-400">Executive summary of your platform</p>
        </div>
        {fetchData && (
          <DashboardDateFilter onApply={fetchData} defaultPreset="last90Days" />
        )}
      </div>
      <OverviewTab onReady={(fn) => setFetchData(() => fn)} />
    </div>
  )
}

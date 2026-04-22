"use client"

import { useState, useCallback, useRef } from "react"
import CompaniesTab from "@/app/admin-hiregenai/_components/CompaniesTab"
import DashboardDateFilter from "@/components/filters/DashboardDateFilter"

export const dynamic = 'force-dynamic';

export default function CompaniesPage() {
  const [fetchData, setFetchData] = useState<((start: string, end: string) => void) | null>(null)
  const fetchDataRef = useRef<((start: string, end: string) => void) | null>(null)

  const handleReady = useCallback((fn: (start: string, end: string) => void) => {
    fetchDataRef.current = fn
    setFetchData(() => fn)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Companies</h1>
          <p className="text-slate-400">Manage all companies and their billing</p>
        </div>
        {fetchData && (
          <DashboardDateFilter onApply={fetchData} defaultPreset="last90Days" />
        )}
      </div>
      <CompaniesTab onReady={handleReady} />
    </div>
  )
}

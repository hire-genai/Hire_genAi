"use client"

import SettingsTab from "@/app/admin-hiregenai/_components/SettingsTab"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Configure system settings and admin preferences</p>
      </div>

      <SettingsTab />
    </div>
  )
}

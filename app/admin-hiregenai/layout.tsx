"use client"

export const dynamic = 'force-dynamic';

import { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BarChart3,
  Briefcase,
  Users,
  DollarSign,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Headphones,
  Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "companies", label: "Companies", icon: Users },
  { id: "billing", label: "Billing & Usage", icon: DollarSign },
  { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
  { id: "customer-interaction", label: "Customer Interaction", icon: MessageCircle },
  { id: "support-centre", label: "Support Centre", icon: Headphones },
  { id: "product-feedback", label: "Product Feedback", icon: Lightbulb },
  { id: "settings", label: "Settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentTab = pathname.split("/").pop() || "overview"

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout-direct", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }
    router.push("/owner-login")
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth-check-direct")
        if (!res.ok) {
          router.push("/owner-login")
          return
        }
        setAuthenticated(true)
        setLoading(false)

      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/owner-login")
      }
    }

    checkAuth()
  }, [router, pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 ${
          sidebarOpen ? "w-56" : "w-16"
        } bg-slate-900 border-r border-slate-800 transition-all duration-300 flex-col flex-shrink-0 h-screen overflow-y-auto z-10`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">HireGenAI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Nav Items - Scrollable */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(`/admin-hiregenai/${item.id}`)
                }}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/50 border border-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-emerald-400 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                {sidebarOpen && (
                  <span className="text-sm">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer - Always visible at bottom */}
        <div className="px-2 py-2 border-t border-slate-800 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-white border-emerald-600 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {sidebarOpen && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 z-50 md:hidden transform transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        {/* Mobile Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold">HireGenAI</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Nav Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(`/admin-hiregenai/${item.id}`)
                  setMobileMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/50 border border-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-emerald-400 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                <span className="text-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Mobile Footer */}
        <div className="p-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 transition-all duration-300 ${
        sidebarOpen ? "md:ml-56" : "md:ml-16"
      }`}>
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold">HireGenAI</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}

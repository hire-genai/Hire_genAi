'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Plus,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  HeadphonesIcon,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMobileMenu } from './mobile-menu-context'
import { useAuth } from '@/contexts/auth-context'

const navigationItems = [
  {
    title: 'MAIN',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Applications', href: '/candidate', icon: Users, badge: 12 },
      { name: 'Job Postings', href: '/jobs', icon: Briefcase },
      { name: 'Talent Pool', href: '/talent-pool', icon: Users, badge: 12 },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { name: 'Messages', href: '/messages', icon: MessageSquare },
      { name: 'Delegation', href: '/delegation', icon: UserCog },
      { name: 'Support', href: '/support', icon: HeadphonesIcon },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { isMobileOpen, setIsMobileOpen, isCollapsed, setIsCollapsed } = useMobileMenu()
  const { user, signOut } = useAuth()

  const userName = user?.full_name || 'User'
  const userEmail = user?.email || ''
  const userRole = user?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Member'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 text-gray-900 z-40 overflow-y-auto overflow-x-hidden shadow-sm transition-all duration-300 flex flex-col",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-gray-300",
        isCollapsed ? "w-14" : "w-48",
        "lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          {isCollapsed ? (
            // Collapsed state - center the menu icon
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-7 w-7"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title="Expand Sidebar"
              >
                <Menu className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            // Expanded state - show logo and buttons
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span className="text-base font-bold">
                  <span className="text-slate-800">Hire</span>
                  <span className="text-emerald-600">GenAI</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:block text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-7 w-7"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-7 w-7"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Mobile close button for collapsed state - positioned below menu icon */}
          {isCollapsed && (
            <div className="flex justify-center mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-7 w-7"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* User Profile */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg mt-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-[10px] flex-shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs truncate leading-tight">{userName}</h4>
                <p className="text-[10px] text-gray-500 truncate leading-tight">{userEmail}</p>
                <Badge className="mt-1 bg-emerald-100 hover:bg-emerald-100 text-emerald-700 text-[10px] px-1 py-0.5 leading-tight">
                  {userRole}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mt-3" title={userName}>
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-[10px]">
                {userInitials}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {navigationItems.map((section) => (
            <div key={section.title} className="mb-4">
              {!isCollapsed && (
                <h3 className="px-2 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={`w-full ${
                          isCollapsed ? 'justify-center' : 'justify-start'
                        } text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition-colors bg-transparent ${
                          isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-500' : 'border border-transparent'
                        } ${isCollapsed ? 'h-9' : 'h-8'} text-xs`}
                        size={isCollapsed ? "icon" : "sm"}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                        {!isCollapsed && <span className="ml-2 text-xs">{item.name}</span>}
                        {!isCollapsed && item.badge && (
                          <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] px-1 py-0.5">
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-200">
          {!isCollapsed ? (
            <Button
              variant="outline"
              className="w-full justify-start border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white text-xs h-8"
              onClick={async () => {
                if (confirm('Are you sure you want to logout?')) {
                  await signOut()
                  window.location.href = '/login'
                }
              }}
            >
              <LogOut className="w-3 h-3 mr-2" />
              Logout
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 mx-auto border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
              title="Logout"
              onClick={async () => {
                if (confirm('Are you sure you want to logout?')) {
                  await signOut()
                  window.location.href = '/login'
                }
              }}
            >
              <LogOut className="w-3 h-3" />
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}

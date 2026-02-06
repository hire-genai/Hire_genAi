'use client'

import React from "react"

import { useMobileMenu } from './mobile-menu-context'

export function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, setIsCollapsed } = useMobileMenu()
  
  const childrenArray = Array.isArray(children) ? children : [children]
  const [sidebar, header, ...content] = childrenArray
  
  const handleMainContentClick = () => {
    if (!isCollapsed) {
      setIsCollapsed(true)
    }
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebar}
      <main 
        className={`flex-1 ml-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-[56px]' : 'lg:ml-[192px]'}`}
        onClick={handleMainContentClick}
      >
        {header}
        <div className="p-3 md:p-6">
          {content}
        </div>
      </main>
    </div>
  )
}

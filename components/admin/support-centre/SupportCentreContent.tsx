"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, MessageCircle, ArrowRight, ArrowLeft, Eye, AlertCircle, Lightbulb, MessageSquare, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { StatCardGridLoader, SupportTableLoader } from '@/components/ui/skeleton-loader'

interface SupportStats {
  open: number
  inProgress: number
  resolvedToday: number
  total: number
}

interface Ticket {
  id: string
  title: string
  ticketType: string
  category: string
  priority: string
  status: string
  companyName: string
  createdByName: string
  createdAt: string
}

interface SupportCentreContentProps {
  showBackButton?: boolean
  backButtonHref?: string
  backButtonLabel?: string
}

export default function SupportCentreContent({
  showBackButton = false,
  backButtonHref = "/admin-hiregenai/settings",
  backButtonLabel = "Back to Settings"
}: SupportCentreContentProps) {
  const [loadingSupport, setLoadingSupport] = useState(false)
  const [supportStats, setSupportStats] = useState<SupportStats>({ open: 0, inProgress: 0, resolvedToday: 0, total: 0 })
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchSupportData = useCallback(async () => {
    setLoadingSupport(true)
    try {
      const res = await fetch("/api/admin/support-overview")
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      if (data.ok) {
        setSupportStats(data.stats)
        setTickets(data.tickets?.filter((t: Ticket) => t.ticketType !== "feedback") || [])
      }
    } catch (err) {
      console.error("Support fetch error:", err)
    } finally {
      setLoadingSupport(false)
    }
  }, [])

  useEffect(() => {
    fetchSupportData()
  }, [fetchSupportData])

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdating(ticketId)
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, status: newStatus })
      })
      
      if (res.ok) {
        // Remove from UI if marked as resolved
        if (newStatus === "resolved" || newStatus === "closed") {
          setTickets(prev => prev.filter(t => t.id !== ticketId))
        } else {
          // Update the ticket in the list
          setTickets(prev => 
            prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
          )
        }
        fetchSupportData() // Refresh stats
      }
    } catch (err) {
      console.error("Update ticket error:", err)
    } finally {
      setUpdating(null)
    }
  }

  // Filter tickets by priority and status (show only active tickets)
  const filteredTickets = tickets.filter((t) => {
    const isActive = t.status === "open" || t.status === "in_progress" || t.status === "waiting"
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter
    return isActive && matchesPriority
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-900 text-red-200"
      case "high": return "bg-orange-900 text-orange-200"
      case "medium": return "bg-amber-900 text-amber-200"
      case "low": return "bg-blue-900 text-blue-200"
      default: return "bg-slate-700 text-slate-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-emerald-900 text-emerald-200"
      case "in_progress": return "bg-blue-900 text-blue-200"
      case "resolved": case "closed": return "bg-slate-700 text-slate-300"
      default: return "bg-slate-700 text-slate-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug": case "bug_report": return <AlertCircle className="h-4 w-4 text-red-400" />
      case "feature_request": return <Lightbulb className="h-4 w-4 text-amber-400" />
      case "question": return <MessageSquare className="h-4 w-4 text-blue-400" />
      default: return <MessageCircle className="h-4 w-4 text-slate-400" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "bug": case "bug_report": return "Bug Report"
      case "feature_request": return "Feature Request"
      case "question": return "Question"
      case "support": return "Support"
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-4">
      {showBackButton && (
        <div className="flex items-center gap-4">
          <Link href={backButtonHref}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backButtonLabel}
            </Button>
          </Link>
        </div>
      )}
      
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Support Centre</h1>
        <p className="text-slate-400">Manage customer support tickets and responses</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-4">
          {loadingSupport ? (
            <div className="space-y-4">
              {/* Action Card Skeleton */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <div className="h-5 w-5 bg-slate-700 animate-pulse rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-slate-700 animate-pulse rounded" />
                    <div className="h-3 w-56 bg-slate-700 animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-slate-700 animate-pulse rounded" />
              </div>

              {/* Stats Grid Skeleton */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-slate-700 animate-pulse rounded" />
                      <div className="h-6 w-8 bg-slate-700 animate-pulse rounded" />
                    </div>
                    <div className="h-3 w-12 bg-slate-700 animate-pulse rounded mt-1" />
                  </div>
                ))}
              </div>

              {/* Filter Header Skeleton */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-slate-700 animate-pulse rounded" />
                <div className="h-8 w-32 bg-slate-700 animate-pulse rounded" />
              </div>

              {/* Tickets Table Skeleton */}
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      {['ID', 'Type', 'Title', 'Priority', 'Status', 'Date', 'Action'].map((header) => (
                        <th key={header} className="px-4 py-3">
                          <div className="h-3 w-16 bg-slate-700 animate-pulse rounded" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">
                          <div className="h-4 w-12 bg-slate-700 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-16 bg-slate-700 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-32 bg-slate-700 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-14 bg-slate-700 animate-pulse rounded-full" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-16 bg-slate-700 animate-pulse rounded-full" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-20 bg-slate-700 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-8 w-16 bg-slate-700 animate-pulse rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick action to open full support management */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Support Ticket Management</p>
                    <p className="text-xs text-slate-400">View and respond to customer support requests</p>
                  </div>
                </div>
                <Link href="/admin-hiregenai/support-centre">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                    Open Support
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <p className="text-lg sm:text-2xl font-bold text-emerald-400">{supportStats.open}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400">Open</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <p className="text-lg sm:text-2xl font-bold text-blue-400">{supportStats.inProgress}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400">In Progress</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-lg sm:text-2xl font-bold text-emerald-400">{supportStats.resolvedToday}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400">Resolved Today</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-purple-400" />
                    <p className="text-lg sm:text-2xl font-bold text-purple-400">{tickets.length}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400">Total Tickets</p>
                </div>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300">Support Tickets</h3>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Filter Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-slate-200 focus:bg-slate-700">All Priorities</SelectItem>
                    <SelectItem value="urgent" className="text-red-400 focus:bg-slate-700">Urgent</SelectItem>
                    <SelectItem value="high" className="text-orange-400 focus:bg-slate-700">High</SelectItem>
                    <SelectItem value="medium" className="text-amber-400 focus:bg-slate-700">Medium</SelectItem>
                    <SelectItem value="low" className="text-blue-400 focus:bg-slate-700">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tickets Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No tickets found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-300">
                            {ticket.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(ticket.ticketType)}
                              <span className="text-sm text-slate-300">{getTypeLabel(ticket.ticketType)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-white truncate max-w-[200px]">{ticket.title}</div>
                            <div className="text-xs text-slate-400">{ticket.companyName}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>{ticket.status.replace("_", " ")}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                            {formatDate(ticket.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link href="/admin-hiregenai/support-centre">
                                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTicketStatus(ticket.id, "resolved")}
                                disabled={updating === ticket.id}
                                className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                              >
                                {updating === ticket.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

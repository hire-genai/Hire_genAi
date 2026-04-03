"use client"

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lightbulb, Loader2, ArrowRight, MessageCircle } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

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

export default function ProductFeedbackPage() {
  const [loadingSupport, setLoadingSupport] = useState(false)
  const [feedbackTickets, setFeedbackTickets] = useState<Ticket[]>([])
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchSupportData = useCallback(async () => {
    setLoadingSupport(true)
    try {
      const res = await fetch("/api/admin/support-overview")
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      if (data.ok) {
        setFeedbackTickets(data.tickets?.filter((t: Ticket) => t.ticketType === "feedback") || [])
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
        // Remove from UI if marked as reviewed
        if (newStatus === "reviewed") {
          setFeedbackTickets(prev => prev.filter(t => t.id !== ticketId))
        } else {
          // Update the ticket in the list
          setFeedbackTickets(prev => 
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-emerald-900 text-emerald-200"
      case "in_progress": return "bg-blue-900 text-blue-200"
      case "resolved": case "closed": return "bg-slate-700 text-slate-300"
      default: return "bg-slate-700 text-slate-200"
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Product Feedback</h1>
        <p className="text-slate-400">Review and manage customer feedback and suggestions</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-4">
          {loadingSupport ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <span className="ml-2 text-slate-400">Loading...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick action to open full feedback management */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Feedback Management</p>
                    <p className="text-xs text-slate-400">View and respond to all customer feedback</p>
                  </div>
                </div>
                <Link href="/support-hiregenai/admin">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
                    Open Feedback
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <p className="text-lg sm:text-2xl font-bold text-amber-400">{feedbackTickets.length}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Total Feedback</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <p className="text-lg sm:text-2xl font-bold text-emerald-400">
                    {feedbackTickets.filter((t) => t.status === "open").length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400">New / Unread</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <p className="text-lg sm:text-2xl font-bold text-blue-400">
                    {feedbackTickets.filter((t) => t.status === "resolved" || t.status === "closed").length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Reviewed</p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-300 mb-3">New Feedback</h3>
                {feedbackTickets.filter(t => t.status === "open").length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-slate-700">
                    <Lightbulb className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No new feedback</p>
                    <p className="text-xs text-slate-500 mt-1">All feedback has been reviewed</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feedbackTickets.filter(t => t.status === "open").slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-slate-400">{t.companyName} - {new Date(t.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge className="text-xs bg-amber-900 text-amber-200">{t.ticketType}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTicketStatus(t.id, "resolved")}
                            disabled={updating === t.id}
                            className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white text-xs px-2 py-1 h-auto"
                          >
                            {updating === t.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Mark as Reviewed"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

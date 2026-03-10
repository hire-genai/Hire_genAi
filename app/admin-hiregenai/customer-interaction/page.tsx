"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Loader2 } from "lucide-react"
import { useEffect, useState, useCallback } from "react"

interface Contact {
  id: string
  companyName: string
  contactPerson: string
  email: string
  companySize: string
  industry: string
  createdAt: string
}

export default function CustomerInteractionPage() {
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const res = await fetch("/api/admin/contacts-list")
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      if (data.ok) {
        setContacts(data.contacts || [])
      }
    } catch (err) {
      console.error("Contacts fetch error:", err)
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Customer Interactions</h1>
        <p className="text-slate-400">Manage contact leads and assessment submissions</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          {loadingContacts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <span className="ml-2 text-slate-400">Loading...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No customer interactions to display</p>
              <p className="text-xs text-slate-500 mt-1">Contact leads will appear here when available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Contact</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Company</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Industry</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Size</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <p className="text-white font-medium">{c.contactPerson}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{c.companyName}</td>
                      <td className="py-3 px-4 text-slate-300">{c.industry}</td>
                      <td className="py-3 px-4 text-slate-300">{c.companySize}</td>
                      <td className="py-3 px-4 text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

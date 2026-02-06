'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Send, Search, Mail, Phone, Calendar, Paperclip } from 'lucide-react'
import { useState } from 'react'

const conversations = [
  {
    id: 1,
    name: 'Sarah Johnson',
    position: 'Senior Full Stack Developer',
    lastMessage: 'Thank you for the interview invitation. I am available next week.',
    timestamp: '10 mins ago',
    unread: 2,
    avatar: 'SJ'
  },
  {
    id: 2,
    name: 'Michael Chen',
    position: 'Product Manager',
    lastMessage: 'Could you provide more details about the role responsibilities?',
    timestamp: '1 hour ago',
    unread: 1,
    avatar: 'MC'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    position: 'UX Designer',
    lastMessage: 'I have attached my portfolio for your review.',
    timestamp: '2 hours ago',
    unread: 0,
    avatar: 'ER'
  },
  {
    id: 4,
    name: 'David Kim',
    position: 'DevOps Engineer',
    lastMessage: 'When can I expect to hear back about the next steps?',
    timestamp: 'Yesterday',
    unread: 0,
    avatar: 'DK'
  },
]

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = useState(conversations[0])
  const [message, setMessage] = useState('')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-600 mt-1">Communicate with candidates</p>
        </div>
      </div>

      {/* Messages Layout */}
      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConv.id === conv.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm truncate">{conv.name}</h4>
                      {conv.unread > 0 && (
                        <Badge className="bg-red-500 text-white ml-2">{conv.unread}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{conv.position}</p>
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                    <p className="text-xs text-gray-400 mt-1">{conv.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                  {selectedConv.avatar}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedConv.name}</h3>
                  <p className="text-xs text-gray-600">{selectedConv.position}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-transparent">
                  <Mail className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Received Message */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {selectedConv.avatar}
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">Thank you for considering my application. I'm very excited about this opportunity.</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">10:30 AM</p>
              </div>
            </div>

            {/* Sent Message */}
            <div className="flex gap-3 justify-end">
              <div className="flex-1 flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">Great! We'd love to schedule an interview with you. Are you available next Tuesday?</p>
                </div>
              </div>
            </div>

            {/* Received Message */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {selectedConv.avatar}
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">{selectedConv.lastMessage}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedConv.timestamp}</p>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="bg-transparent flex-shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <Button size="icon" className="flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

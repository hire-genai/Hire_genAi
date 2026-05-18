"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Clock, Globe, MapPin, Zap, Facebook, Instagram, Youtube, Linkedin, Lock, Star, Loader2, ArrowRight, Calendar, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Navbar from "@/components/layout/Navbar"

// Generate time slots from 9:00am to 6:00pm with 30-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = []
  const startHour = 9
  const endHour = 18
  
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour > 12 ? hour - 12 : hour}:00${hour >= 12 ? 'pm' : 'am'}`)
    slots.push(`${hour > 12 ? hour - 12 : hour}:30${hour >= 12 ? 'pm' : 'am'}`)
  }
  
  return slots
}

const TIME_SLOTS = generateTimeSlots()

// Days of week starting from Monday
const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

export default function BookMeetingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1) // 1: Calendar, 2: Details Form, 3: Confirmation

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [loadingBookedSlots, setLoadingBookedSlots] = useState(false)

  // Get current time for timezone display
  const [currentTime, setCurrentTime] = useState("")
  
  // Helper function to convert time string to minutes
  const convertToMinutes = (timeStr: string): number => {
    const time = timeStr.toLowerCase().trim()
    const isPM = time.includes('pm')
    const isAM = time.includes('am')
    
    // Remove "am" or "pm" and split
    const timeOnly = time.replace('am', '').replace('pm', '').trim()
    const [hours, minutes] = timeOnly.split(':').map(Number)
    
    let totalMinutes = hours * 60 + (minutes || 0)
    
    // Convert to 24-hour format
    if (isPM && hours !== 12) {
      totalMinutes += 12 * 60
    } else if (isAM && hours === 12) {
      totalMinutes = 0 // 12:00am is 0 minutes
    }
    
    return totalMinutes
  }

  // Helper function to check if today is selected
  const isTodaySelected = (): boolean => {
    if (!selectedDate) return false
    
    const today = new Date()
    const selected = new Date(selectedDate)
    
    return (
      today.getDate() === selected.getDate() &&
      today.getMonth() === selected.getMonth() &&
      today.getFullYear() === selected.getFullYear()
    )
  }

  // Fetch booked slots for selected date
  const fetchBookedSlots = async (date: Date) => {
    if (!date) return
    
    setLoadingBookedSlots(true)
    try {
      // Format date as YYYY-MM-DD using local timezone (not UTC)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      const response = await fetch(`/api/meeting-bookings?startDate=${dateStr}&endDate=${dateStr}`)
      const data = await response.json()
      
      if (data.success && data.bookings) {
        const bookedTimes = new Set<string>()
        
        data.bookings.forEach((booking: any) => {
          if (booking.meeting_time) {
            // Handle database timestamp format - convert to YYYY-MM-DD with timezone consideration
            let bookingDate = booking.meeting_date
            if (booking.meeting_date.includes('T')) {
              // It's a timestamp, convert to local timezone date
              const dbDate = new Date(booking.meeting_date)
              // Use local timezone instead of UTC
              const year = dbDate.getFullYear()
              const month = String(dbDate.getMonth() + 1).padStart(2, '0')
              const day = String(dbDate.getDate()).padStart(2, '0')
              bookingDate = `${year}-${month}-${day}`
            }
            
            if (bookingDate === dateStr) {
              // Handle different time formats from database
              let dbTimeStr = booking.meeting_time.toLowerCase().trim()
              
              // Remove spaces and normalize format
              dbTimeStr = dbTimeStr.replace(' ', '').replace(/\./g, '')
              
              // Try to match with TIME_SLOTS format
              const matchingTimeSlot = TIME_SLOTS.find(slot => {
                const slotStr = slot.toLowerCase().replace(' ', '').replace(/\./g, '')
                return slotStr === dbTimeStr
              })
              
              if (matchingTimeSlot) {
                bookedTimes.add(matchingTimeSlot.toLowerCase().replace(' ', ''))
              }
            }
          }
        })
        setBookedSlots(bookedTimes)
      }
    } catch (error) {
      console.error('Failed to fetch booked slots:', error)
    } finally {
      setLoadingBookedSlots(false)
    }
  }
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }).toLowerCase()
      setCurrentTime(timeStr)
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch booked slots when selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate)
    } else {
      setBookedSlots(new Set())
    }
  }, [selectedDate])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/book-meeting')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    phoneNumber: '',
    notes: ''
  })

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    // Get day of week (0 = Sunday, adjust for Monday start)
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6
    
    return { daysInMonth, startDay }
  }

  const calendarDays = useMemo(() => {
    const { daysInMonth, startDay } = getDaysInMonth(currentMonth)
    const days: (number | null)[] = []
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }, [currentMonth])

  const isDateSelectable = (day: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate >= today
  }

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    )
  }

  const handleDateSelect = (day: number) => {
    if (!isDateSelectable(day)) return
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(newDate)
    setSelectedTime(null) // Reset time when date changes
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ""
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatMonthYear = () => {
    return currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate end time (30 minutes after start time)
  const calculateEndTime = (startTime: string) => {
    // Parse time string like "9:00am" or "2:30pm"
    const match = startTime.match(/(\d+):(\d+)(am|pm)/)
    if (!match) return startTime
    
    let hours = parseInt(match[1])
    let minutes = parseInt(match[2])
    const period = match[3]
    
    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    
    // Add 30 minutes
    minutes += 30
    if (minutes >= 60) {
      minutes -= 60
      hours += 1
    }
    
    // Convert back to 12-hour format
    const endPeriod = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
    
    return `${displayHours}:${String(minutes).padStart(2, '0')}${endPeriod}`
  }

  const handleNextFromCalendar = () => {
    if (selectedDate && selectedTime) {
      setStep(2)
    }
  }

  const handleSubmitBooking = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/meeting-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          workEmail: formData.workEmail,
          companyName: formData.companyName,
          phoneNumber: formData.phoneNumber || null,
          notes: formData.notes || null,
          meetingDate: selectedDate ? formatDateForAPI(selectedDate) : null,
          meetingTime: selectedTime || null,
          meetingEndTime: selectedTime ? calculateEndTime(selectedTime) : null
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to book meeting')
      }
      
      console.log('✅ Meeting booked successfully:', data.booking)
      
      toast({
        title: "Meeting Booked!",
        description: "Your meeting has been scheduled successfully.",
      })
      
      setStep(3) // Go to Confirmation
      
    } catch (error: any) {
      console.error('❌ Failed to book meeting:', error)
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book meeting. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Announcement Banner */}
      <div className="bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">HireGenAI Launches All-New AI-Powered Recruitment Suite</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-visible min-h-[600px]">
          <div className="flex flex-col lg:flex-row">
            {/* Left Column - Meeting Info */}
            <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 p-8">
              
              {/* Logo */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-slate-800">Hire</span>
                  <span className="text-emerald-500">GenAI</span>
                </span>
              </div>

              {/* Profile */}
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4 flex items-center justify-center text-white text-2xl font-semibold">
                  T
                </div>
                <p className="text-slate-600 text-sm mb-1">HireGenAI Team</p>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">30 Minute Meeting</h2>
                
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">30 min</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">India Standard Time</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Google Meet</span>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                  </div>
                  <div className={`flex-1 h-1 ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                  </div>
                  <div className={`flex-1 h-1 ${step >= 3 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {step >= 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Time</span>
                  <span>Details</span>
                  <span>Done</span>
                </div>
              </div>
            </div>

            {/* Right Column - Step Content */}
            <div className="flex-1 p-8">
              {/* Step 1: Calendar & Time Selection */}
              {step === 1 && (
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Calendar Section */}
                  <div className="flex-1">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-6">
                      <button 
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-semibold text-slate-800">{formatMonthYear()}</h3>
                      <button 
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-600"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => (
                        <div key={index} className="aspect-square flex items-center justify-center">
                          {day !== null && (
                            <button
                              onClick={() => handleDateSelect(day)}
                              disabled={!isDateSelectable(day)}
                              className={`w-10 h-10 rounded-full text-sm font-medium transition-all
                                ${isDateSelected(day) 
                                  ? 'bg-emerald-600 text-white' 
                                  : isDateSelectable(day)
                                    ? 'text-emerald-600 hover:bg-emerald-100'
                                    : 'text-slate-300 cursor-not-allowed'
                                }
                              `}
                            >
                              {day}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Timezone */}
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-500 mb-1">Time zone</p>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">India Standard Time ({currentTime})</span>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots Section */}
                  <div className="lg:flex-1 lg:max-w-xs">
                    {selectedDate ? (
                      <>
                        <h4 className="text-lg font-semibold text-slate-800 mb-4">
                          {formatSelectedDate()}
                        </h4>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                          {TIME_SLOTS.map(time => {
                            // Filter out past time slots for today
                            if (isTodaySelected()) {
                              const nowMinutes = convertToMinutes(currentTime)
                              const slotMinutes = convertToMinutes(time)
                              
                              // Don't render slots that are in the past or equal to current time
                              if (slotMinutes <= nowMinutes) {
                                return null
                              }
                            }
                            
                            const timeKey = time.toLowerCase().replace(' ', '')
                            const isBooked = bookedSlots.has(timeKey)
                            
                            return (
                              <div key={time}>
                                {selectedTime === time ? (
                                  <div className="flex gap-2 items-center">
                                    <div className="flex-1 py-3 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium text-center">
                                      {time}
                                    </div>
                                    <button
                                      onClick={handleNextFromCalendar}
                                      className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                                    >
                                      Next
                                    </button>
                                  </div>
                                ) : isBooked ? (
                                  <button
                                    disabled
                                    className="w-full py-3 px-4 rounded-lg border border-slate-300 bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed opacity-60"
                                    title="Already booked"
                                  >
                                    {time} (Booked)
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setSelectedTime(time)}
                                    className="w-full py-3 px-4 rounded-lg border border-emerald-300 text-emerald-600 text-sm font-medium hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                                  >
                                    {time}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Select a date to see available times</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Enter Details Form */}
              {step === 2 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Enter Your Details</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStep(1)}
                      className="border-slate-300"
                    >
                      ← Back
                    </Button>
                  </div>

                  {/* Selected Date/Time Summary */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <Calendar className="w-5 h-5" />
                      <p className="text-sm font-medium">
                        {formatSelectedDate()} at {selectedTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="fullName" className="text-slate-700">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="mt-1"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="workEmail" className="text-slate-700">Work Email *</Label>
                      <Input
                        id="workEmail"
                        type="email"
                        value={formData.workEmail}
                        onChange={(e) => setFormData({...formData, workEmail: e.target.value})}
                        className="mt-1"
                        placeholder="you@company.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="companyName" className="text-slate-700">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        className="mt-1"
                        placeholder="Your company name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber" className="text-slate-700">Phone Number (Optional)</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        className="mt-1"
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-slate-700">
                        Please share anything that will help prepare for our meeting.
                      </Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="mt-1 min-h-[100px]"
                        placeholder="Any specific topics you'd like to discuss..."
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={handleSubmitBooking}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
                        disabled={!formData.fullName || !formData.workEmail || !formData.companyName || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          <>
                            Schedule Meeting
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Meeting is Booked!</h2>
                  <p className="text-slate-600 mb-6">A confirmation email has been sent to <span className="font-medium">{formData.workEmail}</span></p>
                  
                  <div className="bg-slate-50 rounded-lg p-6 max-w-md mx-auto mb-8">
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        <span className="text-slate-700">{formatSelectedDate()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-emerald-600" />
                        <span className="text-slate-700">{selectedTime} - 30 Minutes</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        <span className="text-slate-700">Google Meet</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-emerald-600" />
                        <span className="text-slate-700">India Standard Time</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-6">
                    You will receive a calendar invite with the Google Meet link shortly.
                  </p>

                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    className="px-8 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                  >
                    Back to Home
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-6 md:gap-12 mb-12">
            {/* Left Section - Brand Block */}
            <div className="col-span-2 md:col-span-3">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
              </p>
              <p className="text-slate-400 mb-6 text-sm font-medium">
                Email: <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@hire-genai.com</a>
              </p>
              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/hire-genai" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/demo-en" className="hover:text-emerald-400 transition-colors">
                    Try the Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <a 
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/?scroll=assessment');
                    }}
                  >
                    Assessment
                  </a>
                </li>
                <li>
                  <a 
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/?scroll=faq');
                    }}
                  >
                    FAQs
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-emerald-400 transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book-meeting" className="hover:text-emerald-400 transition-colors">
                    Book a Meeting
                  </Link>
                </li>
                <li>
                  <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Section - Badges Block */}
            <div className="col-span-1 md:col-span-3">
              <div className="space-y-4">
                {/* Trustpilot Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
                </div>

                {/* GDPR Compliant Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                  </div>
                  <p className="text-xs text-slate-400">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2024 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

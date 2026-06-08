"use client"

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Clock, Globe, MapPin, Loader2, ArrowRight, Calendar, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WwwNavbar } from "@/components/layout/www-nav"

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

  const darkInp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '11px 14px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#03110A', color: '#fff' }}>
      <WwwNavbar />

      <div style={{ paddingTop: '68px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '520px' }}>
            {/* Left Column - Meeting Info */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '24px', flexShrink: 0 }}>

              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#00B14F,#00C853)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff' }}>⚡</div>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>Hire-<span style={{ color: '#00B14F' }}>GenAI</span></span>
              </div>

              {/* Profile */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#00B14F,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>T</div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>HireGenAI Team</p>
                <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '14px' }}>30 Minute Meeting</h2>

                {[['⏱', '30 min'],['🌏', 'India Standard Time'],['📹', 'Google Meet']].map(([icon, text]) => (
                  <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Step Indicator */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[1,2,3].map((n, i) => (
                    <React.Fragment key={n}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, background: step >= n ? '#00B14F' : 'rgba(255,255,255,0.1)', color: step >= n ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all .3s', flexShrink: 0 }}>
                        {step > n ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : n}
                      </div>
                      {i < 2 && <div style={{ flex: 1, height: 2, background: step > n ? '#00B14F' : 'rgba(255,255,255,0.1)', transition: 'background .3s' }} />}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  <span>Time</span><span>Details</span><span>Done</span>
                </div>
              </div>
            </div>

            {/* Right Column - Step Content */}
            <div style={{ padding: '24px', minWidth: 0 }}>
              {/* Step 1: Calendar & Time Selection */}
              {step === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '24px', alignItems: 'start' }}>
                  {/* Calendar Section */}
                  <div style={{ minWidth: 0 }}>
                    {/* Month Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <button onClick={handlePrevMonth} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft style={{ width: 16, height: 16 }} />
                      </button>
                      <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{formatMonthYear()}</h3>
                      <button onClick={handleNextMonth} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,177,79,0.15)', border: '1px solid rgba(0,177,79,0.3)', color: '#00B14F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight style={{ width: 16, height: 16 }} />
                      </button>
                    </div>

                    {/* Days of Week Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '8px' }}>
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '8px 0', letterSpacing: '0.05em' }}>{day}</div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                      {calendarDays.map((day, index) => (
                        <div key={index} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {day !== null && (
                            <button
                              onClick={() => handleDateSelect(day)}
                              disabled={!isDateSelectable(day)}
                              style={{
                                width: 36, height: 36, borderRadius: '50%', fontSize: '13px', fontWeight: 600, border: 'none', cursor: isDateSelectable(day) ? 'pointer' : 'not-allowed', transition: 'all .2s',
                                background: isDateSelected(day) ? '#00B14F' : 'transparent',
                                color: isDateSelected(day) ? '#fff' : isDateSelectable(day) ? '#00B14F' : 'rgba(255,255,255,0.2)',
                              }}
                              onMouseEnter={e => { if (isDateSelectable(day) && !isDateSelected(day)) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,177,79,0.15)' }}
                              onMouseLeave={e => { if (!isDateSelected(day)) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                            >
                              {day}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Timezone */}
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Time zone</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                        <Globe style={{ width: 16, height: 16 }} />
                        <span>India Standard Time ({currentTime})</span>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots Section */}
                  <div style={{ width: '220px' }}>
                    {selectedDate ? (
                      <>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{formatSelectedDate()}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                          {TIME_SLOTS.map(time => {
                            if (isTodaySelected()) {
                              const nowMinutes = convertToMinutes(currentTime)
                              const slotMinutes = convertToMinutes(time)
                              if (slotMinutes <= nowMinutes) return null
                            }
                            const timeKey = time.toLowerCase().replace(' ', '')
                            const isBooked = bookedSlots.has(timeKey)
                            return (
                              <div key={time}>
                                {selectedTime === time ? (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,177,79,0.2)', border: '1px solid #00B14F', color: '#00B14F', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>{time}</div>
                                    <button onClick={handleNextFromCalendar} style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: '#00B14F', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Next →</button>
                                  </div>
                                ) : isBooked ? (
                                  <button disabled style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)', fontSize: '13px', cursor: 'not-allowed' }}>{time} (Booked)</button>
                                ) : (
                                  <button onClick={() => setSelectedTime(time)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(0,177,79,0.35)', color: '#00B14F', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,177,79,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#00B14F' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,177,79,0.35)' }}
                                  >{time}</button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.3)' }}>
                        <Calendar style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ fontSize: '14px' }}>Select a date to see available times</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Enter Details Form */}
              {step === 2 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Enter Your Details</h2>
                    <button onClick={() => setStep(1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer' }}>← Back</button>
                  </div>

                  {/* Selected Date/Time Summary */}
                  <div style={{ background: 'rgba(0,177,79,0.1)', border: '1px solid rgba(0,177,79,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar style={{ width: 18, height: 18, color: '#00B14F', flexShrink: 0 }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#6EE7B7' }}>{formatSelectedDate()} at {selectedTime}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {[
                      { id: 'fullName', label: 'Full Name *', placeholder: 'Enter your full name', type: 'text', req: true },
                      { id: 'workEmail', label: 'Work Email *', placeholder: 'you@company.com', type: 'email', req: true },
                      { id: 'companyName', label: 'Company Name *', placeholder: 'Your company name', type: 'text', req: true },
                      { id: 'phoneNumber', label: 'Phone Number (Optional)', placeholder: '+91 98765 43210', type: 'tel', req: false },
                    ].map(f => (
                      <div key={f.id}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>{f.label}</label>
                        <input type={f.type} value={(formData as any)[f.id]} onChange={e => setFormData({...formData, [f.id]: e.target.value})} placeholder={f.placeholder} required={f.req} style={darkInp}
                          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,177,79,0.5)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Please share anything that will help prepare for our meeting.</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any specific topics you'd like to discuss..." style={{ ...darkInp, minHeight: '100px', resize: 'vertical' } as React.CSSProperties}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,177,79,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')} />
                    </div>
                    <button onClick={handleSubmitBooking} disabled={!formData.fullName || !formData.workEmail || !formData.companyName || isSubmitting}
                      style={{ width: '100%', height: '52px', background: 'linear-gradient(135deg,#00B14F,#00C853)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: (!formData.fullName || !formData.workEmail || !formData.companyName || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!formData.fullName || !formData.workEmail || !formData.companyName || isSubmitting) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity .2s' }}>
                      {isSubmitting ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} /> Booking...</> : <>Schedule Meeting <ArrowRight style={{ width: 18, height: 18 }} /></>}
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ width: 80, height: 80, background: 'rgba(0,177,79,0.15)', border: '2px solid rgba(0,177,79,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 style={{ width: 40, height: 40, color: '#00B14F' }} />
                  </div>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Your Meeting is Booked!</h2>
                  <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>A confirmation email has been sent to <span style={{ color: '#fff', fontWeight: 600 }}>{formData.workEmail}</span></p>

                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '0 auto 28px', textAlign: 'left' }}>
                    {[
                      { Icon: Calendar, text: formatSelectedDate() },
                      { Icon: Clock, text: `${selectedTime} - 30 Minutes` },
                      { Icon: MapPin, text: 'Google Meet' },
                      { Icon: Globe, text: 'India Standard Time' },
                    ].map(({ Icon, text }) => (
                      <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Icon style={{ width: 18, height: 18, color: '#00B14F', flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{text}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>You will receive a calendar invite with the Google Meet link shortly.</p>
                  <button onClick={() => router.push('/')} style={{ padding: '12px 32px', background: 'transparent', border: '1px solid rgba(0,177,79,0.4)', borderRadius: '10px', color: '#00B14F', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>← Back to Home</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-6 md:gap-12 mb-12">
            <div className="col-span-2 md:col-span-3">
              <h3 className="text-2xl font-bold mb-2"><span className="text-white">Hire</span><span className="text-emerald-400">-GenAI</span></h3>
              <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.</p>
              <p className="text-slate-400 mb-6 text-sm font-medium">Email: <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@hire-genai.com</a></p>
              <div className="flex space-x-4">
                {[['https://www.linkedin.com/company/hire-genai','in'],['#','f'],['#','ig'],['#','yt']].map(([href, icon]) => (
                  <a key={icon} href={href} className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors text-xs font-bold">{icon}</a>
                ))}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                {[['/demo-en','Try the Demo'],['/pricing','Pricing'],['/','Assessment'],['/','FAQs']].map(([href, label]) => (
                  <li key={label}><a href={href} className="hover:text-emerald-400 transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                {[['/about','About us'],['/contact','Contact'],['/book-meeting','Book a Meeting'],['/owner-login','Admin']].map(([href, label]) => (
                  <li key={label}><a href={href} className="hover:text-emerald-400 transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                {[['/privacy','Privacy Policy'],['/terms','Terms and Conditions']].map(([href, label]) => (
                  <li key={label}><a href={href} className="hover:text-emerald-400 transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-span-1 md:col-span-3">
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_,i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2"><span className="text-emerald-400">🔒</span><p className="text-sm font-semibold text-white">GDPR COMPLIANT</p></div>
                  <p className="text-xs text-slate-400">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2025 Hire-GenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}

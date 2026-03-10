"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ArrowRight } from "lucide-react"

type DateFilterPreset = 'last90Days' | 'last30Days' | 'last7Days' | 'last14Days' | 'weekToDate' | 'monthToDate' | 'custom'

interface DashboardDateFilterProps {
  onApply: (startDate: string, endDate: string) => void
  defaultPreset?: 'last90Days' | 'last30Days' | 'last7Days' | 'last14Days' | 'weekToDate' | 'monthToDate'
}

export default function DashboardDateFilter({ onApply, defaultPreset = 'last90Days' }: DashboardDateFilterProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterPreset>(defaultPreset)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  useEffect(() => {
    handlePresetDateFilter(defaultPreset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePresetDateFilter = (preset: DateFilterPreset) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let startDate = new Date(today)
    const endDate = new Date(today)

    switch (preset) {
      case 'weekToDate':
        const dayOfWeek = today.getDay()
        startDate.setDate(today.getDate() - dayOfWeek)
        break
      case 'monthToDate':
        startDate.setDate(1)
        break
      case 'last7Days':
        startDate.setDate(today.getDate() - 7)
        break
      case 'last14Days':
        startDate.setDate(today.getDate() - 14)
        break
      case 'last30Days':
        startDate.setDate(today.getDate() - 30)
        break
      case 'last90Days':
        startDate.setDate(today.getDate() - 90)
        break
      default:
        startDate.setDate(today.getDate() - 90)
    }

    const startYear = startDate.getFullYear()
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
    const startDay = String(startDate.getDate()).padStart(2, '0')
    const endYear = endDate.getFullYear()
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const endDay = String(endDate.getDate()).padStart(2, '0')
    
    const startDateStr = `${startYear}-${startMonth}-${startDay}`
    const endDateStr = `${endYear}-${endMonth}-${endDay}`
    setCustomStartDate(startDateStr)
    setCustomEndDate(endDateStr)
    setSelectedDateFilter(preset)
    setShowDatePicker(false)
    
    onApply(startDateStr, endDateStr)
  }

  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, monthIndex, day))
    }
    
    return days
  }

  const isDateInFuture = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate > today
  }

  const handleDateClick = (date: Date) => {
    if (isDateInFuture(date)) {
      return
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(dateStr)
      setCustomEndDate('')
      setSelectedDateFilter('custom')
    } else {
      if (date < new Date(customStartDate)) {
        setCustomEndDate(customStartDate)
        setCustomStartDate(dateStr)
      } else {
        setCustomEndDate(dateStr)
      }
      setSelectedDateFilter('custom')
    }
  }

  const isDateInRange = (date: Date) => {
    if (!customStartDate) return false
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const start = customStartDate
    const end = customEndDate || customStartDate
    return dateStr >= start && dateStr <= end
  }

  const isRangeEdge = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return dateStr === customStartDate || dateStr === customEndDate
  }

  const getDateRangeDisplay = () => {
    if (customStartDate && customEndDate) {
      const [startYear, startMonth, startDay] = customStartDate.split('-')
      const [endYear, endMonth, endDay] = customEndDate.split('-')
      const startStr = `${startDay}/${startMonth}/${startYear.slice(-2)}`
      const endStr = `${endDay}/${endMonth}/${endYear.slice(-2)}`
      return `${startStr} - ${endStr}`
    }
    
    if (customStartDate && !customEndDate) {
      const [year, month, day] = customStartDate.split('-')
      return `${day}/${month}/${year.slice(-2)}`
    }
    
    switch (selectedDateFilter) {
      case 'weekToDate':
        return 'Week to date'
      case 'monthToDate':
        return 'Month to date'
      case 'last7Days':
        return 'Last 7 days'
      case 'last14Days':
        return 'Last 14 days'
      case 'last30Days':
        return 'Last 30 days'
      case 'last90Days':
      default:
        return 'Last 90 Days'
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="h-8 px-3 text-sm font-normal bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
      >
        <Calendar className="w-4 h-4 mr-2" />
        {getDateRangeDisplay()}
      </Button>
      
      {showDatePicker && (
        <div className="absolute right-0 top-10 z-50 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 p-3 w-[calc(100vw-2rem)] max-w-[480px] sm:w-[480px]">
          <div className="flex gap-3">
            {/* Preset Options Sidebar */}
            <div className="w-32 border-r border-gray-200 pr-3">
              <div className="space-y-1">
                <button
                  onClick={() => handlePresetDateFilter('weekToDate')}
                  className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  Week to date
                </button>
                <button
                  onClick={() => handlePresetDateFilter('monthToDate')}
                  className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  Month to date
                </button>
                <button
                  onClick={() => handlePresetDateFilter('last7Days')}
                  className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  Last 7 days
                </button>
                <button
                  onClick={() => handlePresetDateFilter('last14Days')}
                  className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  Last 14 days
                </button>
                <button
                  onClick={() => handlePresetDateFilter('last30Days')}
                  className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  Last 30 days
                </button>
                <button
                  onClick={() => handlePresetDateFilter('last90Days')}
                  className="w-full text-left px-2 py-1.5 text-xs rounded bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                >
                  Last 90 days
                </button>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-sm">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-xs text-gray-500 py-1 font-medium">
                    {day}
                  </div>
                ))}
                {getCalendarDays(currentMonth).map((date, idx) => (
                  <div key={idx}>
                    {date ? (
                      <button
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => setHoveredDate(date)}
                        onMouseLeave={() => setHoveredDate(null)}
                        disabled={isDateInFuture(date)}
                        style={!isDateInFuture(date) ? { border: '1px solid transparent' } : {}}
                        className={`w-full aspect-square text-xs rounded flex items-center justify-center transition-all duration-200 ${
                          isDateInFuture(date)
                            ? 'text-gray-300 cursor-not-allowed'
                            : isRangeEdge(date)
                            ? 'bg-emerald-600 text-white font-semibold'
                            : isDateInRange(date)
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <div className="w-full aspect-square" />
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowDatePicker(false)
                    handlePresetDateFilter('last90Days')
                  }}
                  className="bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setShowDatePicker(false)
                      onApply(customStartDate, customEndDate)
                    }
                  }}
                  disabled={!customStartDate || !customEndDate}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 h-7 text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

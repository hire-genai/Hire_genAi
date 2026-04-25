import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface SkeletonProps {
  className?: string
  theme?: 'light' | 'dark'
}

export function Skeleton({ className, theme = 'light' }: SkeletonProps) {
  const bgColor = theme === 'dark' ? 'bg-slate-700/60' : 'bg-gray-200'
  return (
    <div className={cn('animate-pulse rounded', bgColor, className)} />
  )
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  }
  return (
    <div
      className={cn(
        'animate-spin border-2 border-emerald-600 border-t-transparent rounded-full',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface TableLoaderProps {
  rows?: number
  columns?: number
}

export function TableLoader({ rows = 5, columns = 6, theme = 'light' }: TableLoaderProps & { theme?: 'light' | 'dark' }) {
  const bgColors = theme === 'dark' 
    ? { wrapper: 'bg-slate-900 border-slate-800', header: 'bg-slate-800 border-slate-700', border: 'border-slate-700' }
    : { wrapper: 'bg-white border-gray-200', header: 'bg-gray-50 border-gray-200', border: 'border-gray-200' }
  return (
    <div className={`${bgColors.wrapper} border rounded-lg shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className={`flex gap-4 px-6 py-3 ${bgColors.header} border-b`}>
        <Skeleton className="h-4 w-32" theme={theme} />
        <Skeleton className="h-4 w-24" theme={theme} />
        <Skeleton className="h-4 w-24" theme={theme} />
        <Skeleton className="h-4 w-20" theme={theme} />
        <Skeleton className="h-4 w-24" theme={theme} />
        <Skeleton className="h-4 w-16" theme={theme} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className={`flex gap-4 px-6 py-4 border-b ${bgColors.border} items-center`}>
          {/* Candidate with avatar */}
          <div className="flex items-center gap-3 w-32">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" theme={theme} />
            <Skeleton className="h-4 w-20" theme={theme} />
          </div>
          <Skeleton className="h-4 w-24" theme={theme} />
          <Skeleton className="h-4 w-24" theme={theme} />
          <Skeleton className="h-5 w-20 rounded-full" theme={theme} />
          <Skeleton className="h-4 w-24" theme={theme} />
          <Skeleton className="h-8 w-16 rounded" theme={theme} />
        </div>
      ))}
    </div>
  )
}

export function CardLoader({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const bgColors = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  return (
    <div className={`${bgColors} border rounded-lg shadow-sm p-3`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-3 w-20 mb-2" theme={theme} />
          <Skeleton className="h-6 w-16" theme={theme} />
        </div>
        <Skeleton className="w-8 h-8 rounded-md shrink-0 ml-2" theme={theme} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" theme={theme} />
          <Skeleton className="h-3 w-24" theme={theme} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" theme={theme} />
          <Skeleton className="h-3 w-20" theme={theme} />
        </div>
      </div>
    </div>
  )
}

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-sm text-gray-500">{message}</p>
      )}
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm text-gray-700 text-center mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

// Bucket card loader - matches the candidate page bucket cards with stats
export function BucketCardLoader({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const bgColors = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const borderColor = theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
  return (
    <div className={`${bgColors} border rounded-lg shadow-sm p-3 md:p-4`}>
      <div className="space-y-2 md:space-y-3">
        {/* Header with Count */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-1" theme={theme} />
            <Skeleton className="h-3 w-16 mt-1" theme={theme} />
          </div>
          <Skeleton className="h-8 w-8 rounded" theme={theme} />
        </div>
        {/* Stats section */}
        <div className={`pt-2 md:pt-3 border-t ${borderColor} space-y-1 md:space-y-2`}>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16" theme={theme} />
            <Skeleton className="h-3 w-6" theme={theme} />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-14" theme={theme} />
            <Skeleton className="h-3 w-6" theme={theme} />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-18" theme={theme} />
            <Skeleton className="h-3 w-8" theme={theme} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatCardGridLoader({ count = 6, theme = 'light' }: { count?: number; theme?: 'light' | 'dark' }) {
  const gridCols = count === 7 
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7' 
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  
  return (
    <div className={`grid ${gridCols} gap-2`}>
      {Array.from({ length: count }).map((_, i) => (
        count === 7 ? (
          <BucketCardLoader key={i} theme={theme} />
        ) : (
          <CardLoader key={i} theme={theme} />
        )
      ))}
    </div>
  )
}

export function TalentPoolTableLoader({ rows = 8, theme = 'light' }: { rows?: number; theme?: 'light' | 'dark' }) {
  const headerBg = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
  const rowBorder = theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
  return (
    <div className="w-full overflow-x-auto">
      {/* Header */}
      <div className={`flex gap-4 p-3 ${headerBg} border-b items-center min-w-full`}>
        <Skeleton className="w-4 h-4 rounded flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-32 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-28 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-36 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
        <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className={`flex gap-4 p-3 border-b ${rowBorder} items-center min-w-full`}>
          <Skeleton className="w-4 h-4 rounded flex-shrink-0" theme={theme} />
          <div className="flex items-center gap-3 w-32 flex-shrink-0">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" theme={theme} />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-full mb-1" theme={theme} />
              <Skeleton className="h-3 w-full" theme={theme} />
            </div>
          </div>
          <Skeleton className="h-4 w-28 flex-shrink-0" theme={theme} />
          <div className="flex gap-1 w-36 flex-shrink-0">
            <Skeleton className="h-5 w-16 rounded-full" theme={theme} />
            <Skeleton className="h-5 w-16 rounded-full" theme={theme} />
          </div>
          <Skeleton className="h-5 w-20 rounded flex-shrink-0" theme={theme} />
          <Skeleton className="h-5 w-24 rounded flex-shrink-0" theme={theme} />
          <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" theme={theme} />
          <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
          <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
          <div className="flex gap-1 flex-shrink-0">
            <Skeleton className="w-8 h-8 rounded" theme={theme} />
            <Skeleton className="w-8 h-8 rounded" theme={theme} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DelegationTableLoader({ rows = 6, theme = 'light' }: { rows?: number; theme?: 'light' | 'dark' }) {
  const headerBg = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
  const rowBorder = theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
  return (
    <div className="w-full overflow-x-auto">
      {/* Header */}
      <div className={`flex gap-4 px-6 py-3 ${headerBg} border-b items-center min-w-full`}>
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-28 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-32 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-36 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-32 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className={`flex gap-4 px-6 py-4 border-b ${rowBorder} items-center min-w-full`}>
          {/* Type */}
          <div className="flex items-center gap-2 w-20 flex-shrink-0">
            <Skeleton className="w-4 h-4 rounded" theme={theme} />
            <Skeleton className="h-4 w-12" theme={theme} />
          </div>
          {/* Item */}
          <Skeleton className="h-4 w-28 flex-shrink-0" theme={theme} />
          {/* Delegated By */}
          <Skeleton className="h-4 w-32 flex-shrink-0" theme={theme} />
          {/* Delegated To */}
          <Skeleton className="h-4 w-36 flex-shrink-0" theme={theme} />
          {/* Duration */}
          <div className="w-32 flex-shrink-0">
            <Skeleton className="h-4 w-full mb-1" theme={theme} />
            <Skeleton className="h-3 w-20" theme={theme} />
          </div>
          {/* Reason */}
          <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
          {/* Status */}
          <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" theme={theme} />
          {/* Actions */}
          <Skeleton className="h-8 w-16 rounded flex-shrink-0" theme={theme} />
        </div>
      ))}
    </div>
  )
}

export function SupportTableLoader({ rows = 6, theme = 'light' }: { rows?: number; theme?: 'light' | 'dark' }) {
  const headerBg = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
  const rowBorder = theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
  return (
    <div className="w-full overflow-x-auto">
      {/* Header */}
      <div className={`flex gap-4 px-6 py-3 ${headerBg} border-b items-center min-w-full`}>
        <Skeleton className="h-4 w-16 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-28 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
        <Skeleton className="h-4 w-20 flex-shrink-0" theme={theme} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className={`flex gap-4 px-6 py-4 border-b ${rowBorder} items-center min-w-full`}>
          {/* ID */}
          <Skeleton className="h-4 w-16 flex-shrink-0" theme={theme} />
          {/* Type */}
          <div className="flex items-center gap-2 w-20 flex-shrink-0">
            <Skeleton className="w-4 h-4 rounded" theme={theme} />
            <Skeleton className="h-4 w-12" theme={theme} />
          </div>
          {/* Title */}
          <div className="w-36 flex-shrink-0">
            <Skeleton className="h-4 w-full mb-1" theme={theme} />
            <Skeleton className="h-3 w-24" theme={theme} />
          </div>
          {/* Priority */}
          <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" theme={theme} />
          {/* Status */}
          <Skeleton className="h-5 w-24 rounded-full flex-shrink-0" theme={theme} />
          {/* Date */}
          <Skeleton className="h-4 w-24 flex-shrink-0" theme={theme} />
          {/* Action */}
          <Skeleton className="h-8 w-16 rounded flex-shrink-0" theme={theme} />
        </div>
      ))}
    </div>
  )
}

export function JobsBucketGridLoader({ count = 6, theme = 'light' }: { count?: number; theme?: 'light' | 'dark' }) {
  const bgColors = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={`${bgColors} p-2`}>
          <div className="flex flex-col items-center text-center gap-1">
            <Skeleton className="w-7 h-7 rounded-full" theme={theme} />
            <div>
              <Skeleton className="h-6 w-8 mb-1" theme={theme} />
              <Skeleton className="h-3 w-12" theme={theme} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function JobsCardLoader({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const bgColors = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
  const stageBg = theme === 'dark' ? 'bg-slate-800' : 'bg-gray-50'
  const borderColor = theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
  return (
    <Card className={`${bgColors} p-3 md:p-4 w-full`}>
      <div className="space-y-3">
        {/* Job Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0" theme={theme} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Skeleton className="h-5 w-48" theme={theme} />
                  <Skeleton className="h-5 w-20 rounded-full" theme={theme} />
                </div>
                <Skeleton className="h-4 w-32 mb-1" theme={theme} />
                <Skeleton className="h-3 w-40" theme={theme} />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 md:gap-3">
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" theme={theme} />
                <Skeleton className="h-3 w-24" theme={theme} />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" theme={theme} />
                <Skeleton className="h-3 w-20" theme={theme} />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" theme={theme} />
                <Skeleton className="h-3 w-16" theme={theme} />
              </div>
            </div>

            {/* Auto Schedule Interview Skeleton */}
            <div className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border ${borderColor} w-fit`}>
              <Skeleton className="h-3 w-3" theme={theme} />
              <Skeleton className="h-3 w-24" theme={theme} />
              <Skeleton className="h-4 w-10 rounded" theme={theme} />
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Skeleton className="h-9 w-20 rounded" theme={theme} />
            <Skeleton className="h-9 w-16 rounded" theme={theme} />
          </div>
        </div>

        {/* Application Stages Skeleton */}
        <div className={`border-t pt-4 ${borderColor}`}>
          <Skeleton className="h-4 w-40 mb-3" theme={theme} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`text-center p-2 ${stageBg} rounded-lg`}>
                <Skeleton className="h-6 w-10 mx-auto mb-1" theme={theme} />
                <Skeleton className="h-3 w-full mx-auto" theme={theme} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

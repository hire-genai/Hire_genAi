import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
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

export function TableLoader({ rows = 5, columns = 6 }: TableLoaderProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-6 py-4 border-b items-center">
          {/* Candidate with avatar */}
          <div className="flex items-center gap-3 w-32">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

export function CardLoader() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-6 w-14" />
        </div>
        <Skeleton className="w-7 h-7 rounded-md shrink-0 ml-1" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-3 w-24" />
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
export function BucketCardLoader() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 md:p-4">
      <div className="space-y-2 md:space-y-3">
        {/* Header with Count */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        {/* Stats section */}
        <div className="pt-2 md:pt-3 border-t border-gray-200 space-y-1 md:space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-6" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-6" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-18" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatCardGridLoader({ count = 6 }: { count?: number }) {
  // Use 7 columns for candidate page buckets
  const gridCols = count === 7 
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7' 
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  return (
    <div className={`grid ${gridCols} gap-2`}>
      {Array.from({ length: count }).map((_, i) => (
        count === 7 ? <BucketCardLoader key={i} /> : <CardLoader key={i} />
      ))}
    </div>
  )
}

export function TalentPoolTableLoader({ rows = 8 }: { rows?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-gray-50 border-b items-center">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-3 border-b items-center">
          <Skeleton className="w-4 h-4 rounded" />
          <div className="flex items-center gap-3 w-28">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-1 w-32">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

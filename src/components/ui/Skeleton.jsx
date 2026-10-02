export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm animate-pulse ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32" />
        </div>
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm animate-pulse ${className}`}>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  )
}

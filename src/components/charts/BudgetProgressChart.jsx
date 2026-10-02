import { useTheme } from '../../contexts/ThemeContext'
import { SkeletonCard } from '../ui/Skeleton'

export default function BudgetProgressChart({ budgets, isLoading, title }) {
  const { theme } = useTheme()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <SkeletonCard />
      </div>
    )
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">{title || 'Budget Progress'}</h3>
        <div className="h-40 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada budget</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="font-bold text-slate-900 dark:text-white mb-4">{title || 'Budget Progress'}</h3>
      <div className="space-y-4">
        {budgets.map((budget) => {
          const limit = Number(budget.limit_amount || 0)
          const actual = Number(budget.actual_expense || 0)
          const usage = limit > 0 ? Math.min(100, (actual / limit) * 100) : 0
          const isExceeded = usage >= 100
          const isNearLimit = usage >= 80 && usage < 100

          return (
            <div key={budget.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {budget.category || 'Lainnya'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(actual)} / {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(limit)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isExceeded
                      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                      : isNearLimit
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {Math.round(usage)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExceeded
                      ? 'bg-red-500'
                      : isNearLimit
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
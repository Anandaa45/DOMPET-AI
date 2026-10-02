import { useEffect, useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { getAdminLogs } from '../../lib/admin'

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true)
      try {
        const data = await getAdminLogs(75)
        setLogs(data)
      } catch (err) {
        addToast(err.message || 'Gagal memuat log.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadLogs()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Super Admin
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">System Logs</h2>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="space-y-3">
          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada log sistem</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                key={log.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        log.severity === 'error'
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                          : log.severity === 'warning'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {log.severity}
                    </span>
                    <p className="font-medium text-slate-900 dark:text-white">{log.event_type}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{log.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

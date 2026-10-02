import { useEffect, useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'
import { getAdminDashboardStats } from '../../lib/admin'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true)
      try {
        const data = await getAdminDashboardStats()
        setStats(data)
      } catch (err) {
        addToast(err.message || 'Gagal memuat dashboard admin.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  const cards = [
    { label: 'Total user', value: stats?.total_users || 0, icon: '👥', color: 'text-violet-600 dark:text-violet-400' },
    { label: 'User aktif', value: stats?.active_users || 0, icon: '🔥', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Transaksi hari ini', value: stats?.transactions_today || 0, icon: '💳', color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Pesan WhatsApp', value: stats?.whatsapp_messages || 0, icon: '💬', color: 'text-green-600 dark:text-green-400' },
    { label: 'Proses AI/OCR', value: stats?.ai_ocr_processes || 0, icon: '🤖', color: 'text-purple-600 dark:text-purple-400' },
  ]

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Super Admin
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : (
          cards.map((card) => (
            <div
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow"
              key={card.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">{card.label}</p>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Error log terbaru</h3>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <SkeletonTable rows={3} />
          ) : (stats?.latest_error_logs || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-2">✅</span>
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada error log</p>
            </div>
          ) : (
            stats.latest_error_logs.map((log) => (
              <div
                className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/10 p-4"
                key={log.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-red-800 dark:text-red-300">{log.message}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{log.event_type}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

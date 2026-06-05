import { useEffect, useState } from 'react'
import { getAdminDashboardStats } from '../../lib/admin'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getAdminDashboardStats()
        setStats(data)
      } catch (err) {
        setError(err.message || 'Gagal memuat dashboard admin.')
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  const cards = [
    { label: 'Total user', value: stats?.total_users || 0 },
    { label: 'User aktif', value: stats?.active_users || 0 },
    { label: 'Transaksi hari ini', value: stats?.transactions_today || 0 },
    { label: 'Pesan WhatsApp', value: stats?.whatsapp_messages || 0 },
    { label: 'Proses AI/OCR', value: stats?.ai_ocr_processes || 0 },
  ]

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Super Admin
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Dashboard</h2>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm" key={card.label}>
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {isLoading ? '-' : card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-950">Error log terbaru</h3>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-zinc-500">Memuat log...</p>
          ) : (stats?.latest_error_logs || []).length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada error log.</p>
          ) : (
            stats.latest_error_logs.map((log) => (
              <div className="rounded-md border border-red-100 bg-red-50 p-4" key={log.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-red-800">{log.message}</p>
                  <p className="text-xs text-red-600">{new Date(log.created_at).toLocaleString('id-ID')}</p>
                </div>
                <p className="mt-1 text-sm text-red-700">{log.event_type}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

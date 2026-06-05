import { useEffect, useState } from 'react'
import { getAdminLogs } from '../../lib/admin'

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getAdminLogs(75)
        setLogs(data)
      } catch (err) {
        setError(err.message || 'Gagal memuat log.')
      } finally {
        setIsLoading(false)
      }
    }

    loadLogs()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Super Admin
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">System Logs</h2>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-zinc-500">Memuat log...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada log sistem.</p>
          ) : (
            logs.map((log) => (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4" key={log.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        log.severity === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                    <p className="font-medium text-zinc-950">{log.event_type}</p>
                  </div>
                  <p className="text-xs text-zinc-500">{new Date(log.created_at).toLocaleString('id-ID')}</p>
                </div>
                <p className="mt-2 text-sm text-zinc-700">{log.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

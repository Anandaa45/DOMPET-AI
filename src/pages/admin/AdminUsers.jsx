import { useEffect, useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { getAdminUsers } from '../../lib/admin'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true)
      try {
        const data = await getAdminUsers()
        setUsers(data)
      } catch (err) {
        addToast(err.message || 'Gagal memuat user.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Super Admin
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Users</h2>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4 font-medium">Nama</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">WhatsApp</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 text-right font-medium">Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTable rows={5} />
              ) : users.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-slate-500 dark:text-slate-400" colSpan="5">
                    <span className="text-2xl mb-2 block">👥</span>
                    Belum ada user
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    key={user.id}
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {user.full_name || '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{user.whatsapp_number || '-'}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.role === 'super_admin'
                            ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

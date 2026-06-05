import { useEffect, useState } from 'react'
import { getAdminUsers } from '../../lib/admin'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await getAdminUsers()
        setUsers(data)
      } catch (err) {
        setError(err.message || 'Gagal memuat user.')
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Super Admin
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Users</h2>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-3 pr-4 font-medium">Nama</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">WhatsApp</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 text-right font-medium">Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-6 text-center text-zinc-500" colSpan="5">Memuat user...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-zinc-500" colSpan="5">Belum ada user.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr className="border-b border-zinc-100" key={user.id}>
                    <td className="py-3 pr-4 font-medium text-zinc-950">{user.full_name || '-'}</td>
                    <td className="py-3 pr-4 text-zinc-600">{user.email}</td>
                    <td className="py-3 pr-4 text-zinc-600">{user.whatsapp_number || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 text-right text-zinc-600">
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

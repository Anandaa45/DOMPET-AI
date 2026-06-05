import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentProfile } from '../../lib/profiles'

export default function AdminRoute() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    async function checkAdminRole() {
      try {
        const profile = await getCurrentProfile()
        setStatus(profile.role === 'super_admin' ? 'allowed' : 'denied')
      } catch {
        setStatus('denied')
      }
    }

    checkAdminRole()
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Memeriksa akses admin...
      </div>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

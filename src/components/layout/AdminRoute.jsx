import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { getCurrentProfile } from '../../lib/profiles'

export default function AdminRoute() {
  const [status, setStatus] = useState('loading')
  const { theme } = useTheme()

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
      <div className={`${theme === 'dark' ? 'dark' : ''}`}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/20 mb-4">
              <svg className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Memeriksa akses admin...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

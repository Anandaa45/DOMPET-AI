import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail } from '../../lib/auth'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'

export default function Login() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { addToast } = useToast()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const { profile } = await loginWithEmail(form)

      if (profile.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true })
        return
      }

      navigate('/dashboard', { replace: true })
      addToast('Login berhasil!', 'success')
    } catch (err) {
      const message = err.message || 'Login gagal. Coba lagi.'
      const normalizedMessage = message.toLowerCase()

      if (normalizedMessage.includes('email not confirmed')) {
        addToast('Email belum dikonfirmasi. Matikan Confirm email di Supabase untuk development.', 'error')
      } else if (normalizedMessage.includes('email rate limit exceeded')) {
        addToast('Limit email Supabase sedang aktif. Tunggu beberapa menit.', 'error')
      } else {
        addToast(message, 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={`flex min-h-screen items-center justify-center px-6 py-10 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Dompet AI
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Login</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Masuk dengan email dan password akun kamu.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>



          <button
            className="w-full rounded-xl bg-emerald-600 dark:bg-emerald-500 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Memproses...</span> : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
          Belum punya akun?{' '}
          <Link className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" to="/register">
            Register
          </Link>
        </p>
      </section>
    </main>
  )
}

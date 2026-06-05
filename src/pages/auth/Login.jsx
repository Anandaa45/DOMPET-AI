import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail } from '../../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { profile } = await loginWithEmail(form)

      if (profile.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true })
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Masuk dengan email dan password akun kamu.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <button
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Belum punya akun?{' '}
          <Link className="font-medium text-emerald-700" to="/register">
            Register
          </Link>
        </p>
      </section>
    </main>
  )
}

import { Link } from 'react-router-dom'

export default function Welcome() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="max-w-xl text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-300">
          Dompet AI
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Kelola uang dengan lebih tenang.</h1>
        <p className="mt-4 text-slate-300">
          Placeholder awal untuk halaman welcome sebelum fitur Dompet AI lengkap.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="rounded-md bg-emerald-400 px-4 py-2 font-medium text-slate-950" to="/login">
            Login
          </Link>
          <Link className="rounded-md border border-white/20 px-4 py-2 font-medium" to="/register">
            Register
          </Link>
        </div>
      </section>
    </main>
  )
}

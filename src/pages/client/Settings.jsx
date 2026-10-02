import { useTheme } from '../../contexts/ThemeContext'
import PagePlaceholder from '../../components/ui/PagePlaceholder.jsx'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">⚙️ Pengaturan</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Konfigurasi aplikasi dan preferensi akun Anda.
        </p>
      </section>

      {/* Theme Toggle */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tema Tampilan</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pilih mode terang atau gelap sesuai preferensi Anda.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <button
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-semibold transition-all ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => toggleTheme('light')}
          >
            ☀️ Terang
          </button>
          <button
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-semibold transition-all ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => toggleTheme('dark')}
          >
            🌙 Gelap
          </button>
        </div>
      </section>

      {/* Account Info */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">👤 Akun</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Kelola informasi akun dan pengaturan keamanan.
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ubah Password</span>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">Segera tersedia</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pengaturan WhatsApp</span>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">Terkoneksi</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">ℹ️ Tentang Aplikasi</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <p><strong className="text-slate-900 dark:text-white">Versi:</strong> 1.0.0</p>
          <p><strong className="text-slate-900 dark:text-white">Dikembangkan oleh:</strong> Dompet AI Team</p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
            Dompet AI adalah aplikasi pencatat keuangan pribadi dengan fitur AI untuk membaca nota belanja.
          </p>
        </div>
      </section>
    </div>
  )
}

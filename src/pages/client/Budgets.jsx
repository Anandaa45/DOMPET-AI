import { useEffect, useState } from 'react'
import {
  createBudget,
  deleteBudget,
  getBudgetsWithSpending,
  updateBudget,
} from '../../lib/budgets'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard } from '../../components/ui/Skeleton'

const emptyForm = {
  category: '',
  limitAmount: '',
  period: 'monthly',
  startDate: '',
  endDate: '',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function getBudgetUsage(budget) {
  const limitAmount = Number(budget.limit_amount || 0)
  const actualExpense = Number(budget.actual_expense || 0)
  const rawPercentage = limitAmount > 0 ? (actualExpense / limitAmount) * 100 : 0
  const percentage = Math.min(100, Math.round(rawPercentage))
  const remaining = limitAmount - actualExpense

  if (rawPercentage >= 100) {
    return {
      percentage,
      rawPercentage,
      remaining,
      status: 'melewati budget',
      colorClass: 'bg-red-600',
      badgeClass: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    }
  }

  if (rawPercentage >= 80) {
    return {
      percentage,
      rawPercentage,
      remaining,
      status: 'peringatan',
      colorClass: 'bg-amber-500',
      badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    }
  }

  return {
    percentage,
    rawPercentage,
    remaining,
    status: 'aman',
    colorClass: 'bg-emerald-600',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  }
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    loadBudgets()
  }, [])

  async function loadBudgets() {
    setIsLoading(true)

    try {
      const data = await getBudgetsWithSpending()
      setBudgets(data)
    } catch (err) {
      addToast(err.message || 'Gagal memuat budget.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEdit(budget) {
    setEditingId(budget.id)
    setForm({
      category: budget.category || '',
      limitAmount: budget.limit_amount || '',
      period: budget.period || 'monthly',
      startDate: budget.start_date || '',
      endDate: budget.end_date || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editingId) {
        await updateBudget(editingId, form)
        addToast('Budget berhasil diperbarui.', 'success')
      } else {
        await createBudget(form)
        addToast('Budget berhasil dibuat.', 'success')
      }

      resetForm()
      await loadBudgets()
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan budget.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteBudget(id)
      addToast('Budget berhasil dihapus.', 'success')
      await loadBudgets()
    } catch (err) {
      addToast(err.message || 'Gagal menghapus budget.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">💰 Budget</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Pantau batas pengeluaran per kategori berdasarkan transaksi asli.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingId ? '✏️ Edit Budget' : '➕ Buat Budget Baru'}
          </h3>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="category"
                type="text"
                value={form.category}
                onChange={updateField}
                required
                placeholder="Contoh: Makanan"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Limit Pengeluaran</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                min="0"
                name="limitAmount"
                type="number"
                value={form.limitAmount}
                onChange={updateField}
                required
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Periode</label>
              <select
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="period"
                value={form.period}
                onChange={updateField}
              >
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Mulai</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Selesai</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={updateField}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-all"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? '⏳ Menyimpan...' : editingId ? '💾 Simpan' : '➕ Buat Budget'}
              </button>
              {editingId && (
                <button
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  type="button"
                  onClick={resetForm}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <section className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : budgets.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-12 text-center">
              <p className="text-4xl mb-4">💰</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belum ada budget</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Buat budget pertama untuk memantau pengeluaran per kategori.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {budgets.map((budget) => {
                const usage = getBudgetUsage(budget)

                return (
                  <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow" key={budget.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{budget.category}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {budget.start_date} sampai {budget.end_date}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${usage.badgeClass}`}>
                        {usage.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Limit</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatCurrency(budget.limit_amount)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Aktual</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatCurrency(budget.actual_expense)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Sisa</p>
                        <p className={`mt-1 font-bold ${usage.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatCurrency(usage.remaining)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Periode</p>
                        <p className="mt-1 font-bold capitalize text-slate-900 dark:text-white">{budget.period === 'weekly' ? 'Mingguan' : 'Bulanan'}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Penggunaan</span>
                        <span className="font-bold text-slate-900 dark:text-white">{Math.round(usage.rawPercentage)}%</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${usage.colorClass}`}
                          style={{ width: `${usage.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        type="button"
                        onClick={() => startEdit(budget)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="flex-1 rounded-xl border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        type="button"
                        onClick={() => handleDelete(budget.id)}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

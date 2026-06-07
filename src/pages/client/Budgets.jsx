import { useEffect, useState } from 'react'
import {
  createBudget,
  deleteBudget,
  getBudgetsWithSpending,
  updateBudget,
} from '../../lib/budgets'

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
      badgeClass: 'bg-red-100 text-red-700',
    }
  }

  if (rawPercentage >= 80) {
    return {
      percentage,
      rawPercentage,
      remaining,
      status: 'peringatan',
      colorClass: 'bg-amber-500',
      badgeClass: 'bg-amber-100 text-amber-700',
    }
  }

  return {
    percentage,
    rawPercentage,
    remaining,
    status: 'aman',
    colorClass: 'bg-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  }
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadBudgets()
  }, [])

  async function loadBudgets() {
    setError('')
    setIsLoading(true)

    try {
      const data = await getBudgetsWithSpending()
      setBudgets(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat budget.')
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
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      if (editingId) {
        await updateBudget(editingId, form)
        setSuccess('Budget berhasil diperbarui.')
      } else {
        await createBudget(form)
        setSuccess('Budget berhasil dibuat.')
      }

      resetForm()
      await loadBudgets()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan budget.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    setError('')
    setSuccess('')

    try {
      await deleteBudget(id)
      setSuccess('Budget berhasil dihapus.')
      await loadBudgets()
    } catch (err) {
      setError(err.message || 'Gagal menghapus budget.')
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Budget</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Pantau batas pengeluaran per kategori berdasarkan transaksi asli.
        </p>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-slate-950">
            {editingId ? 'Edit budget' : 'Buat budget baru'}
          </h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Category</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="category"
                type="text"
                value={form.category}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Limit amount</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                min="0"
                name="limitAmount"
                type="number"
                value={form.limitAmount}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Period</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="period"
                value={form.period}
                onChange={updateField}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Start date</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">End date</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={updateField}
                required
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Menyimpan...' : editingId ? 'Simpan' : 'Buat Budget'}
            </button>
            {editingId ? (
              <button
                className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700"
                type="button"
                onClick={resetForm}
              >
                Batal
              </button>
            ) : null}
          </div>
        </form>

        <section>
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Memuat budget...
            </div>
          ) : budgets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Belum ada budget</h3>
              <p className="mt-2 text-sm text-slate-500">
                Buat budget pertama untuk memantau pengeluaran per kategori.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {budgets.map((budget) => {
                const usage = getBudgetUsage(budget)

                return (
                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={budget.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{budget.category}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {budget.start_date} sampai {budget.end_date}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${usage.badgeClass}`}>
                        {usage.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Limit</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatCurrency(budget.limit_amount)}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Aktual</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatCurrency(budget.actual_expense)}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Sisa budget</p>
                        <p className={`mt-1 font-semibold ${usage.remaining < 0 ? 'text-red-600' : 'text-slate-950'}`}>
                          {formatCurrency(usage.remaining)}
                        </p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Period</p>
                        <p className="mt-1 font-semibold capitalize text-slate-950">{budget.period}</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Penggunaan</span>
                        <span className="font-semibold text-slate-950">
                          {Math.round(usage.rawPercentage)}%
                        </span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${usage.colorClass}`}
                          style={{ width: `${usage.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                        type="button"
                        onClick={() => startEdit(budget)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
                        type="button"
                        onClick={() => handleDelete(budget.id)}
                      >
                        Hapus
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

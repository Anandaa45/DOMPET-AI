import { useEffect, useState } from 'react'
import {
  addSavingGoalAmount,
  createSavingGoal,
  deleteSavingGoal,
  getSavingGoals,
  updateSavingGoal,
} from '../../lib/savingGoals'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonChart } from '../../components/ui/Skeleton'

const emptyForm = {
  title: '',
  description: '',
  targetAmount: '',
  currentAmount: '',
  deadline: '',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function getProgress(goal) {
  const targetAmount = Number(goal.target_amount || 0)
  const currentAmount = Number(goal.current_amount || 0)

  if (!targetAmount) {
    return 0
  }

  return Math.min(100, Math.round((currentAmount / targetAmount) * 100))
}

export default function SavingGoals() {
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [topUpAmounts, setTopUpAmounts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTopUpId, setActiveTopUpId] = useState(null)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    setIsLoading(true)

    try {
      const data = await getSavingGoals()
      setGoals(data)
    } catch (err) {
      addToast(err.message || 'Gagal memuat target tabungan.', 'error')
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

  function startEdit(goal) {
    setEditingId(goal.id)
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      targetAmount: goal.target_amount || '',
      currentAmount: goal.current_amount || '',
      deadline: goal.deadline || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editingId) {
        await updateSavingGoal(editingId, form)
        addToast('Target tabungan berhasil diperbarui.', 'success')
      } else {
        await createSavingGoal(form)
        addToast('Target tabungan berhasil dibuat.', 'success')
      }

      resetForm()
      await loadGoals()
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan target tabungan.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteSavingGoal(id)
      addToast('Target tabungan berhasil dihapus.', 'success')
      await loadGoals()
    } catch (err) {
      addToast(err.message || 'Gagal menghapus target tabungan.', 'error')
    }
  }

  async function handleTopUp(goal) {
    setActiveTopUpId(goal.id)

    try {
      await addSavingGoalAmount(goal, topUpAmounts[goal.id])
      setTopUpAmounts((current) => ({
        ...current,
        [goal.id]: '',
      }))
      addToast('Tabungan berhasil ditambahkan.', 'success')
      await loadGoals()
    } catch (err) {
      addToast(err.message || 'Gagal menambah tabungan.', 'error')
    } finally {
      setActiveTopUpId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">🎯 Target Tabungan</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Buat target tabungan dan pantau progresnya sampai selesai.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingId ? '✏️ Edit Target' : '➕ Buat Target Baru'}
          </h3>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Judul</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="title"
                type="text"
                value={form.title}
                onChange={updateField}
                required
                placeholder="Contoh: Liburan ke Bali"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</label>
              <textarea
                className="w-full min-h-24 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Opsional"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Target Amount</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                min="0"
                name="targetAmount"
                type="number"
                value={form.targetAmount}
                onChange={updateField}
                required
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Sudah Terkumpul</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                min="0"
                name="currentAmount"
                type="number"
                value={form.currentAmount}
                onChange={updateField}
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Deadline</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={updateField}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-all"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? '⏳ Menyimpan...' : editingId ? '💾 Simpan' : '➕ Buat Target'}
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
          ) : goals.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-12 text-center">
              <p className="text-4xl mb-4">🎯</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belum ada target tabungan</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Buat target pertama untuk mulai memantau progres tabungan kamu.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {goals.map((goal) => {
                const progress = getProgress(goal)
                const isCompleted = progress >= 100 || goal.status === 'completed'

                return (
                  <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow" key={goal.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">{goal.title}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{goal.description || '-'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        {isCompleted ? '✅ Selesai' : '🔄 Aktif'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Target</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatCurrency(goal.target_amount)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Terkumpul</p>
                        <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(goal.current_amount)}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Progress</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress}%</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-600' : 'bg-emerald-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                      Deadline: <span className="font-medium text-slate-900 dark:text-white">{goal.deadline || '-'}</span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <div className="flex-1">
                        <input
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          min="0"
                          placeholder="Nominal tambah..."
                          type="number"
                          value={topUpAmounts[goal.id] || ''}
                          onChange={(event) => setTopUpAmounts((current) => ({
                            ...current,
                            [goal.id]: event.target.value,
                          }))}
                        />
                      </div>
                      <button
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-all"
                        disabled={activeTopUpId === goal.id}
                        type="button"
                        onClick={() => handleTopUp(goal)}
                      >
                        {activeTopUpId === goal.id ? '⏳' : '➕'}
                      </button>
                      <button
                        className="rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        type="button"
                        onClick={() => startEdit(goal)}
                      >
                        ✏️
                      </button>
                      <button
                        className="rounded-xl border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        type="button"
                        onClick={() => handleDelete(goal.id)}
                      >
                        🗑️
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

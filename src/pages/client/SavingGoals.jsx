import { useEffect, useState } from 'react'
import {
  addSavingGoalAmount,
  createSavingGoal,
  deleteSavingGoal,
  getSavingGoals,
  updateSavingGoal,
} from '../../lib/savingGoals'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTopUpId, setActiveTopUpId] = useState(null)

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    setError('')
    setIsLoading(true)

    try {
      const data = await getSavingGoals()
      setGoals(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat target tabungan.')
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
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      if (editingId) {
        await updateSavingGoal(editingId, form)
        setSuccess('Target tabungan berhasil diperbarui.')
      } else {
        await createSavingGoal(form)
        setSuccess('Target tabungan berhasil dibuat.')
      }

      resetForm()
      await loadGoals()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan target tabungan.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    setError('')
    setSuccess('')

    try {
      await deleteSavingGoal(id)
      setSuccess('Target tabungan berhasil dihapus.')
      await loadGoals()
    } catch (err) {
      setError(err.message || 'Gagal menghapus target tabungan.')
    }
  }

  async function handleTopUp(goal) {
    setError('')
    setSuccess('')
    setActiveTopUpId(goal.id)

    try {
      await addSavingGoalAmount(goal, topUpAmounts[goal.id])
      setTopUpAmounts((current) => ({
        ...current,
        [goal.id]: '',
      }))
      setSuccess('Tabungan berhasil ditambahkan.')
      await loadGoals()
    } catch (err) {
      setError(err.message || 'Gagal menambah tabungan.')
    } finally {
      setActiveTopUpId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Target Tabungan</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Buat target tabungan dan pantau progresnya sampai selesai.
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
            {editingId ? 'Edit target' : 'Buat target baru'}
          </h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="title"
                type="text"
                value={form.title}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="description"
                value={form.description}
                onChange={updateField}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Target amount</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                min="0"
                name="targetAmount"
                type="number"
                value={form.targetAmount}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Current amount</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                min="0"
                name="currentAmount"
                type="number"
                value={form.currentAmount}
                onChange={updateField}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Deadline</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={updateField}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Menyimpan...' : editingId ? 'Simpan' : 'Buat Target'}
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
              Memuat target tabungan...
            </div>
          ) : goals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Belum ada target tabungan</h3>
              <p className="mt-2 text-sm text-slate-500">
                Buat target pertama untuk mulai memantau progres tabungan kamu.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {goals.map((goal) => {
                const progress = getProgress(goal)
                const isCompleted = progress >= 100 || goal.status === 'completed'

                return (
                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={goal.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{goal.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{goal.description || '-'}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isCompleted ? 'completed' : goal.status || 'active'}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Target</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatCurrency(goal.target_amount)}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Terkumpul</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatCurrency(goal.current_amount)}</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Progress</span>
                        <span className="font-semibold text-emerald-700">{progress}%</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-slate-600">
                      Deadline: <span className="font-medium text-slate-950">{goal.deadline || '-'}</span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        min="0"
                        placeholder="Nominal tambah"
                        type="number"
                        value={topUpAmounts[goal.id] || ''}
                        onChange={(event) => setTopUpAmounts((current) => ({
                          ...current,
                          [goal.id]: event.target.value,
                        }))}
                      />
                      <button
                        className="rounded-md bg-slate-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={activeTopUpId === goal.id}
                        type="button"
                        onClick={() => handleTopUp(goal)}
                      >
                        {activeTopUpId === goal.id ? 'Menambah...' : 'Tambah Tabungan'}
                      </button>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                        type="button"
                        onClick={() => startEdit(goal)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
                        type="button"
                        onClick={() => handleDelete(goal.id)}
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

import { useEffect, useMemo, useState } from 'react'
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '../../lib/transactions'
import { parseTransactionsWithGemini } from '../../lib/gemini'

const emptyForm = {
  type: 'expense',
  title: '',
  amount: '',
  category: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

const filters = [
  { value: 'all', label: 'Semua' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [aiText, setAiText] = useState('')
  const [aiPreview, setAiPreview] = useState([])
  const [aiError, setAiError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAiParsing, setIsAiParsing] = useState(false)
  const [isAiSaving, setIsAiSaving] = useState(false)

  const summary = useMemo(() => {
    return transactions.reduce(
      (total, transaction) => {
        const amount = Number(transaction.amount)

        if (transaction.type === 'income') {
          total.income += amount
        } else {
          total.expense += amount
        }

        return total
      },
      { income: 0, expense: 0 },
    )
  }, [transactions])

  async function loadTransactions(selectedFilter = filter) {
    setError('')
    setIsLoading(true)

    try {
      const data = await getTransactions(selectedFilter)
      setTransactions(data)
    } catch (err) {
      setError(err.message || 'Gagal mengambil transaksi.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(filter)
  }, [filter])

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

  function startEdit(transaction) {
    setEditingId(transaction.id)
    setForm({
      type: transaction.type,
      title: transaction.title,
      amount: transaction.amount,
      category: transaction.category || '',
      transactionDate: transaction.transaction_date,
      notes: transaction.notes || '',
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      if (editingId) {
        await updateTransaction(editingId, form)
      } else {
        await createTransaction(form)
      }

      resetForm()
      await loadTransactions(filter)
    } catch (err) {
      setError(err.message || 'Gagal menyimpan transaksi.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    setError('')

    try {
      await deleteTransaction(id)
      await loadTransactions(filter)
    } catch (err) {
      setError(err.message || 'Gagal menghapus transaksi.')
    }
  }

  async function handleAiParse(event) {
    event.preventDefault()
    setAiError('')
    setAiPreview([])
    setIsAiParsing(true)

    try {
      const parsedTransactions = await parseTransactionsWithGemini(aiText)
      setAiPreview(parsedTransactions)
    } catch (err) {
      setAiError(err.message || 'Gagal membaca transaksi dengan AI.')
    } finally {
      setIsAiParsing(false)
    }
  }

  async function handleSaveAiPreview() {
    setAiError('')
    setIsAiSaving(true)

    try {
      for (const transaction of aiPreview) {
        await createTransaction(transaction)
      }

      setAiText('')
      setAiPreview([])
      await loadTransactions(filter)
    } catch (err) {
      setAiError(err.message || 'Gagal menyimpan hasil AI.')
    } finally {
      setIsAiSaving(false)
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Transactions</h2>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Income</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {formatCurrency(summary.income)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Expense</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(summary.expense)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {formatCurrency(summary.income - summary.expense)}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Catat dengan AI
          </p>
          <h3 className="text-lg font-semibold text-slate-950">Ubah kalimat jadi transaksi</h3>
        </div>

        <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handleAiParse}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Kalimat transaksi</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="beli makan 15000 dan bensin 25000"
              value={aiText}
              onChange={(event) => setAiText(event.target.value)}
              required
            />
          </label>
          <div className="flex items-end">
            <button
              className="h-10 rounded-md bg-slate-950 px-4 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isAiParsing}
              type="submit"
            >
              {isAiParsing ? 'Membaca...' : 'Parse AI'}
            </button>
          </div>
        </form>

        {aiError ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{aiError}</p>
        ) : null}

        {aiPreview.length > 0 ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-slate-950">Preview hasil AI</h4>
                <p className="text-sm text-slate-600">
                  Periksa dulu sebelum menyimpan ke Supabase.
                </p>
              </div>
              <button
                className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isAiSaving}
                type="button"
                onClick={handleSaveAiPreview}
              >
                {isAiSaving ? 'Menyimpan...' : 'Simpan hasil AI'}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4 font-medium">Tanggal</th>
                    <th className="py-3 pr-4 font-medium">Judul</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Kategori</th>
                    <th className="py-3 pr-4 text-right font-medium">Nominal</th>
                    <th className="py-3 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {aiPreview.map((transaction, index) => (
                    <tr className="border-b border-slate-200" key={`${transaction.title}-${index}`}>
                      <td className="py-3 pr-4 text-slate-600">{transaction.transactionDate}</td>
                      <td className="py-3 pr-4 font-medium text-slate-950">{transaction.title}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{transaction.category || '-'}</td>
                      <td className="py-3 pr-4 text-right font-medium text-slate-950">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 text-slate-600">{transaction.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-slate-950">
            {editingId ? 'Edit transaksi' : 'Tambah transaksi'}
          </h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="type"
                value={form.type}
                onChange={updateField}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Judul</span>
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
              <span className="text-sm font-medium text-slate-700">Nominal</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                min="0"
                name="amount"
                type="number"
                value={form.amount}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Kategori</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="category"
                type="text"
                value={form.category}
                onChange={updateField}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tanggal</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="transactionDate"
                type="date"
                value={form.transactionDate}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Catatan</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="notes"
                value={form.notes}
                onChange={updateField}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
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

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-950">Daftar transaksi</h3>
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
              {filters.map((item) => (
                <button
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    filter === item.value
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600'
                  }`}
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">Tanggal</th>
                  <th className="py-3 pr-4 font-medium">Judul</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Kategori</th>
                  <th className="py-3 pr-4 text-right font-medium">Nominal</th>
                  <th className="py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan="6">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan="6">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr className="border-b border-slate-100" key={transaction.id}>
                      <td className="py-3 pr-4 text-slate-600">
                        {transaction.transaction_date}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-950">
                        {transaction.title}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {transaction.category || '-'}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-slate-950">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          className="mr-2 rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700"
                          type="button"
                          onClick={() => startEdit(transaction)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1.5 font-medium text-red-700"
                          type="button"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  )
}

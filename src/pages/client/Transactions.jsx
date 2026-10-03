import { useEffect, useMemo, useState } from 'react'
import {
  createTransaction,
  createTransactions,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '../../lib/transactions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000'

const emptyForm = {
  type: 'expense',
  description: '',
  amount: '',
  category: '',
  transactionDate: new Date().toISOString().slice(0, 10),
}

const filters = [
  { value: 'all', label: 'Semua' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

const categoryOptions = [
  'Makanan',
  'Transportasi',
  'Belanja Harian',
  'Kesehatan',
  'Pendidikan',
  'Tagihan',
  'Hiburan',
  'Gaji',
  'Uang Jajan',
  'Lainnya',
]

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeAiPreview(transactions) {
  return transactions.map((transaction) => ({
    type: transaction.type === 'income' ? 'income' : 'expense',
    category: transaction.category || 'Lainnya',
    description: transaction.description || '',
    amount: transaction.amount === null || transaction.amount === undefined ? '' : String(transaction.amount),
    transactionDate: transaction.transaction_date || '',
  }))
}

async function parseTransactionsWithAi(text) {
  const response = await fetch(`${API_BASE_URL}/api/ai/parse-transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.message || 'AI gagal memproses transaksi.')
  }

  return Array.isArray(result?.data) ? result.data : []
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiPreview, setAiPreview] = useState([])
  const [aiError, setAiError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAiParsing, setIsAiParsing] = useState(false)
  const [isAiSaving, setIsAiSaving] = useState(false)
  const { theme } = useTheme()
  const { addToast } = useToast()

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

  async function loadTransactions(selectedFilter = filter, selectedSearch = search) {
    setIsLoading(true)

    try {
      const data = await getTransactions(selectedFilter, selectedSearch)
      setTransactions(data)
    } catch (err) {
      addToast(err.message || 'Gagal mengambil transaksi.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(filter, search)
  }, [filter, search])

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
      description: transaction.description || '',
      amount: transaction.amount,
      category: transaction.category || '',
      transactionDate: transaction.transaction_date,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editingId) {
        await updateTransaction(editingId, form)
        addToast('Transaksi berhasil diperbarui.', 'success')
      } else {
        await createTransaction(form)
        addToast('Transaksi berhasil ditambahkan.', 'success')
      }

      resetForm()
      await loadTransactions(filter, search)
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan transaksi.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTransaction(id)
      addToast('Transaksi berhasil dihapus.', 'success')
      await loadTransactions(filter, search)
    } catch (err) {
      addToast(err.message || 'Gagal menghapus transaksi.', 'error')
    }
  }

  async function handleAiParse(event) {
    event.preventDefault()
    setAiError('')
    setAiPreview([])
    setIsAiParsing(true)

    try {
      const parsedTransactions = await parseTransactionsWithAi(aiText)
      setAiPreview(normalizeAiPreview(parsedTransactions))
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
      await createTransactions(aiPreview.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        transactionDate: transaction.transactionDate || getToday(),
        source: 'ai_text',
      })))

      setAiText('')
      setAiPreview([])
      setIsAiOpen(false)
      addToast('Semua transaksi AI berhasil disimpan.', 'success')
      await loadTransactions(filter, search)
    } catch (err) {
      setAiError(err.message || 'Gagal menyimpan hasil AI.')
    } finally {
      setIsAiSaving(false)
    }
  }

  function openAiPanel() {
    setIsAiOpen(true)
    setAiError('')
  }

  function closeAiPanel() {
    if (isAiParsing || isAiSaving) {
      return
    }

    setIsAiOpen(false)
    setAiError('')
  }

  function updateAiPreview(index, field, value) {
    setAiPreview((current) => current.map((transaction, transactionIndex) => {
      if (transactionIndex !== index) {
        return transaction
      }

      return {
        ...transaction,
        [field]: value,
      }
    }))
  }

  function removeAiPreview(index) {
    setAiPreview((current) => current.filter((_, transactionIndex) => transactionIndex !== index))
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
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Dompet AI
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Transaksi</h2>
        </div>
        <button
          className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
          type="button"
          onClick={openAiPanel}
        >
          ✨ Catat dengan AI
        </button>
      </section>

      {/* Summary Cards */}
      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <svg className="w-5 h-5 text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Pemasukan</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(summary.income)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <svg className="w-5 h-5 text-red-700 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.expense)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                <svg className="w-5 h-5 text-blue-700 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Saldo</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.income - summary.expense)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AI Panel Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">AI Assistant</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ubah Kalimat Jadi Transaksi</h3>
              </div>
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                disabled={isAiParsing || isAiSaving}
                onClick={closeAiPanel}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleAiParse} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tulis transaksi dalam kalimat
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[120px]"
                    placeholder="Contoh: beli makan siang 35 ribu, bensin motor 20 ribu, dapat ongkos kerja 150 ribu"
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    required
                  />
                </div>
                <button
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-all"
                  disabled={isAiParsing}
                  type="submit"
                >
                  {isAiParsing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : '🔍 Proses dengan AI'}
                </button>
              </form>

              {aiError && (
                <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {aiError}
                </div>
              )}

              {aiPreview.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Preview Transaksi</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Edit atau hapus sebelum menyimpan</p>
                    </div>
                    <button
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-all"
                      disabled={isAiSaving || aiPreview.length === 0}
                      onClick={handleSaveAiPreview}
                    >
                      {isAiSaving ? '💾 Menyimpan...' : '✅ Simpan Semua'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {aiPreview.map((transaction, index) => (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4" key={index}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[120px_140px_1fr_120px_100px_auto]">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
                            <select
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                              value={transaction.type}
                              onChange={(e) => updateAiPreview(index, 'type', e.target.value)}
                            >
                              <option value="income">Income</option>
                              <option value="expense">Expense</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Kategori</label>
                            <select
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                              value={transaction.category}
                              onChange={(e) => updateAiPreview(index, 'category', e.target.value)}
                            >
                              {categoryOptions.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Deskripsi</label>
                            <input
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                              type="text"
                              value={transaction.description}
                              onChange={(e) => updateAiPreview(index, 'description', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Nominal</label>
                            <input
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                              min="0"
                              type="number"
                              value={transaction.amount}
                              onChange={(e) => updateAiPreview(index, 'amount', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Tanggal</label>
                            <input
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                              type="date"
                              value={transaction.transactionDate}
                              onChange={(e) => updateAiPreview(index, 'transactionDate', e.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              className="w-full rounded-lg border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                              onClick={() => removeAiPreview(index)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Form Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingId ? '✏️ Edit Transaksi' : '➕ Tambah Transaksi'}
          </h3>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
              <select
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="type"
                value={form.type}
                onChange={updateField}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="description"
                type="text"
                value={form.description}
                onChange={updateField}
                required
                placeholder="Contoh: Makan siang di warteg"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nominal</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                min="0"
                name="amount"
                type="number"
                value={form.amount}
                onChange={updateField}
                required
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="category"
                type="text"
                value={form.category}
                onChange={updateField}
                placeholder="Contoh: Makanan"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="transactionDate"
                type="date"
                value={form.transactionDate}
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
                {isSaving ? '⏳ Menyimpan...' : editingId ? '💾 Simpan' : '➕ Tambah'}
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

        {/* Transactions Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">📋 Daftar Transaksi</h3>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1">
              {filters.map((item) => (
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    filter === item.value
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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

          <div className="mb-4">
            <input
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="🔍 Cari transaksi..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Belum ada transaksi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pr-4 font-medium">Tanggal</th>
                    <th className="pb-3 pr-4 font-medium">Deskripsi</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Kategori</th>
                    <th className="pb-3 pr-4 text-right font-medium">Nominal</th>
                    <th className="pb-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {transactions.map((transaction) => (
                    <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/50" key={transaction.id}>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.transaction_date}</td>
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{transaction.description}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          transaction.type === 'income'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '📈' : '📉'} {transaction.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.category || '-'}</td>
                      <td className="py-3 pr-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          className="mr-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                          onClick={() => startEdit(transaction)}
                        >
                          ✏️
                        </button>
                        <button
                          className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

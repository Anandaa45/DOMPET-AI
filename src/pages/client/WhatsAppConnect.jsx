import { useEffect, useState } from 'react'
import { getCurrentProfile, updateWhatsAppNumber } from '../../lib/profiles'
import { createTransactions, getWhatsAppTextTransactions } from '../../lib/transactions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000'

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function normalizeParsedTransactions(transactions) {
  return transactions.map((transaction) => ({
    type: transaction.type === 'income' ? 'income' : 'expense',
    category: transaction.category || 'Lainnya',
    description: transaction.description || '',
    amount: transaction.amount === null || transaction.amount === undefined ? '' : String(transaction.amount),
    transactionDate: transaction.transaction_date || '',
  }))
}

async function parseTransactionText(text) {
  const response = await fetch(`${API_BASE_URL}/api/ai/parse-transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.message || 'Bot gagal membaca transaksi.')
  }

  return Array.isArray(result?.data) ? result.data : []
}

export default function WhatsAppConnect() {
  const [profile, setProfile] = useState(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Halo, ini simulator WhatsApp Dompet AI. Coba kirim: beli makan 15000 dan bensin 25000',
    },
  ])
  const [simulatorText, setSimulatorText] = useState('')
  const [parsedPreview, setParsedPreview] = useState([])
  const [previewMode, setPreviewMode] = useState('ai')
  const [simulatorError, setSimulatorError] = useState('')
  const [isBotLoading, setIsBotLoading] = useState(false)
  const [isSavingPreview, setIsSavingPreview] = useState(false)
  const [whatsappTransactions, setWhatsappTransactions] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)

      try {
        const data = await getCurrentProfile()
        setProfile(data)
        setWhatsappNumber(data.whatsapp_number || '')
      } catch (err) {
        addToast(err.message || 'Gagal memuat profil WhatsApp.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
    loadWhatsAppTransactions()
  }, [])

  async function loadWhatsAppTransactions() {
    setIsHistoryLoading(true)

    try {
      const data = await getWhatsAppTextTransactions()
      setWhatsappTransactions(data)
    } catch (err) {
      setSimulatorError(err.message || 'Gagal memuat riwayat transaksi WhatsApp.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      const normalizedNumber = normalizeWhatsAppNumber(whatsappNumber)
      const updatedProfile = await updateWhatsAppNumber(normalizedNumber)
      setProfile(updatedProfile)
      setWhatsappNumber(updatedProfile.whatsapp_number || '')
      addToast('Nomor WhatsApp berhasil disimpan.', 'success')
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan nomor WhatsApp.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true)

    try {
      const updatedProfile = await updateWhatsAppNumber('')
      setProfile(updatedProfile)
      setWhatsappNumber('')
      addToast('Koneksi WhatsApp berhasil diputus.', 'success')
    } catch (err) {
      addToast(err.message || 'Gagal memutuskan koneksi WhatsApp.', 'error')
    } finally {
      setIsDisconnecting(false)
    }
  }

  function normalizeWhatsAppNumber(value) {
    const number = value.trim().replace(/\s+/g, '')

    if (!number) {
      throw new Error('Nomor WhatsApp tidak boleh kosong.')
    }

    if (number.startsWith('+62')) {
      return number
    }

    if (number.startsWith('08')) {
      return `+628${number.slice(2)}`
    }

    throw new Error('Nomor WhatsApp harus diawali +62 atau 08.')
  }

  async function handleSimulatorSubmit(event) {
    event.preventDefault()
    const text = simulatorText.trim()

    if (!text) {
      setSimulatorError('Pesan tidak boleh kosong.')
      return
    }

    setSimulatorError('')
    setParsedPreview([])
    setPreviewMode('ai')
    setSimulatorText('')
    setChatMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, sender: 'user', text },
    ])
    setIsBotLoading(true)

    try {
      const parsedTransactions = await parseTransactionText(text)
      const preview = normalizeParsedTransactions(parsedTransactions)
      setPreviewMode('ai')
      setParsedPreview(preview)
      setChatMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-bot`,
          sender: 'bot',
          text: preview.length > 0
            ? `Saya menemukan ${preview.length} transaksi. Periksa preview lalu simpan jika sudah benar.`
            : 'Saya belum menemukan transaksi dari pesan itu.',
        },
      ])
    } catch (err) {
      const message = err.message || 'Bot gagal membaca pesan.'
      setPreviewMode('manual')
      setParsedPreview([
        {
          type: 'expense',
          category: 'Lainnya',
          description: text,
          amount: '',
          transactionDate: '',
        },
      ])
      setSimulatorError(`${message} Isi transaksi manual di bawah, lalu klik Simpan Manual.`)
      setChatMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-bot-error`,
          sender: 'bot',
          text: 'AI sedang tidak bisa memproses pesan. Saya siapkan form manual dari pesan kamu.',
        },
      ])
    } finally {
      setIsBotLoading(false)
    }
  }

  function updatePreview(index, field, value) {
    setParsedPreview((current) => current.map((transaction, transactionIndex) => {
      if (transactionIndex !== index) {
        return transaction
      }

      return {
        ...transaction,
        [field]: value,
      }
    }))
  }

  function removePreview(index) {
    setParsedPreview((current) => current.filter((_, transactionIndex) => transactionIndex !== index))
  }

  async function handleSavePreview() {
    setSimulatorError('')
    setIsSavingPreview(true)

    try {
      if (parsedPreview.some((transaction) => transaction.amount === '')) {
        throw new Error('Amount wajib diisi sebelum transaksi disimpan.')
      }

      await createTransactions(parsedPreview.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        transactionDate: transaction.transactionDate || getToday(),
        source: 'whatsapp_text',
      })))
      setParsedPreview([])
      setPreviewMode('ai')
      await loadWhatsAppTransactions()
      setChatMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-saved`,
          sender: 'bot',
          text: previewMode === 'manual'
            ? 'Transaksi berhasil disimpan secara manual.'
            : 'Transaksi berhasil disimpan.',
        },
      ])
    } catch (err) {
      setSimulatorError(err.message || 'Gagal menyimpan transaksi.')
    } finally {
      setIsSavingPreview(false)
    }
  }

  const isConnected = Boolean(profile?.whatsapp_number)

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">💬 WhatsApp Bot</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Hubungkan WhatsApp untuk mencatat transaksi via chat.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* WhatsApp Config Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Status nomor</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {isLoading ? 'Memuat...' : isConnected ? 'Terhubung' : 'Belum terhubung'}
              </h3>
            </div>
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                isConnected
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}
            >
              {isConnected ? '✅ Terhubung' : '⚠️ Belum terhubung'}
            </span>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nomor saat ini</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {profile?.whatsapp_number || '-'}
            </p>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nomor WhatsApp
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="+6281234567890"
                type="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                required
              />
            </div>

            <button
              className="w-full rounded-xl bg-emerald-600 dark:bg-emerald-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
              disabled={isLoading || isSaving}
              type="submit"
            >
              {isSaving ? '⏳ Menyimpan...' : '💾 Simpan nomor WhatsApp'}
            </button>

            {isConnected ? (
              <button
                className="w-full rounded-xl border border-red-200 dark:border-red-800 px-4 py-3 font-semibold text-red-600 dark:text-red-400 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                disabled={isDisconnecting}
                type="button"
                onClick={handleDisconnect}
              >
                {isDisconnecting ? '⏳ Memutuskan...' : '🔌 Putuskan koneksi'}
              </button>
            ) : null}
          </form>
        </div>

        {/* Chat Simulator */}
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">🤖 WhatsApp Simulator</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Coba alur chat tanpa menghubungkan WhatsApp Cloud API.
            </p>

            {/* Chat Container */}
            <div className="mt-5 flex h-[420px] flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#e7f3ee] dark:bg-slate-900">
              {/* Chat Header */}
              <div className="border-b border-emerald-100 dark:border-slate-700 bg-emerald-700 dark:bg-emerald-600 px-4 py-3 text-sm font-bold text-white">
                💬 Dompet AI Bot
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {chatMessages.map((message) => (
                  <div
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    key={message.id}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        message.sender === 'user'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                {isBotLoading ? (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Bot sedang membaca pesan...
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Chat Input */}
              <form className="flex gap-2 border-t border-emerald-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3" onSubmit={handleSimulatorSubmit}>
                <input
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="beli makan 15000 dan bensin 25000"
                  type="text"
                  value={simulatorText}
                  onChange={(event) => setSimulatorText(event.target.value)}
                />
                <button
                  className="rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
                  disabled={isBotLoading}
                  type="submit"
                >
                  📤 Kirim
                </button>
              </form>
            </div>

            {simulatorError ? (
              <p className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                ⚠️ {simulatorError}
              </p>
            ) : null}

            {parsedPreview.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {previewMode === 'manual' ? '📝 Form manual fallback' : '👀 Preview transaksi'}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {previewMode === 'manual'
                        ? 'AI gagal memproses pesan, tetapi transaksi tetap bisa dicatat manual.'
                        : 'Edit hasil parsing sebelum disimpan.'}
                    </p>
                  </div>
                  <button
                    className="rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
                    disabled={isSavingPreview}
                    type="button"
                    onClick={handleSavePreview}
                  >
                    {isSavingPreview
                      ? '⏳ Menyimpan...'
                      : previewMode === 'manual'
                        ? '💾 Simpan Manual'
                        : '✅ Simpan ke Transaksi'}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {parsedPreview.map((transaction, index) => (
                    <div className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 md:grid-cols-2 xl:grid-cols-[110px_1fr_1.4fr_120px_150px_auto]" key={`preview-${index}`}>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Type</span>
                        <select
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          value={transaction.type}
                          onChange={(event) => updatePreview(index, 'type', event.target.value)}
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Category</span>
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          value={transaction.category}
                          onChange={(event) => updatePreview(index, 'category', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</span>
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          value={transaction.description}
                          onChange={(event) => updatePreview(index, 'description', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Amount</span>
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          min="0"
                          type="number"
                          value={transaction.amount}
                          onChange={(event) => updatePreview(index, 'amount', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Transaction date</span>
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          type="date"
                          value={transaction.transactionDate}
                          onChange={(event) => updatePreview(index, 'transactionDate', event.target.value)}
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          className="w-full rounded-xl border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          type="button"
                          onClick={() => removePreview(index)}
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">📋 Riwayat transaksi WhatsApp</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Transaksi yang disimpan dari simulator chat.</p>
              </div>
              <button
                className="rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                type="button"
                onClick={loadWhatsAppTransactions}
              >
                🔄 Refresh
              </button>
            </div>

            <div className="mt-5">
              {isHistoryLoading ? (
                <SkeletonCard className="rounded-2xl">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Memuat riwayat transaksi...</p>
                    </div>
                  </div>
                </SkeletonCard>
              ) : whatsappTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-8 text-center">
                  <p className="font-bold text-slate-900 dark:text-white">Belum ada transaksi WhatsApp.</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Kirim pesan di simulator lalu simpan hasil parsing untuk melihat riwayat di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {whatsappTransactions.map((transaction) => (
                    <div
                      className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={transaction.id}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              transaction.type === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            📅 {transaction.transaction_date || '-'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            🏷️ {transaction.category || 'Lainnya'}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-slate-900 dark:text-white">
                          {transaction.description || 'Tanpa deskripsi'}
                        </p>
                      </div>
                      <p className="text-left font-bold text-slate-900 dark:text-white sm:text-right">
                        💵 {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">📚 Contoh chat ke bot</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                'beli makan 15000 dan bensin 25000',
                'dapat uang jajan 100 ribu',
                'kopi 15k dan parkir 3k',
              ].map((message) => (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4" key={message}>
                  <p className="text-sm text-slate-500 dark:text-slate-400">💬 Kirim pesan:</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">"{message}"</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10 p-4">
              <p className="font-bold text-emerald-800 dark:text-emerald-300">🚧 Tahap awal</p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                Simulator ini belum terhubung ke WhatsApp Cloud API dan belum memakai webhook. WhatsApp asli akan dihubungkan setelah backend webhook siap.
              </p>
            </div>
          </section>
        </section>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getCurrentProfile, updateWhatsAppNumber } from '../../lib/profiles'
import { createTransactions, getWhatsAppTextTransactions } from '../../lib/transactions'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

  useEffect(() => {
    async function loadProfile() {
      setError('')
      setIsLoading(true)

      try {
        const data = await getCurrentProfile()
        setProfile(data)
        setWhatsappNumber(data.whatsapp_number || '')
      } catch (err) {
        setError(err.message || 'Gagal memuat profil WhatsApp.')
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
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      const normalizedNumber = normalizeWhatsAppNumber(whatsappNumber)
      const updatedProfile = await updateWhatsAppNumber(normalizedNumber)
      setProfile(updatedProfile)
      setWhatsappNumber(updatedProfile.whatsapp_number || '')
      setSuccess('Nomor WhatsApp berhasil disimpan.')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan nomor WhatsApp.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDisconnect() {
    setError('')
    setSuccess('')
    setIsDisconnecting(true)

    try {
      const updatedProfile = await updateWhatsAppNumber('')
      setProfile(updatedProfile)
      setWhatsappNumber('')
      setSuccess('Koneksi WhatsApp berhasil diputus.')
    } catch (err) {
      setError(err.message || 'Gagal memutuskan koneksi WhatsApp.')
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
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">WhatsApp Connect</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Simpan nomor WhatsApp yang akan dipakai untuk bot Dompet AI.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Status nomor</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">
                {isLoading ? 'Memuat...' : isConnected ? 'Terhubung' : 'Belum terhubung'}
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isConnected ? 'Terhubung' : 'Belum terhubung'}
            </span>
          </div>

          <div className="mt-5 rounded-md bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Nomor saat ini</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {profile?.whatsapp_number || '-'}
            </p>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nomor WhatsApp</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="+6281234567890"
                type="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
            ) : null}

            <button
              className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading || isSaving}
              type="submit"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan nomor WhatsApp'}
            </button>

            {isConnected ? (
              <button
                className="w-full rounded-md border border-red-200 px-4 py-2 font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDisconnecting}
                type="button"
                onClick={handleDisconnect}
              >
                {isDisconnecting ? 'Memutuskan...' : 'Putuskan koneksi'}
              </button>
            ) : null}
          </form>
        </div>

        <section className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">WhatsApp Simulator</h3>
            <p className="mt-2 text-sm text-slate-600">
              Coba alur chat tanpa menghubungkan WhatsApp Cloud API.
            </p>

            <div className="mt-5 flex h-[420px] flex-col rounded-lg border border-slate-200 bg-[#e7f3ee]">
              <div className="border-b border-emerald-100 bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                Dompet AI Bot
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {chatMessages.map((message) => (
                  <div
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    key={message.id}
                  >
                    <div
                      className={`max-w-[82%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                        message.sender === 'user'
                          ? 'bg-emerald-100 text-slate-950'
                          : 'bg-white text-slate-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                {isBotLoading ? (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
                      Bot sedang membaca pesan...
                    </div>
                  </div>
                ) : null}
              </div>
              <form className="flex gap-2 border-t border-emerald-100 bg-white p-3" onSubmit={handleSimulatorSubmit}>
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="beli makan 15000 dan bensin 25000"
                  type="text"
                  value={simulatorText}
                  onChange={(event) => setSimulatorText(event.target.value)}
                />
                <button
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={isBotLoading}
                  type="submit"
                >
                  Kirim
                </button>
              </form>
            </div>

            {simulatorError ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{simulatorError}</p>
            ) : null}

            {parsedPreview.length > 0 ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-950">
                      {previewMode === 'manual' ? 'Form manual fallback' : 'Preview transaksi'}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {previewMode === 'manual'
                        ? 'AI gagal memproses pesan, tetapi transaksi tetap bisa dicatat manual.'
                        : 'Edit hasil parsing sebelum disimpan.'}
                    </p>
                  </div>
                  <button
                    className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isSavingPreview}
                    type="button"
                    onClick={handleSavePreview}
                  >
                    {isSavingPreview
                      ? 'Menyimpan...'
                      : previewMode === 'manual'
                        ? 'Simpan Manual'
                        : 'Simpan ke Transaksi'}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {parsedPreview.map((transaction, index) => (
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-[110px_1fr_1.4fr_120px_150px_auto]" key={`preview-${index}`}>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Type</span>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={transaction.type}
                          onChange={(event) => updatePreview(index, 'type', event.target.value)}
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Category</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={transaction.category}
                          onChange={(event) => updatePreview(index, 'category', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Description</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={transaction.description}
                          onChange={(event) => updatePreview(index, 'description', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Amount</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          min="0"
                          type="number"
                          value={transaction.amount}
                          onChange={(event) => updatePreview(index, 'amount', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Transaction date</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          type="date"
                          value={transaction.transactionDate}
                          onChange={(event) => updatePreview(index, 'transactionDate', event.target.value)}
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                          type="button"
                          onClick={() => removePreview(index)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Riwayat transaksi WhatsApp</h3>
                <p className="mt-1 text-sm text-slate-600">Transaksi yang disimpan dari simulator chat.</p>
              </div>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={loadWhatsAppTransactions}
              >
                Refresh
              </button>
            </div>

            <div className="mt-5">
              {isHistoryLoading ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Memuat riwayat transaksi...
                </div>
              ) : whatsappTransactions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
                  <p className="font-medium text-slate-950">Belum ada transaksi WhatsApp.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Kirim pesan di simulator lalu simpan hasil parsing untuk melihat riwayat di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {whatsappTransactions.map((transaction) => (
                    <div
                      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={transaction.id}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              transaction.type === 'income'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {transaction.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {transaction.transaction_date || '-'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {transaction.category || 'Lainnya'}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-slate-950">
                          {transaction.description || 'Tanpa deskripsi'}
                        </p>
                      </div>
                      <p className="text-left font-semibold text-slate-950 sm:text-right">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Contoh chat ke bot</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                'beli makan 15000 dan bensin 25000',
                'dapat uang jajan 100 ribu',
                'kopi 15k dan parkir 3k',
              ].map((message) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={message}>
                  <p className="text-sm text-slate-500">Kirim pesan:</p>
                  <p className="mt-1 font-medium text-slate-950">"{message}"</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-800">Tahap awal</p>
              <p className="mt-1 text-sm text-emerald-700">
                Simulator ini belum terhubung ke WhatsApp Cloud API dan belum memakai webhook. WhatsApp asli akan dihubungkan setelah backend webhook siap.
              </p>
            </div>
          </section>
        </section>
      </section>
    </div>
  )
}

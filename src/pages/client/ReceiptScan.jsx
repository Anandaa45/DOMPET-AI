import { useEffect, useState } from 'react'
import { readReceiptText } from '../../lib/ocr'
import { createReceiptTransaction, getReceiptScanTransactions } from '../../lib/transactions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'

const emptyForm = {
  merchantName: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  category: '',
  description: '',
  amount: '',
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000'

function cleanOcrLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseAmount(value) {
  const cleaned = value.replace(/[^\d.,]/g, '')

  if (!cleaned) {
    return ''
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  }

  if (cleaned.includes(',')) {
    return Number(cleaned.replace(',', '.'))
  }

  return Number(cleaned.replace(/\./g, ''))
}

function getAmountFromTotal(text) {
  const totalLine = cleanOcrLines(text)
    .filter((line) => /total/i.test(line))
    .at(-1)
  const totalMatch = totalLine?.match(/(\d[\d.,]*)\s*$/)

  if (!totalMatch) {
    return ''
  }

  const amount = parseAmount(totalMatch[1])

  return Number.isFinite(amount) ? String(amount) : ''
}

function buildFormFromOcr(text) {
  const lines = cleanOcrLines(text)
  const merchantName = lines[0] || ''
  const amount = getAmountFromTotal(text)

  return {
    merchantName,
    category: 'Belanja Harian',
    description: merchantName ? `Belanja di ${merchantName}` : '',
    amount,
  }
}

async function parseReceiptWithAi(ocrText) {
  const response = await fetch(`${API_BASE_URL}/api/ai/parse-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ocrText }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.message || 'AI gagal membaca nota.')
  }

  return result?.data || result
}

function buildFormFromAi(receipt) {
  return {
    merchantName: receipt?.merchant_name || '',
    transactionDate: receipt?.transaction_date || '',
    category: receipt?.category || '',
    description: receipt?.description || '',
    amount: receipt?.amount === null || receipt?.amount === undefined ? '' : String(receipt.amount),
  }
}

export default function ReceiptScan() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [receiptItems, setReceiptItems] = useState([])
  const [receiptTransactions, setReceiptTransactions] = useState([])
  const [aiError, setAiError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [isParsingAi, setIsParsingAi] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    loadReceiptTransactions()
  }, [])

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  async function loadReceiptTransactions() {
    setIsLoading(true)

    try {
      const data = await getReceiptScanTransactions()
      setReceiptTransactions(data)
    } catch (err) {
      addToast(err.message || 'Gagal memuat riwayat scan nota.', 'error')
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

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]

    setOcrText('')
    setOcrProgress(0)
    setAiError('')
    setReceiptItems([])

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setFile(null)
      addToast('File harus berupa gambar.', 'error')
      return
    }

    setFile(selectedFile)
    setForm(emptyForm)
  }

  async function fillFormWithAi(text) {
    setAiError('')
    setIsParsingAi(true)

    try {
      const receipt = await parseReceiptWithAi(text)
      const parsedFields = buildFormFromAi(receipt)

      setReceiptItems(Array.isArray(receipt?.items) ? receipt.items : [])
      setForm((current) => ({
        ...current,
        merchantName: parsedFields.merchantName || current.merchantName,
        transactionDate: parsedFields.transactionDate || current.transactionDate,
        category: parsedFields.category || current.category,
        description: parsedFields.description || current.description,
        amount: parsedFields.amount || current.amount,
      }))
    } catch (err) {
      setAiError(err.message || 'AI gagal membaca nota. Kamu tetap bisa isi form manual.')
    } finally {
      setIsParsingAi(false)
    }
  }

  async function handleReadReceipt() {
    setAiError('')
    setReceiptItems([])

    if (!file) {
      addToast('Pilih gambar nota terlebih dahulu.', 'error')
      return
    }

    setIsReading(true)
    setOcrProgress(0)

    try {
      const text = await readReceiptText(file, setOcrProgress)
      setOcrText(text)

      if (!text) {
        addToast('Teks nota tidak terbaca. Coba gunakan foto yang lebih jelas.', 'error')
        return
      }

      const parsedFields = buildFormFromOcr(text)
      setForm((current) => ({
        ...current,
        merchantName: parsedFields.merchantName || current.merchantName,
        category: current.category || parsedFields.category,
        description: current.description || parsedFields.description,
        amount: parsedFields.amount || current.amount,
      }))

      await fillFormWithAi(text)
    } catch (err) {
      addToast(err.message || 'Gagal membaca nota dengan OCR.', 'error')
    } finally {
      setIsReading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setAiError('')

    if (!file) {
      addToast('Pilih gambar nota terlebih dahulu.', 'error')
      return
    }

    setIsUploading(true)

    try {
      await createReceiptTransaction(
        {
          ...form,
          type: 'expense',
          source: 'receipt_scan',
        },
        file,
      )
      setForm(emptyForm)
      setFile(null)
      setOcrText('')
      setOcrProgress(0)
      setAiError('')
      setReceiptItems([])
      event.target.reset()
      addToast('Nota berhasil diupload dan transaksi tersimpan.', 'success')
      await loadReceiptTransactions()
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan scan nota.', 'error')
    } finally {
      setIsUploading(false)
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
      {/* Header */}
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">📷 Receipt Scan</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Upload foto nota, isi detail transaksi, lalu simpan sebagai expense.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* Upload Form */}
        <form className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload nota</h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Foto nota
              </label>
              <input
                accept="image/*"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                type="file"
                onChange={handleFileChange}
                required
              />
            </div>

            {/* Image Preview */}
            <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
              {previewUrl ? (
                <img
                  alt="Preview nota"
                  className="max-h-80 w-full object-contain"
                  src={previewUrl}
                />
              ) : (
                <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  Preview gambar nota akan tampil di sini.
                </div>
              )}
            </div>

            {/* OCR Button */}
            <button
              className="w-full rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
              disabled={!file || isReading || isParsingAi || isUploading}
              type="button"
              onClick={handleReadReceipt}
            >
              {isReading ? `Membaca nota ${ocrProgress}%` : '📸 Baca Nota'}
            </button>

            {/* OCR Progress */}
            {isReading ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  OCR sedang membaca teks dari gambar nota...
                </p>
              </div>
            ) : null}

            {/* AI Parsing Indicator */}
            {isParsingAi ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                🤖 AI sedang merapikan hasil OCR menjadi data transaksi...
              </div>
            ) : null}

            {/* OCR Text */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Hasil teks OCR
              </label>
              <textarea
                className="mt-1 min-h-36 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Hasil OCR akan tampil setelah tombol Baca Nota diklik."
                value={ocrText}
                onChange={(event) => setOcrText(event.target.value)}
              />
            </div>

            {/* AI Error */}
            {aiError ? (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                ⚠️ {aiError}
              </p>
            ) : null}

            {/* Receipt Items */}
            {receiptItems.length > 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">🧾 Items dari nota</p>
                <div className="mt-3 space-y-2">
                  {receiptItems.map((item, index) => (
                    <div
                      className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
                      key={`${item.item_name}-${index}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{item.item_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.quantity || 1}</p>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.price || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Merchant name
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="merchantName"
                type="text"
                value={form.merchantName}
                onChange={updateField}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Transaction date
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="transactionDate"
                type="date"
                value={form.transactionDate}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="category"
                type="text"
                value={form.category}
                onChange={updateField}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                name="description"
                type="text"
                value={form.description}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Amount
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                min="0"
                name="amount"
                type="number"
                value={form.amount}
                onChange={updateField}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            className="mt-5 w-full rounded-xl bg-emerald-600 dark:bg-emerald-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
            disabled={isUploading}
            type="submit"
          >
            {isUploading ? '⏳ Mengupload...' : '💾 Upload dan Simpan'}
          </button>
        </form>

        {/* History Table */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">📋 Riwayat scan nota</h3>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4 font-medium">Tanggal</th>
                  <th className="py-3 pr-4 font-medium">Merchant</th>
                  <th className="py-3 pr-4 font-medium">Deskripsi</th>
                  <th className="py-3 pr-4 font-medium">Kategori</th>
                  <th className="py-3 pr-4 text-right font-medium">Nominal</th>
                  <th className="py-3 text-right font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500 dark:text-slate-400" colSpan="6">
                      <div className="flex justify-center">
                        <SkeletonCard />
                      </div>
                    </td>
                  </tr>
                ) : receiptTransactions.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-slate-500 dark:text-slate-400" colSpan="6">
                      Belum ada scan nota.
                    </td>
                  </tr>
                ) : (
                  receiptTransactions.map((transaction) => (
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50" key={transaction.id}>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.transaction_date}</td>
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{transaction.merchant_name || '-'}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.description}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.category || '-'}</td>
                      <td className="py-3 pr-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 text-right">
                        {transaction.receipt_image_url ? (
                          <a
                            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            href={transaction.receipt_image_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            👁️ Lihat
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
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

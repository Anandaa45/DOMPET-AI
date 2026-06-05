import { useEffect, useState } from 'react'
import { readReceiptText } from '../../lib/ocr'
import { createReceiptTransaction, getReceiptScanTransactions } from '../../lib/transactions'

const emptyForm = {
  merchantName: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  category: '',
  description: '',
  amount: '',
}

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

export default function ReceiptScan() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [receiptTransactions, setReceiptTransactions] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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
    setError('')
    setIsLoading(true)

    try {
      const data = await getReceiptScanTransactions()
      setReceiptTransactions(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat scan nota.')
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

    setError('')
    setSuccess('')
    setOcrText('')
    setOcrProgress(0)

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setFile(null)
      setError('File harus berupa gambar.')
      return
    }

    setFile(selectedFile)
    setForm(emptyForm)
  }

  async function handleReadReceipt() {
    setError('')
    setSuccess('')

    if (!file) {
      setError('Pilih gambar nota terlebih dahulu.')
      return
    }

    setIsReading(true)
    setOcrProgress(0)

    try {
      const text = await readReceiptText(file, setOcrProgress)
      setOcrText(text)

      if (!text) {
        setError('Teks nota tidak terbaca. Coba gunakan foto yang lebih jelas.')
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
    } catch (err) {
      setError(err.message || 'Gagal membaca nota dengan OCR.')
    } finally {
      setIsReading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('Pilih gambar nota terlebih dahulu.')
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
      event.target.reset()
      setSuccess('Nota berhasil diupload dan transaksi tersimpan.')
      await loadReceiptTransactions()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan scan nota.')
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
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Receipt Scan</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Upload foto nota, isi detail transaksi, lalu simpan sebagai expense.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-slate-950">Upload nota</h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Foto nota</span>
              <input
                accept="image/*"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:font-medium file:text-emerald-700"
                type="file"
                onChange={handleFileChange}
                required
              />
            </label>

            <div className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
              {previewUrl ? (
                <img
                  alt="Preview nota"
                  className="max-h-80 w-full object-contain"
                  src={previewUrl}
                />
              ) : (
                <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-slate-500">
                  Preview gambar nota akan tampil di sini.
                </div>
              )}
            </div>

            <button
              className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!file || isReading || isUploading}
              type="button"
              onClick={handleReadReceipt}
            >
              {isReading ? `Membaca nota ${ocrProgress}%` : 'Baca Nota'}
            </button>

            {isReading ? (
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  OCR sedang membaca teks dari gambar nota.
                </p>
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Hasil teks OCR</span>
              <textarea
                className="mt-1 min-h-36 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Hasil OCR akan tampil setelah tombol Baca Nota diklik."
                value={ocrText}
                onChange={(event) => setOcrText(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Merchant name</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="merchantName"
                type="text"
                value={form.merchantName}
                onChange={updateField}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Transaction date</span>
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
              <span className="text-sm font-medium text-slate-700">Category</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="category"
                type="text"
                value={form.category}
                onChange={updateField}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="description"
                type="text"
                value={form.description}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Amount</span>
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
          </div>

          {error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          ) : null}

          <button
            className="mt-5 w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isUploading}
            type="submit"
          >
            {isUploading ? 'Mengupload...' : 'Upload dan simpan'}
          </button>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Riwayat scan nota</h3>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">Tanggal</th>
                  <th className="py-3 pr-4 font-medium">Merchant</th>
                  <th className="py-3 pr-4 font-medium">Deskripsi</th>
                  <th className="py-3 pr-4 font-medium">Kategori</th>
                  <th className="py-3 pr-4 text-right font-medium">Nominal</th>
                  <th className="py-3 text-right font-medium">Nota</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan="6">
                      Memuat riwayat scan...
                    </td>
                  </tr>
                ) : receiptTransactions.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-slate-500" colSpan="6">
                      Belum ada scan nota.
                    </td>
                  </tr>
                ) : (
                  receiptTransactions.map((transaction) => (
                    <tr className="border-b border-slate-100" key={transaction.id}>
                      <td className="py-3 pr-4 text-slate-600">{transaction.transaction_date}</td>
                      <td className="py-3 pr-4 text-slate-600">{transaction.merchant_name || '-'}</td>
                      <td className="py-3 pr-4 font-medium text-slate-950">{transaction.description}</td>
                      <td className="py-3 pr-4 text-slate-600">{transaction.category || '-'}</td>
                      <td className="py-3 pr-4 text-right font-medium text-slate-950">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 text-right">
                        {transaction.receipt_image_url ? (
                          <a
                            className="font-medium text-emerald-700"
                            href={transaction.receipt_image_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
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

import { useEffect, useState } from 'react'
import { parseReceiptWithGemini } from '../../lib/gemini'
import { readReceiptText } from '../../lib/ocr'
import { createReceiptTransaction } from '../../lib/transactions'

function buildTransactionFromReceipt(receipt) {
  return {
    type: 'expense',
    title: receipt.description || receipt.merchantName || 'Transaksi nota',
    amount: receipt.amount,
    category: receipt.category || 'Lainnya',
    transactionDate: receipt.transactionDate,
    notes: receipt.merchantName ? `Merchant: ${receipt.merchantName}` : '',
  }
}

const initialOcrProgress = 0

const emptyReceipt = null

const emptyTransaction = {
  type: 'expense',
  title: '',
  amount: '',
  category: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

export default function ReceiptScan() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(initialOcrProgress)
  const [receiptPreview, setReceiptPreview] = useState(emptyReceipt)
  const [transactionPreview, setTransactionPreview] = useState(emptyTransaction)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  function updateField(event) {
    setTransactionPreview((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]

    setError('')
    setSuccess('')
    setOcrText('')
    setOcrProgress(initialOcrProgress)
    setReceiptPreview(emptyReceipt)
    setTransactionPreview(emptyTransaction)

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
  }

  async function handleReadReceipt() {
    setError('')
    setSuccess('')

    if (!file) {
      setError('Pilih foto nota terlebih dahulu.')
      return
    }

    setIsReading(true)
    setIsParsing(false)
    setOcrProgress(initialOcrProgress)
    setReceiptPreview(emptyReceipt)

    try {
      const text = await readReceiptText(file, setOcrProgress)
      setOcrText(text)

      if (!text) {
        throw new Error('Teks nota tidak terbaca. Coba gunakan foto yang lebih jelas.')
      }

      setIsParsing(true)
      const receipt = await parseReceiptWithGemini(text)
      setReceiptPreview(receipt)
      setTransactionPreview(buildTransactionFromReceipt(receipt))
    } catch (err) {
      setError(err.message || 'Gagal membaca nota.')
    } finally {
      setIsReading(false)
      setIsParsing(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('Pilih foto nota terlebih dahulu.')
      return
    }

    if (!receiptPreview) {
      setError('Jalankan OCR dan cek preview sebelum menyimpan.')
      return
    }

    setIsUploading(true)

    try {
      await createReceiptTransaction(transactionPreview, file)
      setTransactionPreview(emptyTransaction)
      setReceiptPreview(emptyReceipt)
      setOcrText('')
      setOcrProgress(initialOcrProgress)
      setFile(null)
      event.target.reset()
      setSuccess('Nota berhasil diupload dan transaksi tersimpan.')
    } catch (err) {
      setError(err.message || 'Gagal upload nota.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Receipt Scan</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Pilih foto nota, jalankan OCR, cek hasil AI, lalu simpan ke Dompet AI.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
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

            <button
              className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!file || isReading || isParsing || isUploading}
              type="button"
              onClick={handleReadReceipt}
            >
              {isReading ? `OCR ${ocrProgress}%` : isParsing ? 'Parsing dengan AI...' : 'Baca nota dengan OCR'}
            </button>

            {ocrText ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Hasil teks OCR</span>
                <textarea
                  className="mt-1 min-h-40 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
                  readOnly
                  value={ocrText}
                />
              </label>
            ) : null}
          </div>

          {receiptPreview ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                Preview AI
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Merchant</dt>
                  <dd className="font-medium text-slate-950">{receiptPreview.merchantName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Tanggal</dt>
                  <dd className="font-medium text-slate-950">{receiptPreview.transactionDate}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Nominal</dt>
                  <dd className="font-medium text-slate-950">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(receiptPreview.amount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Kategori</dt>
                  <dd className="font-medium text-slate-950">{receiptPreview.category}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Deskripsi</dt>
                  <dd className="mt-1 font-medium text-slate-950">{receiptPreview.description}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-950">Preview transaksi</h3>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="type"
                value={transactionPreview.type}
                onChange={updateField}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Judul</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="title"
                type="text"
                value={transactionPreview.title}
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
                value={transactionPreview.amount}
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
                value={transactionPreview.category}
                onChange={updateField}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tanggal</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="transactionDate"
                type="date"
                value={transactionPreview.transactionDate}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Catatan</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="notes"
                value={transactionPreview.notes}
                onChange={updateField}
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
            disabled={isUploading || !receiptPreview}
            type="submit"
          >
            {isUploading ? 'Mengupload nota...' : 'Upload dan simpan'}
          </button>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Preview nota</h3>
              <p className="text-sm text-slate-500">Gambar belum diupload sebelum tombol simpan ditekan.</p>
            </div>
            {isReading || isParsing || isUploading ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                {isReading ? 'OCR' : isParsing ? 'AI' : 'Uploading'}
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            {previewUrl ? (
              <img
                alt="Preview nota"
                className="max-h-[560px] w-full rounded-md object-contain"
                src={previewUrl}
              />
            ) : (
              <p className="text-center text-sm text-slate-500">
                Pilih file gambar untuk melihat preview nota.
              </p>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}

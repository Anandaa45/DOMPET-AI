import { useEffect, useState } from 'react'
import { createReceiptTransaction } from '../../lib/transactions'

const emptyForm = {
  type: 'expense',
  title: '',
  amount: '',
  category: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

export default function ReceiptScan() {
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]

    setError('')
    setSuccess('')

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

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('Pilih foto nota terlebih dahulu.')
      return
    }

    setIsUploading(true)

    try {
      await createReceiptTransaction(form, file)
      setForm(emptyForm)
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
          Upload foto nota, isi detail transaksi, lalu simpan ke Dompet AI.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-slate-950">Transaksi dari nota</h3>

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

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                name="type"
                value={form.type}
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
          {success ? (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          ) : null}

          <button
            className="mt-5 w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isUploading}
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
            {isUploading ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Uploading
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

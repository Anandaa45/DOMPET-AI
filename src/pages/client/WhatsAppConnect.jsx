import { useEffect, useState } from 'react'
import { getCurrentProfile, updateWhatsAppNumber } from '../../lib/profiles'

export default function WhatsAppConnect() {
  const [profile, setProfile] = useState(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      const updatedProfile = await updateWhatsAppNumber(whatsappNumber)
      setProfile(updatedProfile)
      setSuccess('Nomor WhatsApp berhasil disimpan.')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan nomor WhatsApp.')
    } finally {
      setIsSaving(false)
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
          Hubungkan nomor WhatsApp untuk mencatat transaksi lewat bot Dompet AI.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
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
              {isConnected ? 'Active' : 'Pending'}
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
                placeholder="6281234567890"
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
          </form>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Contoh chat ke bot</h3>
          <p className="mt-2 text-sm text-slate-600">
            Setelah nomor terhubung, kamu bisa mencatat transaksi dengan format natural.
          </p>

          <div className="mt-5 space-y-3">
            {[
              'beli makan 15000',
              'bensin motor 25000',
              'gaji bulan ini 5000000',
              'bayar listrik 220000 kategori tagihan',
            ].map((message) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={message}>
                <p className="text-sm text-slate-500">Kirim pesan:</p>
                <p className="mt-1 font-medium text-slate-950">"{message}"</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-medium text-emerald-800">Tips</p>
            <p className="mt-1 text-sm text-emerald-700">
              Gunakan format nomor Indonesia dengan awalan 62 agar bot lebih mudah mencocokkan akun.
            </p>
          </div>
        </section>
      </section>
    </div>
  )
}

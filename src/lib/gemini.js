const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
const geminiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

function getGeminiApiKey() {
  if (!geminiApiKey) {
    throw new Error('Isi VITE_GEMINI_API_KEY di file .env terlebih dahulu.')
  }

  return geminiApiKey
}

function extractJson(text) {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)

  if (match?.[1]) {
    return JSON.parse(match[1])
  }

  throw new Error('Gemini tidak mengembalikan JSON yang valid.')
}

function normalizeTransaction(transaction) {
  const today = new Date().toISOString().slice(0, 10)
  const type = transaction.type === 'income' ? 'income' : 'expense'

  return {
    type,
    title: String(transaction.title || '').trim(),
    amount: Number(transaction.amount || 0),
    category: String(transaction.category || '').trim(),
    transactionDate: transaction.transactionDate || today,
    notes: String(transaction.notes || '').trim(),
  }
}

function normalizeReceiptTransaction(receipt) {
  const today = new Date().toISOString().slice(0, 10)

  return {
    merchantName: String(receipt.merchant_name || '').trim(),
    transactionDate: receipt.transaction_date || today,
    amount: Number(receipt.amount || 0),
    category: String(receipt.category || '').trim(),
    description: String(receipt.description || '').trim(),
  }
}

export async function parseTransactionsWithGemini(text) {
  const apiKey = getGeminiApiKey()
  const prompt = `
Ubah kalimat transaksi keuangan berikut menjadi JSON.

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Format harus: {"transactions":[...]}
- Setiap item punya field: type, title, amount, category, transactionDate, notes.
- type hanya "income" atau "expense".
- Jika kalimat berisi pembelian/pengeluaran, gunakan type "expense".
- Jika kalimat berisi gaji, bonus, transfer masuk, pemasukan, gunakan type "income".
- amount harus angka tanpa pemisah ribuan.
- transactionDate pakai format YYYY-MM-DD. Jika tidak ada tanggal, pakai tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.
- notes boleh string kosong.

Kalimat user:
"${text}"
`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gemini API gagal: ${message}`)
  }

  const data = await response.json()
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!resultText) {
    throw new Error('Gemini tidak mengembalikan hasil parsing.')
  }

  const parsed = extractJson(resultText)
  const transactions = Array.isArray(parsed) ? parsed : parsed.transactions

  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('Tidak ada transaksi yang bisa diparse dari kalimat tersebut.')
  }

  return transactions.map(normalizeTransaction).filter((transaction) => {
    return transaction.title && transaction.amount > 0
  })
}

export async function parseReceiptWithGemini(ocrText) {
  const apiKey = getGeminiApiKey()
  const prompt = `
Ekstrak data nota dari teks OCR berikut menjadi JSON.

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Format harus:
  {
    "merchant_name": "nama merchant",
    "transaction_date": "YYYY-MM-DD",
    "amount": 0,
    "category": "kategori",
    "description": "deskripsi singkat"
  }
- amount adalah total akhir transaksi, angka tanpa pemisah ribuan.
- Jika tanggal tidak jelas, gunakan tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.
- category pilih kategori ringkas seperti Makanan, Transportasi, Belanja, Kesehatan, Tagihan, Hiburan, Lainnya.
- description ringkas, cocok dipakai sebagai judul transaksi.
- Jika merchant tidak jelas, isi "Nota".

Teks OCR:
${ocrText}
`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gemini API gagal: ${message}`)
  }

  const data = await response.json()
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!resultText) {
    throw new Error('Gemini tidak mengembalikan hasil parsing nota.')
  }

  const parsed = extractJson(resultText)
  const receipt = normalizeReceiptTransaction(parsed)

  if (!receipt.amount || receipt.amount <= 0) {
    throw new Error('Total transaksi tidak ditemukan dari hasil OCR.')
  }

  return receipt
}

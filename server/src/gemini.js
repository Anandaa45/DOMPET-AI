const geminiApiKey = process.env.GEMINI_API_KEY
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

function getGeminiApiKey() {
  if (!geminiApiKey) {
    throw new Error('Missing GEMINI_API_KEY.')
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

  throw new Error('Gemini did not return valid JSON.')
}

function normalizeTransaction(transaction) {
  const today = new Date().toISOString().slice(0, 10)
  const type = transaction.type === 'income' ? 'income' : 'expense'

  return {
    type,
    description: String(transaction.description || transaction.title || '').trim(),
    amount: Number(transaction.amount || 0),
    category: String(transaction.category || '').trim() || null,
    transaction_date: transaction.transactionDate || today,
    source: 'whatsapp_text',
  }
}

function normalizeReceipt(receipt) {
  const today = new Date().toISOString().slice(0, 10)

  return {
    merchant: String(receipt.merchant || receipt.merchant_name || 'Nota').trim(),
    total: Number(receipt.total || receipt.amount || 0),
    transactionDate: receipt.transaction_date || receipt.transactionDate || today,
    category: String(receipt.category || 'Lainnya').trim(),
    description: String(receipt.description || '').trim(),
  }
}

export async function parseTransactionsFromMessage(messageText) {
  const apiKey = getGeminiApiKey()
  const prompt = `
Ubah pesan WhatsApp transaksi keuangan berikut menjadi JSON.

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Format harus: {"transactions":[...]}
- Setiap item punya field: type, description, amount, category, transactionDate.
- type hanya "income" atau "expense".
- Jika pesan berisi pembelian/pengeluaran, gunakan type "expense".
- Jika pesan berisi gaji, bonus, transfer masuk, pemasukan, gunakan type "income".
- amount harus angka tanpa pemisah ribuan.
- transactionDate pakai format YYYY-MM-DD. Jika tidak ada tanggal, pakai tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.
- category ringkas, misalnya Makanan, Transportasi, Belanja, Tagihan, Gaji, Lainnya.
- description berisi deskripsi transaksi singkat.

Pesan WhatsApp:
"${messageText}"
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
    throw new Error(`Gemini API failed: ${message}`)
  }

  const data = await response.json()
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!resultText) {
    throw new Error('Gemini did not return parsed transactions.')
  }

  const parsed = extractJson(resultText)
  const transactions = Array.isArray(parsed) ? parsed : parsed.transactions

  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('No transactions found in WhatsApp message.')
  }

  return transactions.map(normalizeTransaction).filter((transaction) => {
    return transaction.description && transaction.amount > 0
  })
}

export async function parseReceiptFromOcrText(ocrText) {
  const apiKey = getGeminiApiKey()
  const prompt = `
Ekstrak data transaksi dari teks OCR nota berikut menjadi JSON.

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Format harus:
  {
    "merchant": "nama merchant",
    "total": 0,
    "transaction_date": "YYYY-MM-DD",
    "category": "kategori",
    "description": "deskripsi transaksi"
  }
- total adalah grand total/total akhir yang dibayar, angka tanpa pemisah ribuan.
- transaction_date pakai format YYYY-MM-DD. Jika tidak ada tanggal, pakai tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.
- category ringkas, misalnya Makanan, Transportasi, Belanja, Tagihan, Kesehatan, Hiburan, Lainnya.
- description cocok dipakai sebagai judul transaksi.
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
    throw new Error(`Gemini API failed: ${message}`)
  }

  const data = await response.json()
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!resultText) {
    throw new Error('Gemini did not return parsed receipt.')
  }

  const receipt = normalizeReceipt(extractJson(resultText))

  if (!receipt.total || receipt.total <= 0) {
    throw new Error('Receipt total was not found.')
  }

  return receipt
}

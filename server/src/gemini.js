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

  // Clean up amount - support decimal (id: 25.000 or int: 25000)
  const rawAmount = String(transaction.amount || '0').replace(/[^\d]/g, '')
  let amount = 0
  if (rawAmount.length > 3) {
    // Likely Indonesian format with thousand separator (25.000 → 25000)
    amount = parseInt(rawAmount)
  } else {
    // Direct number (25000 or 25.50)
    amount = parseFloat(rawAmount) || 0
  }

  // Normalize category to match UI options
  const categoryMap = {
    'makanan & minuman': 'Makanan',
    'makanan': 'Makanan',
    'makanan dan minuman': 'Makanan',
    'transportasi': 'Transportasi',
    'belanja harian': 'Belanja Harian',
    'belanja': 'Belanja Harian',
    'kesehatan': 'Kesehatan',
    'pendidikan': 'Pendidikan',
    'tagihan': 'Tagihan',
    'hiburan': 'Hiburan',
    'gaji': 'Gaji',
    'uang jajan': 'Uang Jajan',
    'hadiah': 'Hadiah',
    'lainnya': 'Lainnya',
  }

  const rawCategory = String(transaction.category || '').toLowerCase().trim()
  const category = categoryMap[rawCategory] || rawCategory || 'Lainnya'

  return {
    type,
    description: String(transaction.description || transaction.title || '').trim(),
    amount: isNaN(amount) ? 0 : amount,
    category,
    transaction_date: transaction.transactionDate || today,
    source: 'whatsapp_text',
  }
}

function normalizeReceipt(receipt) {
  const today = new Date().toISOString().slice(0, 10)

  // Clean up total - support decimal (id: 25.000 or int: 25000)
  const rawTotal = String(receipt.total || receipt.amount || '0').replace(/[^\d]/g, '')
  let total = 0
  if (rawTotal.length > 3) {
    // Likely Indonesian format with thousand separator (25.000 → 25000)
    total = parseInt(rawTotal)
  } else {
    // Direct number (25000 or 25.50)
    total = parseFloat(rawTotal) || 0
  }

  // Normalize category to match UI options
  const categoryMap = {
    'makanan & minuman': 'Makanan',
    'makanan': 'Makanan',
    'makanan dan minuman': 'Makanan',
    'transportasi': 'Transportasi',
    'belanja harian': 'Belanja Harian',
    'belanja': 'Belanja Harian',
    'kesehatan': 'Kesehatan',
    'pendidikan': 'Pendidikan',
    'tagihan': 'Tagihan',
    'hiburan': 'Hiburan',
    'lainnya': 'Lainnya',
  }

  const rawCategory = String(receipt.category || 'Lainnya').toLowerCase().trim()
  const category = categoryMap[rawCategory] || rawCategory || 'Lainnya'

  return {
    merchant: String(receipt.merchant || receipt.merchant_name || 'Nota').trim(),
    total: isNaN(total) ? 0 : total,
    transactionDate: receipt.transaction_date || receipt.transactionDate || today,
    category,
    description: String(receipt.description || '').trim(),
  }
}

export async function parseTransactionsFromMessage(messageText) {
  const apiKey = getGeminiApiKey()
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `
Ubah pesan WhatsApp transaksi keuangan berikut menjadi JSON.

Aturan:
- Balas HANYA JSON valid, tanpa markdown, tanpa penjelasan tambahan.
- Format harus: {"transactions":[...]}
- Setiap item punya field: type, description, amount, category, transactionDate.
- type HANYA "income" atau "expense".
- Jika pesan berisi pembelian/pengeluaran, gunakan type "expense".
- Jika pesan berisi gaji, bonus, transfer masuk, pemasukan, hadiah, gunakan type "income".
- amount harus angka tanpa pemisah ribuan (contoh: 25000 bukan 25.000).
- transactionDate pakai format YYYY-MM-DD. Jika tidak ada tanggal, pakai tanggal hari ini: ${today}.
- category WAJIB pilih dari daftar berikut:
  * expense: Makanan, Transportasi, Belanja Harian, Kesehatan, Pendidikan, Tagihan, Hiburan, Lainnya
  * income: Gaji, Uang Jajan, Hadiah, Lainnya
- description berisi deskripsi transaksi singkat dalam bahasa Indonesia.
- Jika ada multiple transactions, pisahkan dalam array.
- Jika pesan tidak jelas atau tidak berisi transaksi, kembalikan array kosong: {"transactions":[]}

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
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `
Ekstrak data transaksi dari teks OCR nota/receipt berikut menjadi JSON.

Aturan:
- Balas HANYA JSON valid, tanpa markdown, tanpa penjelasan tambahan.
- Format harus:
  {
    "merchant": "nama merchant/toko",
    "total": 0,
    "transaction_date": "YYYY-MM-DD",
    "category": "kategori",
    "description": "deskripsi transaksi singkat"
  }
- total adalah GRAND TOTAL / TOTAL YANG HARUS DIBAYAR / AMOUNT DUE - angka tanpa pemisah ribuan.
- transaction_date pakai format YYYY-MM-DD. Cari tanggal dari nota (format: DD/MM/YYYY atau YYYY-MM-DD atau hari-bulan-tahun). Jika tidak ada, pakai: ${today}.
- category WAJIB pilih dari daftar berikut sesuai jenis transaksi:
  * Makanan & Minuman: restoran, kafe, makanan, minuman, snack
  * Transportasi: ojol, taksi, bensin, parkir, toll
  * Belanja Harian: supermarket, mart, belanja bulanan
  * Kesehatan: apotek, dokter, rumah sakit, obat
  * Pendidikan: sekolah, kursus, buku
  * Tagihan: listrik, air, internet, telepon, pulsa
  * Hiburan: bioskop, game, streaming, wisata
  * Lainnya: kategori lain yang tidak termasuk di atas
- description berisi deskripsi singkat transaksi (max 50 karakter).
- Jika merchant tidak jelas dari nota, isi nama toko atau "Nota".

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

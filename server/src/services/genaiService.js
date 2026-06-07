import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'

const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const aiRequestTimeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 25000)
const allowedCategories = new Set([
  'Makanan',
  'Transportasi',
  'Belanja Harian',
  'Kesehatan',
  'Pendidikan',
  'Tagihan',
  'Hiburan',
  'Gaji',
  'Uang Jajan',
  'Lainnya',
])
const transactionResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      type: {
        type: 'string',
        enum: ['income', 'expense'],
      },
      category: {
        type: 'string',
        enum: [
          'Makanan',
          'Transportasi',
          'Belanja Harian',
          'Kesehatan',
          'Pendidikan',
          'Tagihan',
          'Hiburan',
          'Gaji',
          'Uang Jajan',
          'Lainnya',
        ],
      },
      description: {
        type: 'string',
      },
      amount: {
        type: 'number',
      },
      transaction_date: {
        anyOf: [
          {
            type: 'string',
            format: 'date',
          },
          {
            type: 'null',
          },
        ],
      },
    },
    required: ['type', 'category', 'description', 'amount', 'transaction_date'],
  },
}
const retryableStatusCodes = new Set([429, 500, 502, 503, 504])

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function withTimeout(promise, timeoutMs) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Gemini request timeout after ${timeoutMs}ms.`)
      error.name = 'GeminiTimeoutError'
      error.status = 504
      reject(error)
    }, timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId)
  })
}

function getGenAiClient() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.')
  }

  if (apiKey.startsWith('sk-')) {
    throw new Error('GEMINI_API_KEY berisi OpenAI API key. Isi GEMINI_API_KEY dengan API key Gemini dari Google AI Studio.')
  }

  return new GoogleGenAI({ apiKey })
}

function extractJson(text) {
  const trimmed = String(text || '').trim()

  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed)
    }

    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)

    if (match?.[1]) {
      return JSON.parse(match[1])
    }
  } catch (error) {
    throw new Error('Gemini mengembalikan JSON yang tidak valid.')
  }

  throw new Error('Gemini tidak mengembalikan JSON valid.')
}

function nullableString(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed || null
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function normalizeDate(value) {
  const date = nullableString(value)

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }

  return date
}

function normalizeCategory(value) {
  const category = nullableString(value)

  if (!category || !allowedCategories.has(category)) {
    return 'Lainnya'
  }

  return category
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => ({
    item_name: nullableString(item?.item_name) || '',
    quantity: nullableNumber(item?.quantity) ?? 1,
    price: nullableNumber(item?.price) ?? 0,
  })).filter((item) => item.item_name)
}

function normalizeReceipt(receipt) {
  const merchantName = nullableString(receipt.merchant_name)

  return {
    merchant_name: merchantName,
    transaction_date: normalizeDate(receipt.transaction_date),
    category: normalizeCategory(receipt.category),
    description: nullableString(receipt.description) || (merchantName ? `Belanja di ${merchantName}` : ''),
    amount: nullableNumber(receipt.amount),
    items: normalizeItems(receipt.items),
  }
}

function normalizeTransaction(transaction) {
  const type = transaction?.type === 'income' ? 'income' : 'expense'
  const amount = nullableNumber(transaction?.amount)

  return {
    type,
    category: normalizeCategory(transaction?.category),
    description: nullableString(transaction?.description) || '',
    amount,
    transaction_date: normalizeDate(transaction?.transaction_date),
  }
}

function buildReceiptPrompt(text) {
  return `
Ekstrak data transaksi dari teks OCR nota berikut menjadi JSON valid.

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Format:
  {
    "merchant_name": string | null,
    "transaction_date": string | null,
    "category": string,
    "description": string,
    "amount": number | null,
    "items": [
      {
        "item_name": string,
        "quantity": number,
        "price": number
      }
    ]
  }
- transaction_date wajib format YYYY-MM-DD.
- amount adalah grand total/total akhir yang dibayar, angka tanpa simbol rupiah dan tanpa pemisah ribuan.
- Jangan mengarang data yang tidak terlihat pada teks OCR.
- Jika merchant_name, transaction_date, amount, atau items tidak ditemukan, gunakan null atau array kosong.
- category wajib salah satu dari: Makanan, Transportasi, Belanja Harian, Kesehatan, Pendidikan, Tagihan, Hiburan, Lainnya.
- Jika kategori tidak jelas, gunakan Lainnya.
- description singkat berdasarkan data yang terlihat; jika tidak jelas, isi string kosong.

Teks OCR:
${text}
`
}

function buildTransactionPrompt(text) {
  return `
Ubah teks transaksi bahasa Indonesia berikut menjadi array JSON valid.

Aturan:
- Balas hanya JSON valid, tanpa markdown.
- Respons harus langsung berupa array:
  [
    {
      "type": "income" | "expense",
      "category": string,
      "description": string,
      "amount": number,
      "transaction_date": string | null
    }
  ]
- Jika teks berisi beberapa transaksi, pisahkan menjadi beberapa object.
- Tentukan income atau expense berdasarkan makna kalimat.
- amount harus number tanpa Rp, titik, atau koma.
- "ribu", "rb", dan "k" berarti dikali 1000.
- "juta" berarti dikali 1000000.
- transaction_date gunakan format YYYY-MM-DD.
- Jika tanggal tidak disebutkan, gunakan null.
- Jangan mengarang nominal.
- Jika nominal tidak ditemukan, balas array kosong [].
- category wajib salah satu dari:
  Makanan, Transportasi, Belanja Harian, Kesehatan, Pendidikan, Tagihan, Hiburan, Gaji, Uang Jajan, Lainnya.
- Gunakan Gaji untuk gaji/upah/salary, Uang Jajan untuk uang jajan/saku.
- Description singkat dan natural dari transaksi.

Contoh:
Teks: beli makan 20 ribu dan bensin 30 ribu
Output:
[
  {
    "type": "expense",
    "category": "Makanan",
    "description": "Beli makan",
    "amount": 20000,
    "transaction_date": null
  },
  {
    "type": "expense",
    "category": "Transportasi",
    "description": "Bensin",
    "amount": 30000,
    "transaction_date": null
  }
]

Teks:
${text}
`
}

function getErrorStatus(error) {
  if (typeof error?.status === 'number') {
    return error.status
  }

  if (typeof error?.code === 'number') {
    return error.code
  }

  const match = String(error?.message || '').match(/"code"\s*:\s*(\d+)/)
  return match ? Number(match[1]) : null
}

function formatErrorCause(cause) {
  if (!cause) {
    return null
  }

  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
    }
  }

  return cause
}

function logAiError(error) {
  console.error('Gemini AI error detail:', {
    name: error?.name,
    message: error?.message,
    cause: formatErrorCause(error?.cause),
    stack: error?.stack,
  })
}

function isRetryableError(error) {
  const status = getErrorStatus(error)

  if (retryableStatusCodes.has(status)) {
    return true
  }

  if (!status && /fetch failed|network|timeout|ECONN|ETIMEDOUT|ENOTFOUND/i.test(String(error?.message || ''))) {
    return true
  }

  return false
}

function createAiError(error) {
  logAiError(error)

  const status = getErrorStatus(error)

  if (error?.message?.startsWith('Missing ')) {
    const configError = new Error(error.message)
    configError.status = 500
    return configError
  }

  const rawMessage = String(error?.message || '')

  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid/i.test(rawMessage)) {
    const authError = new Error('GEMINI_API_KEY tidak valid atau tidak punya akses ke model yang dipakai.')
    authError.status = status
    return authError
  }

  if (status === 400) {
    const badRequestError = new Error('Request AI ditolak. Cek format input atau konfigurasi model Gemini.')
    badRequestError.status = 400
    return badRequestError
  }

  if (status === 429) {
    const rateLimitError = new Error('Limit AI sedang tercapai. Tunggu sebentar lalu coba lagi.')
    rateLimitError.status = 429
    return rateLimitError
  }

  if (status === 503) {
    const busyError = new Error('AI sedang sibuk. Coba lagi beberapa saat.')
    busyError.status = 503
    return busyError
  }

  const causeMessage = String(error?.cause?.message || '')

  if (/EAI_AGAIN|ENOTFOUND|getaddrinfo/i.test(causeMessage)) {
    const dnsError = new Error('Backend tidak bisa menghubungi Gemini karena DNS/jaringan gagal resolve generativelanguage.googleapis.com. Cek koneksi internet, DNS, proxy, atau VPN.')
    dnsError.status = 502
    return dnsError
  }

  const detail = String(error?.message || causeMessage || '').replace(/\s+/g, ' ').slice(0, 280)
  const aiError = new Error(detail ? `AI gagal memproses data: ${detail}` : 'AI gagal memproses data. Coba lagi beberapa saat.')
  aiError.status = status || 502
  return aiError
}

async function generateJsonWithRetry(prompt, config = {}) {
  let lastError = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const ai = getGenAiClient()
      const response = await withTimeout(
        ai.models.generateContent({
          model: geminiModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            ...config,
          },
        }),
        aiRequestTimeoutMs,
      )
      const text = response.text

      if (!text) {
        throw new Error('Gemini tidak mengembalikan respons.')
      }

      return text
    } catch (error) {
      lastError = error

      if (!isRetryableError(error) || attempt === 2) {
        break
      }

      await wait(800 * (attempt + 1))
    }
  }

  throw createAiError(lastError)
}

export async function parseReceiptWithGenAi(ocrText) {
  const text = String(ocrText || '').trim()

  if (!text) {
    throw new Error('OCR text is required.')
  }

  const prompt = buildReceiptPrompt(text)

  const responseText = await generateJsonWithRetry(prompt)
  const parsed = normalizeReceipt(extractJson(responseText))
  return parsed
}

export async function parseTransactionWithGenAi(transactionText) {
  const text = String(transactionText || '').trim()

  if (!text) {
    throw new Error('Transaction text is required.')
  }

  const prompt = buildTransactionPrompt(text)
  const responseText = await generateJsonWithRetry(prompt)
  const parsed = extractJson(responseText)
  const transactions = Array.isArray(parsed) ? parsed : parsed.transactions

  if (!Array.isArray(transactions)) {
    throw new Error('Gemini tidak mengembalikan daftar transaksi valid.')
  }

  const normalizedTransactions = transactions
    .map(normalizeTransaction)
    .filter((transaction) => transaction.description && transaction.amount && transaction.amount > 0)

  if (normalizedTransactions.length === 0) {
    const error = new Error('Nominal transaksi tidak ditemukan. Tulis nominal seperti 20000, 20 ribu, 20rb, 20k, atau 1 juta.')
    error.status = 422
    throw error
  }

  return normalizedTransactions
}

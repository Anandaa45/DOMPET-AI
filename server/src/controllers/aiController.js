import { parseReceiptWithGenAi, parseTransactionWithGenAi } from '../services/genaiService.js'

const MAX_OCR_TEXT_LENGTH = 12000
const MAX_TRANSACTION_TEXT_LENGTH = 2000
const transactionAmountPattern = /\d+\s*(?:ribu|rb|k|juta)?|\d+/i

export async function parseReceipt(req, res, next) {
  try {
    const { ocrText } = req.body || {}

    if (typeof ocrText !== 'string') {
      const error = new Error('ocrText wajib berupa string.')
      error.status = 400
      throw error
    }

    if (!ocrText.trim()) {
      const error = new Error('ocrText tidak boleh kosong.')
      error.status = 400
      throw error
    }

    if (ocrText.length > MAX_OCR_TEXT_LENGTH) {
      const error = new Error(`ocrText terlalu panjang. Maksimal ${MAX_OCR_TEXT_LENGTH} karakter.`)
      error.status = 413
      throw error
    }

    const receipt = await parseReceiptWithGenAi(ocrText)

    res.json({
      ok: true,
      data: receipt,
    })
  } catch (error) {
    next(error)
  }
}

export async function parseTransaction(req, res, next) {
  try {
    const { text } = req.body || {}

    if (typeof text !== 'string') {
      const error = new Error('text wajib berupa string.')
      error.status = 400
      throw error
    }

    if (!text.trim()) {
      const error = new Error('text tidak boleh kosong.')
      error.status = 400
      throw error
    }

    if (text.length > MAX_TRANSACTION_TEXT_LENGTH) {
      const error = new Error(`text terlalu panjang. Maksimal ${MAX_TRANSACTION_TEXT_LENGTH} karakter.`)
      error.status = 413
      throw error
    }

    if (!transactionAmountPattern.test(text)) {
      const error = new Error('Nominal transaksi tidak ditemukan. Tulis nominal seperti 20000, 20 ribu, 20rb, 20k, atau 1 juta.')
      error.status = 422
      throw error
    }

    const transactions = await parseTransactionWithGenAi(text)

    res.json({
      ok: true,
      data: transactions,
    })
  } catch (error) {
    next(error)
  }
}

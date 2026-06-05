import { parseReceiptFromOcrText, parseTransactionsFromMessage } from './gemini.js'
import { logSystemEvent } from './logger.js'
import { readReceiptTextFromBuffer } from './ocr.js'
import { getSupabaseClient } from './supabase.js'
import { downloadWhatsAppMedia, sendWhatsAppText } from './whatsapp.js'

function normalizeWhatsAppNumber(number) {
  return String(number || '').replace(/\D/g, '')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function getExtensionFromContentType(contentType) {
  if (contentType.includes('png')) {
    return 'png'
  }

  if (contentType.includes('webp')) {
    return 'webp'
  }

  return 'jpg'
}

async function findProfileByWhatsAppNumber(senderNumber) {
  const supabase = getSupabaseClient()
  const normalizedSender = normalizeWhatsAppNumber(senderNumber)
  const candidates = [
    normalizedSender,
    `+${normalizedSender}`,
    normalizedSender.startsWith('62') ? `0${normalizedSender.slice(2)}` : normalizedSender,
  ]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, whatsapp_number')
    .in('whatsapp_number', [...new Set(candidates)])
    .limit(1)

  if (error) {
    throw error
  }

  return data[0] || null
}

export async function processWhatsAppTextMessage(message) {
  const supabase = getSupabaseClient()
  const senderNumber = message.from
  const text = message.text?.body?.trim()

  if (!senderNumber || !text) {
    return
  }

  await logSystemEvent('whatsapp_message', 'Incoming WhatsApp text message.', {
    metadata: {
      message_id: message.id,
      type: message.type,
    },
  })

  const profile = await findProfileByWhatsAppNumber(senderNumber)

  if (!profile) {
    await sendWhatsAppText(
      senderNumber,
      'Nomor WhatsApp ini belum terhubung ke akun Dompet AI. Buka halaman WhatsApp Connect lalu simpan nomor kamu terlebih dahulu.',
    )
    return
  }

  const parsedTransactions = await parseTransactionsFromMessage(text)
  await logSystemEvent('ai_process', 'Gemini parsed WhatsApp text transaction.', {
    metadata: {
      message_id: message.id,
      transaction_count: parsedTransactions.length,
    },
  })

  if (parsedTransactions.length === 0) {
    await sendWhatsAppText(senderNumber, 'Maaf, Dompet AI belum bisa membaca transaksi dari pesan itu.')
    return
  }

  const rows = parsedTransactions.map((transaction) => ({
    ...transaction,
    user_id: profile.id,
  }))

  const { data, error } = await supabase.from('transactions').insert(rows).select()

  if (error) {
    throw error
  }

  const summary = data
    .map((transaction) => {
      return `- ${transaction.title}: ${formatCurrency(transaction.amount)} (${transaction.type})`
    })
    .join('\n')

  await sendWhatsAppText(
    senderNumber,
    `Transaksi berhasil dicatat di Dompet AI:\n${summary}`,
  )
}

async function uploadReceiptImage({ buffer, contentType, userId, mediaId }) {
  const supabase = getSupabaseClient()
  const extension = getExtensionFromContentType(contentType)
  const filePath = `${userId}/whatsapp-${Date.now()}-${mediaId}.${extension}`

  const { error } = await supabase.storage.from('receipts').upload(filePath, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)

  return data.publicUrl
}

export async function processWhatsAppImageMessage(message) {
  const supabase = getSupabaseClient()
  const senderNumber = message.from
  const mediaId = message.image?.id

  if (!senderNumber || !mediaId) {
    return
  }

  const profile = await findProfileByWhatsAppNumber(senderNumber)

  if (!profile) {
    await sendWhatsAppText(
      senderNumber,
      'Nomor WhatsApp ini belum terhubung ke akun Dompet AI. Buka halaman WhatsApp Connect lalu simpan nomor kamu terlebih dahulu.',
    )
    return
  }

  await sendWhatsAppText(senderNumber, 'Foto nota diterima. Dompet AI sedang membaca nota kamu...')
  await logSystemEvent('whatsapp_message', 'Incoming WhatsApp image message.', {
    metadata: {
      message_id: message.id,
      type: message.type,
    },
  })

  const media = await downloadWhatsAppMedia(mediaId)
  const receiptImageUrl = await uploadReceiptImage({
    ...media,
    userId: profile.id,
    mediaId,
  })
  const ocrText = await readReceiptTextFromBuffer(media.buffer)
  await logSystemEvent('ocr_process', 'OCR processed WhatsApp receipt image.', {
    metadata: {
      message_id: message.id,
    },
  })

  if (!ocrText) {
    await sendWhatsAppText(senderNumber, 'Maaf, teks pada foto nota belum terbaca. Coba kirim foto yang lebih jelas.')
    return
  }

  const receipt = await parseReceiptFromOcrText(ocrText)
  await logSystemEvent('ai_process', 'Gemini parsed WhatsApp receipt OCR text.', {
    metadata: {
      message_id: message.id,
    },
  })
  const title = receipt.description || receipt.merchant || 'Transaksi nota'

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: profile.id,
      type: 'expense',
      title,
      amount: receipt.total,
      category: receipt.category || null,
      transaction_date: receipt.transactionDate,
      source: 'whatsapp_receipt',
      receipt_image_url: receiptImageUrl,
      notes: receipt.merchant ? `Merchant: ${receipt.merchant}` : null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  await sendWhatsAppText(
    senderNumber,
    `Nota berhasil discan dan dicatat:\n- Merchant: ${receipt.merchant}\n- Tanggal: ${data.transaction_date}\n- Total: ${formatCurrency(data.amount)}\n- Kategori: ${data.category || 'Lainnya'}`,
  )
}

import { parseTransactionsFromMessage } from './gemini.js'
import { getSupabaseClient } from './supabase.js'
import { sendWhatsAppText } from './whatsapp.js'

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

  const profile = await findProfileByWhatsAppNumber(senderNumber)

  if (!profile) {
    await sendWhatsAppText(
      senderNumber,
      'Nomor WhatsApp ini belum terhubung ke akun Dompet AI. Buka halaman WhatsApp Connect lalu simpan nomor kamu terlebih dahulu.',
    )
    return
  }

  const parsedTransactions = await parseTransactionsFromMessage(text)

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

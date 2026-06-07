import { getSupabaseClient } from './supabase'

async function getCurrentUserId(client) {
  const { data, error } = await client.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Kamu harus login terlebih dahulu.')
  }

  return data.user.id
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeTransactionPayload(values) {
  const type = values.type === 'income' || values.type === 'expense' ? values.type : null
  const amount = Number(values.amount)
  const description = String(values.description || '').trim()

  if (!type) {
    throw new Error('Type transaksi hanya boleh income atau expense.')
  }

  if (!description) {
    throw new Error('Deskripsi transaksi wajib diisi.')
  }

  if (!Number.isFinite(amount)) {
    throw new Error('Amount harus berupa angka.')
  }

  return {
    type,
    description,
    amount,
    category: values.category ? String(values.category).trim() : null,
    transaction_date: values.transactionDate || getToday(),
    merchant_name: values.merchantName ? String(values.merchantName).trim() : null,
  }
}

export async function getCurrentUserTransactions() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function getTransactions(filter = 'all', search = '') {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const keyword = search.trim()

  let query = client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('type', filter)
  }

  if (keyword) {
    query = query.or(`description.ilike.%${keyword}%,category.ilike.%${keyword}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data
}

export async function getTransactionsByMonth(year, month) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function getReceiptScanTransactions() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'receipt_scan')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function getWhatsAppTextTransactions() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'whatsapp_text')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function createTransaction(values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const payload = normalizeTransactionPayload(values)

  const { data, error } = await client
    .from('transactions')
    .insert({
      user_id: userId,
      ...payload,
      receipt_image_url: values.receiptImageUrl || null,
      source: values.source || 'manual',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function createTransactions(valuesList) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const rows = valuesList.map((values) => {
    const payload = normalizeTransactionPayload(values)

    return {
      user_id: userId,
      ...payload,
      receipt_image_url: values.receiptImageUrl || null,
      source: values.source || 'manual',
    }
  })

  const { data, error } = await client
    .from('transactions')
    .insert(rows)
    .select()

  if (error) {
    throw error
  }

  return data
}

export async function uploadReceiptImage(file) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const extension = file.name.split('.').pop() || 'jpg'
  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .toLowerCase()
  const filePath = `${userId}/${Date.now()}-${safeName}.${extension}`

  const { error } = await client.storage.from('receipts').upload(filePath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data } = client.storage.from('receipts').getPublicUrl(filePath)

  return data.publicUrl
}

export async function createReceiptTransaction(values, file) {
  const receiptImageUrl = await uploadReceiptImage(file)

  return createTransaction({
    ...values,
    receiptImageUrl,
    source: 'receipt_scan',
  })
}

export async function updateTransaction(id, values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const payload = normalizeTransactionPayload(values)
  const updates = {
    ...payload,
    updated_at: new Date().toISOString(),
  }

  if (Object.prototype.hasOwnProperty.call(values, 'receiptImageUrl')) {
    updates.receipt_image_url = values.receiptImageUrl || null
  }

  const { data, error } = await client
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteTransaction(id) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { error } = await client
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

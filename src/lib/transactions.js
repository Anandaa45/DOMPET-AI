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

export async function getTransactions(filter = 'all') {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  let query = client
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('type', filter)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data
}

export async function createTransaction(values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('transactions')
    .insert({
      user_id: userId,
      type: values.type,
      title: values.title,
      amount: Number(values.amount),
      category: values.category || null,
      transaction_date: values.transactionDate,
      notes: values.notes || null,
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
  const updates = {
    type: values.type,
    title: values.title,
    amount: Number(values.amount),
    category: values.category || null,
    transaction_date: values.transactionDate,
    notes: values.notes || null,
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

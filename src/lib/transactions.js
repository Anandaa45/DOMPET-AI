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
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateTransaction(id, values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('transactions')
    .update({
      type: values.type,
      title: values.title,
      amount: Number(values.amount),
      category: values.category || null,
      transaction_date: values.transactionDate,
      notes: values.notes || null,
      updated_at: new Date().toISOString(),
    })
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

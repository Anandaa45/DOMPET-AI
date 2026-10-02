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

export async function getCategories() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) {
    throw error
  }

  return data || []
}

export async function createCategory(values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('categories')
    .insert([{
      user_id: userId,
      name: values.name,
      emoji: values.emoji || '📦',
      type: values.type || 'expense',
      color: values.color || '#6b7280',
    }])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateCategory(id, values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('categories')
    .update({
      name: values.name,
      emoji: values.emoji || '📦',
      type: values.type || 'expense',
      color: values.color || '#6b7280',
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

export async function deleteCategory(id) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { error } = await client
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
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

export async function getCurrentProfile() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, whatsapp_number, role')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateWhatsAppNumber(whatsappNumber) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('profiles')
    .update({
      whatsapp_number: whatsappNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, full_name, email, whatsapp_number, role')
    .single()

  if (error) {
    throw error
  }

  return data
}

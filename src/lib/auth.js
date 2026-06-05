import { getSupabaseClient } from './supabase'

export async function registerClient({ fullName, email, whatsappNumber, password }) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        whatsapp_number: whatsappNumber,
        role: 'client',
      },
    },
  })

  if (error) {
    throw error
  }

  const userId = data.user?.id

  if (!userId) {
    throw new Error('Akun berhasil dibuat, tetapi user id belum tersedia dari Supabase Auth.')
  }

  if (!data.session) {
    return data
  }

  const { error: profileError } = await client.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    email,
    whatsapp_number: whatsappNumber,
    role: 'client',
  }, {
    onConflict: 'id',
  })

  if (profileError) {
    throw profileError
  }

  return data
}

export async function loginWithEmail({ email, password }) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, email, whatsapp_number, role')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  return { session: data.session, user: data.user, profile }
}

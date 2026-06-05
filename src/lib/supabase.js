import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env terlebih dahulu.')
  }

  return supabase
}

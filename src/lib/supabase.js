import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const normalizedSupabaseUrl = normalizeSupabaseUrl(supabaseUrl)
const isPlaceholderConfig =
  supabaseUrl === 'https://your-project-ref.supabase.co' ||
  supabaseAnonKey === 'your-supabase-anon-key'

export const supabase =
  normalizedSupabaseUrl && supabaseAnonKey && !isPlaceholderConfig
    ? createClient(normalizedSupabaseUrl, supabaseAnonKey)
    : null

function normalizeSupabaseUrl(url) {
  if (!url) {
    return ''
  }

  try {
    return new URL(url.trim()).origin
  } catch {
    return url.trim()
  }
}

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Isi .env root project dengan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY asli dari Supabase, lalu restart npm run dev.')
  }

  return supabase
}

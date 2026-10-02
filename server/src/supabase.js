import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

let supabaseService = null
let supabaseAnon = null

export function getSupabaseClient() {
  // Use service role key if available, fallback to anon key
  const key = supabaseServiceRoleKey || supabaseAnonKey
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY')
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')

  if (!supabaseService) {
    supabaseService = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return supabaseService
}

export function getAdminSupabase() {
  // Admin functions always use service role key (for SECURITY DEFINER bypass)
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured for admin operations')
  }
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')

  if (!supabaseService) {
    supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return supabaseService
}

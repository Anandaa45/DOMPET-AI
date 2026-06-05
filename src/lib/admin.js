import { getSupabaseClient } from './supabase'

export async function getAdminDashboardStats() {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('get_admin_dashboard_stats')

  if (error) {
    throw error
  }

  return data
}

export async function getAdminUsers() {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('get_admin_users')

  if (error) {
    throw error
  }

  return data
}

export async function getAdminLogs(limit = 50) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('get_admin_logs', {
    p_limit: limit,
  })

  if (error) {
    throw error
  }

  return data
}

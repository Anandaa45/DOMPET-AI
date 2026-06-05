import { getSupabaseClient } from './supabase.js'

export async function logSystemEvent(eventType, message, options = {}) {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('system_logs').insert({
      event_type: eventType,
      severity: options.severity || 'info',
      message,
      metadata: options.metadata || {},
    })
  } catch (error) {
    console.error('Failed to write system log:', error)
  }
}

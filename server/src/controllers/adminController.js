import { getAdminSupabase } from '../supabase.js'
import { logSystemEvent } from '../logger.js'

export async function getAdminDashboardStats(req, res, next) {
  try {
    const sb = getAdminSupabase()

    const { data: statsData, error: statsError } = await sb.rpc('get_admin_dashboard_stats')

    if (statsError) {
      console.error('RPC get_admin_dashboard_stats error:', statsError)
      // Fallback: compute manually
      const [profiles, transactionsToday, logs] = await Promise.all([
        sb.from('profiles').select('id'),
        sb.from('transactions').select('id').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
        sb.from('system_logs').select('id, event_type').eq('severity', 'error').order('created_at', { ascending: false }).limit(5),
      ])

      const result = {
        total_users: profiles?.data?.length || 0,
        active_users: 0,
        transactions_today: transactionsToday?.data?.length || 0,
        whatsapp_messages: 0,
        ai_ocr_processes: 0,
        latest_error_logs: (logs?.data || []).map(l => ({
          id: l.id,
          event_type: l.event_type,
          severity: 'error',
          message: l.message || '',
          created_at: new Date().toISOString(),
        })),
      }

      return res.json({ ok: true, data: result })
    }

    // Log the RPC call
    logSystemEvent('admin_dashboard_stats', 'Admin dashboard stats fetched', { caller: req.ip })

    res.json({ ok: true, data: statsData })
  } catch (error) {
    console.error('getAdminDashboardStats error:', error)
    next(error)
  }
}

export async function getAdminUsers(req, res, next) {
  try {
    const sb = getAdminSupabase()

    const { data, error } = await sb.rpc('get_admin_users')

    if (error) {
      console.error('RPC get_admin_users error:', error)
      const { data: profilesData, error: profilesError } = await sb.from('profiles').select('*').order('created_at', { ascending: false })
      if (profilesError) throw profilesError
      return res.json({ ok: true, data: profilesData })
    }

    logSystemEvent('admin_users_list', 'Admin users list fetched', { count: data?.length || 0 })
    res.json({ ok: true, data })
  } catch (error) {
    console.error('getAdminUsers error:', error)
    next(error)
  }
}

export async function getAdminLogs(req, res, next) {
  try {
    const sb = getAdminSupabase()
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)

    const { data, error } = await sb.rpc('get_admin_logs', { limit_count: limit })

    if (error) {
      console.error('RPC get_admin_logs error:', error)
      const { data: logsData, error: logsError } = await sb
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (logsError) throw logsError
      return res.json({ ok: true, data: logsData })
    }

    logSystemEvent('admin_logs_list', 'Admin logs fetched', { count: data?.length || 0, limit })
    res.json({ ok: true, data })
  } catch (error) {
    console.error('getAdminLogs error:', error)
    next(error)
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const sb = getAdminSupabase()
    const { userId, role } = req.body

    if (!userId || !role || !['client', 'super_admin'].includes(role)) {
      const error = new Error('userId dan role valid diperlukan')
      error.status = 400
      throw error
    }

    const { error } = await sb
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    logSystemEvent('admin_update_role', 'User role updated', { userId, role, caller: req.ip })
    res.json({ ok: true, message: 'Role berhasil diupdate' })
  } catch (error) {
    console.error('updateUserRole error:', error)
    next(error)
  }
}

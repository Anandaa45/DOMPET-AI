-- Fix: Drop existing functions first, then recreate

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS get_admin_logs(integer);

-- Create admin dashboard stats function
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_users', (SELECT COUNT(*) FROM profiles WHERE status = 'active'),
    'transactions_today', (SELECT COUNT(*) FROM transactions WHERE transaction_date::date = CURRENT_DATE),
    'whatsapp_messages', (SELECT COUNT(*) FROM system_logs WHERE event_type = 'whatsapp_message' AND created_at::date = CURRENT_DATE),
    'ai_ocr_processes', (SELECT COUNT(*) FROM system_logs WHERE event_type = 'ai_ocr' AND created_at::date = CURRENT_DATE),
    'latest_error_logs', (
      SELECT json_agg(json_build_object('id', id, 'event_type', event_type, 'message', message, 'created_at', created_at))
      FROM (SELECT id, event_type, message, created_at FROM system_logs WHERE severity = 'error' ORDER BY created_at DESC LIMIT 5) sub
    )
  ) INTO result;
  RETURN result;
END;
$func$;

-- Create admin users function
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN (SELECT json_agg(row_to_json(t)) FROM (
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.whatsapp_number,
      p.role,
      p.status,
      p.created_at,
      p.updated_at
    FROM profiles p
    ORDER BY p.created_at DESC
  ) t);
END;
$func$;

-- Create admin logs function
CREATE OR REPLACE FUNCTION get_admin_logs(limit_count INTEGER DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN (SELECT json_agg(row_to_json(t)) FROM (
    SELECT id, event_type, severity, message, metadata, created_at
    FROM system_logs
    ORDER BY created_at DESC
    LIMIT limit_count
  ) t);
END;
$func$;

-- Test the functions
SELECT get_admin_dashboard_stats();
SELECT get_admin_users();
SELECT get_admin_logs(5);

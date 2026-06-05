create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_logs_created_at_idx
on public.system_logs (created_at desc);

create index if not exists system_logs_event_type_idx
on public.system_logs (event_type);

alter table public.system_logs enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (
      select count(distinct user_id)
      from public.transactions
      where created_at >= now() - interval '30 days'
    ),
    'transactions_today', (
      select count(*)
      from public.transactions
      where created_at::date = current_date
    ),
    'whatsapp_messages', (
      select count(*)
      from public.system_logs
      where event_type = 'whatsapp_message'
    ),
    'ai_ocr_processes', (
      select count(*)
      from public.system_logs
      where event_type in ('ai_process', 'ocr_process')
    ),
    'latest_error_logs', coalesce((
      select jsonb_agg(row_to_json(logs))
      from (
        select id, event_type, severity, message, created_at
        from public.system_logs
        where severity = 'error'
        order by created_at desc
        limit 5
      ) logs
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

create or replace function public.get_admin_users()
returns table (
  id uuid,
  full_name text,
  email text,
  whatsapp_number text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Access denied';
  end if;

  return query
  select
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.whatsapp_number,
    profiles.role,
    profiles.created_at,
    profiles.updated_at
  from public.profiles
  order by profiles.created_at desc;
end;
$$;

create or replace function public.get_admin_logs(p_limit integer default 50)
returns table (
  id uuid,
  event_type text,
  severity text,
  message text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Access denied';
  end if;

  return query
  select
    system_logs.id,
    system_logs.event_type,
    system_logs.severity,
    system_logs.message,
    system_logs.metadata,
    system_logs.created_at
  from public.system_logs
  order by system_logs.created_at desc
  limit least(greatest(p_limit, 1), 100);
end;
$$;

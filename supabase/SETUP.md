# 🏦 Setup Supabase Schema — DOMPET AI

## Langkah 1: Buka Supabase Dashboard

1. Buka: **https://app.supabase.com/project/glmjghaocpdtvzubqphj/sql**
2. Klik **"New Query"**

## Langkah 2: Jalankan SQL Berikut Ini (Urutan Penting!)

Copy-paste semua SQL di bawah ini sekaligus, lalu klik **Run**.

```sql
-- ============================================
-- 1. TABLES
-- ============================================

-- profiles (sudah ada, tapi pastikan RLS policies benar)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  whatsapp_number text,
  role text not null default 'client' check (role in ('client', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  source text not null default 'manual',
  merchant_name text,
  receipt_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric(14, 2) not null check (limit_amount > 0),
  period text not null check (period in ('weekly', 'monthly')),
  start_date date not null,
  end_date date not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_date_range_check check (start_date <= end_date)
);

-- saving_goals
create table if not exists public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  deadline date,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '📦',
  type text not null check (type in ('expense', 'income', 'both')),
  color text not null default '#6b7280',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- system_logs
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index if not exists budgets_user_id_idx on public.budgets (user_id);
create index if not exists budgets_user_category_idx on public.budgets (user_id, category);
create index if not exists saving_goals_user_id_idx on public.saving_goals (user_id);
create index if not exists saving_goals_user_status_idx on public.saving_goals (user_id, status);
create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists system_logs_created_at_idx on public.system_logs (created_at desc);
create index if not exists system_logs_event_type_idx on public.system_logs (event_type);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id and role = 'client');

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- transactions
alter table public.transactions enable row level security;

create policy "Users can read their own transactions"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own manual transactions"
  on public.transactions for insert to authenticated
  with check (auth.uid() = user_id and source in ('manual', 'ai_text', 'receipt_scan', 'whatsapp_text', 'whatsapp_receipt'));

create policy "Users can update their own transactions"
  on public.transactions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using (auth.uid() = user_id);

-- budgets
alter table public.budgets enable row level security;

create policy "Users can read their own budgets"
  on public.budgets for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own budgets"
  on public.budgets for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete to authenticated
  using (auth.uid() = user_id);

-- saving_goals
alter table public.saving_goals enable row level security;

create policy "Users can read their own saving goals"
  on public.saving_goals for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own saving goals"
  on public.saving_goals for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own saving goals"
  on public.saving_goals for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own saving goals"
  on public.saving_goals for delete to authenticated
  using (auth.uid() = user_id);

-- categories
alter table public.categories enable row level security;

create policy "Users can read their own categories"
  on public.categories for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own categories"
  on public.categories for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own categories"
  on public.categories for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own categories"
  on public.categories for delete to authenticated
  using (auth.uid() = user_id);

-- system_logs (public write, no RLS needed since only server writes)
alter table public.system_logs enable row level security;

create policy "Anyone can insert system logs"
  on public.system_logs for insert to authenticated
  with check (true);

create policy "Admins can read system logs"
  on public.system_logs for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- ============================================
-- 4. TRIGGERS & FUNCTIONS
-- ============================================

-- prevent profile role change
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.id and old.role is distinct from new.role then
    raise exception 'Role cannot be changed from client app';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change_trigger on public.profiles;
create trigger prevent_profile_role_change_trigger
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- is_super_admin helper
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- ============================================
-- 5. ADMIN RPC FUNCTIONS
-- ============================================

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

-- ============================================
-- 6. STORAGE BUCKET
-- ============================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

create policy "Users can upload their own receipt images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read receipt images"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts');

create policy "Users can update their own receipt images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own receipt images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 7. FIX: Remove whatsapp_number constraint
-- ============================================

alter table public.profiles drop constraint if exists profiles_whatsapp_number_key;
alter table public.profiles alter column whatsapp_number drop not null;

-- ============================================
-- 8. AUTO-REFRESH SCHEMA
-- ============================================

notify pgrst, 'reload schema';
```

## Langkah 3: Verifikasi

Setelah menjalankan SQL di atas, cek apakah fungsi admin berjalan:

```bash
# Test admin stats RPC
node -e "
const {createClient} = require('@supabase/supabase-js');
const sb = createClient('https://glmjghaocpdtvzubqphj.supabase.co', 'sb_publishable_29_oVOce-bRtbc09NSAQDA_3PBfVLM7');
sb.rpc('get_admin_dashboard_stats').then(d => console.log(d.error?.message || 'OK:', d.data));
"
```

## Langkah 4: Restart Backend

```bash
cd server
npm run dev
```

## Catatan Penting

- **Service Role Key**: Fungsi `get_admin_dashboard_stats` dll memerlukan **Security Definer** yang hanya bisa dibuat dengan Service Role Key dari Supabase Dashboard.
- **Cara dapat Service Role Key**: Buka https://app.supabase.com/project/glmjghaocpdtvzubqphj/settings/api → Copy "Service Role Key"
- **Keamanan**: Jangan pernah commit service role key ke Git! File `.env` sudah di-ignore.

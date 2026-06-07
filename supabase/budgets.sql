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

create index if not exists budgets_user_id_idx
on public.budgets (user_id);

create index if not exists budgets_user_category_idx
on public.budgets (user_id, category);

create index if not exists budgets_user_dates_idx
on public.budgets (user_id, start_date, end_date);

alter table public.budgets enable row level security;

create policy "Users can read their own budgets"
on public.budgets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own budgets"
on public.budgets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
on public.budgets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own budgets"
on public.budgets
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

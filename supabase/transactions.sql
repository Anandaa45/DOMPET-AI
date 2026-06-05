create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  title text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  category text,
  transaction_date date not null default current_date,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx
on public.transactions (user_id);

create index if not exists transactions_user_date_idx
on public.transactions (user_id, transaction_date desc);

alter table public.transactions enable row level security;

create policy "Users can read their own transactions"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own manual transactions"
on public.transactions
for insert
to authenticated
with check (auth.uid() = user_id and source = 'manual');

create policy "Users can update their own transactions"
on public.transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own transactions"
on public.transactions
for delete
to authenticated
using (auth.uid() = user_id);

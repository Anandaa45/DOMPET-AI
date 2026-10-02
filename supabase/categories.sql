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

create index if not exists categories_user_id_idx
on public.categories (user_id);

alter table public.categories enable row level security;

create policy "Users can read their own categories"
on public.categories
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own categories"
on public.categories
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own categories"
on public.categories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own categories"
on public.categories
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

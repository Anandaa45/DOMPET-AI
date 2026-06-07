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

create index if not exists saving_goals_user_id_idx
on public.saving_goals (user_id);

create index if not exists saving_goals_user_status_idx
on public.saving_goals (user_id, status);

alter table public.saving_goals enable row level security;

create policy "Users can read their own saving goals"
on public.saving_goals
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own saving goals"
on public.saving_goals
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own saving goals"
on public.saving_goals
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own saving goals"
on public.saving_goals
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

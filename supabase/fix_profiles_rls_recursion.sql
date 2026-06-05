drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

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

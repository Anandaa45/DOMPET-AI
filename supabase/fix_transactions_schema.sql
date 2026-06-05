do $$
begin
  if to_regclass('public.transations') is not null
     and to_regclass('public.transactions') is null then
    alter table public.transations rename to transactions;
  end if;
end;
$$;

alter table public.transactions
add column if not exists description text;

alter table public.transactions
add column if not exists merchant_name text;

alter table public.transactions
add column if not exists receipt_image_url text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'title'
  ) then
    update public.transactions
    set description = coalesce(description, title)
    where description is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'notes'
  ) then
    update public.transactions
    set description = coalesce(description, notes)
    where description is null;
  end if;
end;
$$;

update public.transactions
set description = 'Transaksi'
where description is null;

alter table public.transactions
alter column description set not null;

notify pgrst, 'reload schema';

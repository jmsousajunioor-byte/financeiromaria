-- Ensure required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- Helper function to auto-update updated_at on each row update
create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Card invoices table
create table if not exists public.card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  month date not null,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  status text default 'open',
  paid_at timestamptz,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table public.card_invoices
  add constraint card_invoices_user_card_month_key unique (user_id, card_id, month);

create index if not exists card_invoices_user_id_idx on public.card_invoices (user_id);
create index if not exists card_invoices_card_id_idx on public.card_invoices (card_id);

-- Keep trigger idempotent
drop trigger if exists set_card_invoices_updated_at on public.card_invoices;
create trigger set_card_invoices_updated_at
  before update on public.card_invoices
  for each row
  execute function public.trigger_set_updated_at();
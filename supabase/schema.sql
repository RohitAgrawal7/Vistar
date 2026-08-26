-- Vistar café floor — run this in the Supabase SQL editor (once).
-- Project: Dashboard → SQL → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists public.dining_sessions (
  id text primary key,
  table_id text not null,
  guest_name text not null,
  token text not null default '',
  revoked_token text,
  status text not null check (status in ('open', 'billing', 'paid', 'closed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_activity_at timestamptz not null,
  billed_at timestamptz,
  paid_at timestamptz,
  closed_at timestamptz,
  close_reason text check (close_reason is null or close_reason in ('paid', 'abandoned', 'exited')),
  abandon_note text,
  token_revoked_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('card', 'wallet', 'cash')),
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  review_note text,
  reviewed_at timestamptz
);

create unique index if not exists dining_sessions_one_active_per_table
  on public.dining_sessions (table_id)
  where status in ('open', 'billing', 'paid');

create table if not exists public.orders (
  id text primary key,
  session_id text not null references public.dining_sessions (id) on delete cascade,
  table_id text not null,
  sequence integer not null,
  items jsonb not null default '[]'::jsonb,
  status text not null check (
    status in ('pending', 'confirmed', 'ready', 'awaiting_payment', 'paid', 'cancelled')
  ),
  notes text not null default '',
  subtotal numeric not null,
  tax numeric not null,
  total numeric not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  confirmed_at timestamptz,
  ready_at timestamptz,
  paid_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('card', 'wallet', 'cash')),
  idempotency_key text,
  cancelled_from text,
  cancelled_at timestamptz
);

create unique index if not exists orders_session_idempotency
  on public.orders (session_id, idempotency_key)
  where idempotency_key is not null and idempotency_key <> '';

create index if not exists orders_session_id_idx on public.orders (session_id);

create table if not exists public.staff_sessions (
  token text primary key,
  staff_name text not null,
  created_at timestamptz not null,
  role text not null default 'staff' check (role in ('staff', 'super_admin'))
);

alter table public.staff_sessions
  add column if not exists role text not null default 'staff';

-- Menu catalog (super admin editable)
create table if not exists public.menu_categories (
  id text primary key,
  label text not null,
  blurb text not null default '',
  image_src text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.menu_items (
  id text primary key,
  category_id text not null references public.menu_categories (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric not null,
  image_src text not null default '',
  combo_images jsonb,
  tags jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  sort_order integer not null default 0
);

create index if not exists menu_items_category_id_idx on public.menu_items (category_id);

create table if not exists public.resume_grants (
  id text primary key,
  nonce text not null unique,
  signature text not null,
  session_id text not null,
  table_id text not null,
  expires_at bigint not null,
  created_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.audit_events (
  id text primary key,
  at timestamptz not null,
  action text not null,
  staff_name text not null,
  note text not null default '',
  table_id text,
  session_id text,
  guest_name text
);

create index if not exists audit_events_at_idx on public.audit_events (at desc);

alter table public.dining_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.resume_grants enable row level security;
alter table public.audit_events enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

-- Publishable / anon key (kitchen server). Prefer the secret/service_role key in production.
drop policy if exists vistar_dining_sessions_kitchen on public.dining_sessions;
drop policy if exists vistar_orders_kitchen on public.orders;
drop policy if exists vistar_staff_sessions_kitchen on public.staff_sessions;
drop policy if exists vistar_resume_grants_kitchen on public.resume_grants;
drop policy if exists vistar_audit_events_kitchen on public.audit_events;
drop policy if exists vistar_menu_categories_kitchen on public.menu_categories;
drop policy if exists vistar_menu_items_kitchen on public.menu_items;

create policy vistar_dining_sessions_kitchen on public.dining_sessions
  for all using (true) with check (true);
create policy vistar_orders_kitchen on public.orders
  for all using (true) with check (true);
create policy vistar_staff_sessions_kitchen on public.staff_sessions
  for all using (true) with check (true);
create policy vistar_resume_grants_kitchen on public.resume_grants
  for all using (true) with check (true);
create policy vistar_audit_events_kitchen on public.audit_events
  for all using (true) with check (true);
create policy vistar_menu_categories_kitchen on public.menu_categories
  for all using (true) with check (true);
create policy vistar_menu_items_kitchen on public.menu_items
  for all using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on public.dining_sessions to anon, authenticated;
grant all on public.orders to anon, authenticated;
grant all on public.staff_sessions to anon, authenticated;
grant all on public.resume_grants to anon, authenticated;
grant all on public.audit_events to anon, authenticated;
grant all on public.menu_categories to anon, authenticated;
grant all on public.menu_items to anon, authenticated;


-- ---------------------------------------------------------------------------
-- Data retention: purge closed customer visits older than 60 days.
-- Orders for those sessions are removed first, then sessions.
-- Menu tables are never deleted here.
-- Run manually:  select * from public.vistar_purge_old_customer_data(60);
-- Optional: enable pg_cron in Supabase and schedule daily.
-- ---------------------------------------------------------------------------

create or replace function public.vistar_purge_old_customer_data(retention_days integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(retention_days, 1));
  session_count integer := 0;
  order_count integer := 0;
  audit_count integer := 0;
  resume_count integer := 0;
begin
  with doomed as (
    select id
    from public.dining_sessions
    where status = 'closed'
      and coalesce(closed_at, updated_at) < cutoff
  ),
  deleted_orders as (
    delete from public.orders o
    using doomed d
    where o.session_id = d.id
    returning o.id
  )
  select count(*) into order_count from deleted_orders;

  with deleted_sessions as (
    delete from public.dining_sessions
    where status = 'closed'
      and coalesce(closed_at, updated_at) < cutoff
    returning id
  )
  select count(*) into session_count from deleted_sessions;

  with deleted_audit as (
    delete from public.audit_events
    where at < cutoff
    returning id
  )
  select count(*) into audit_count from deleted_audit;

  with deleted_resume as (
    delete from public.resume_grants
    where created_at < cutoff
    returning id
  )
  select count(*) into resume_count from deleted_resume;

  return jsonb_build_object(
    'retention_days', retention_days,
    'cutoff', cutoff,
    'sessions_deleted', session_count,
    'orders_deleted', order_count,
    'audit_deleted', audit_count,
    'resume_deleted', resume_count
  );
end;
$$;

grant execute on function public.vistar_purge_old_customer_data(integer) to anon, authenticated;

-- Optional daily cron (requires pg_cron extension in Supabase):
-- select cron.schedule(
--   'vistar-purge-60d',
--   '15 3 * * *',
--   $$ select public.vistar_purge_old_customer_data(60); $$
-- );

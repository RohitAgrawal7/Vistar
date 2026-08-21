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
  created_at timestamptz not null
);

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

-- Publishable / anon key (kitchen server). Prefer the secret/service_role key in production.
drop policy if exists vistar_dining_sessions_kitchen on public.dining_sessions;
drop policy if exists vistar_orders_kitchen on public.orders;
drop policy if exists vistar_staff_sessions_kitchen on public.staff_sessions;
drop policy if exists vistar_resume_grants_kitchen on public.resume_grants;
drop policy if exists vistar_audit_events_kitchen on public.audit_events;

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

grant usage on schema public to anon, authenticated;
grant all on public.dining_sessions to anon, authenticated;
grant all on public.orders to anon, authenticated;
grant all on public.staff_sessions to anon, authenticated;
grant all on public.resume_grants to anon, authenticated;
grant all on public.audit_events to anon, authenticated;


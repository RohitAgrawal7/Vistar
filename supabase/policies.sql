-- If tables already exist, run ONLY this in the Supabase SQL editor.
-- This allows the kitchen publishable key to insert sessions and orders.

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

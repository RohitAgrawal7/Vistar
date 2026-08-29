-- Run once in Supabase → SQL Editor → New query → Run
-- Fixes: Could not find the 'guest_phone' column of 'dining_sessions'

alter table public.dining_sessions
  add column if not exists guest_phone text;

-- Refresh PostgREST schema cache so the API sees the new column
notify pgrst, 'reload schema';

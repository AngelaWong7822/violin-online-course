-- 0004_service_role_grants.sql
-- The Edge Functions (create-checkout, stripe-webhook) use the service_role.
-- This project does NOT auto-grant tables to any API role — service_role
-- included — so grant exactly what the functions need. (service_role
-- bypasses RLS but still needs table privileges.)
-- Run once in the Supabase SQL Editor. Safe to re-run.

grant usage on schema public to service_role;

grant select on public.courses, public.lessons to service_role;   -- price, access period
grant select on public.profiles to service_role;                  -- profile completed?
grant select, insert, update on public.enrollments to service_role; -- open course / refund

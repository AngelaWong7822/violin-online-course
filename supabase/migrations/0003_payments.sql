-- 0003_payments.sql
-- Phase 3: Stripe payments.
-- Run once in the Supabase SQL Editor after 0002_accounts.sql. Safe to re-run.
--
-- Enrollments are written only by the stripe-webhook Edge Function (server
-- side, service role) or by hand in the Table Editor. The browser still has
-- read-only access to its own rows (see 0002).

-- Link an enrollment to its Stripe payment so a refund in Stripe can
-- switch the enrollment to 'refunded' automatically.
alter table public.enrollments
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists enrollments_payment_intent_key
  on public.enrollments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Fast "does this user already own this course?" checks.
create index if not exists enrollments_user_course_idx
  on public.enrollments(user_id, course_id, status);

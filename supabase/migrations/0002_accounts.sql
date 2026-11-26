-- 0002_accounts.sql
-- Phase 2a: member accounts (profiles, learners, enrollments).
-- Run once in the Supabase SQL Editor after 0001_courses.sql. Safe to re-run.
--
-- Who can do what through the API (publishable key + login):
--   profiles     each user reads / creates / edits only their own row
--   learners     each user manages only their own learners (children)
--   enrollments  each user can only READ their own rows; nobody can write
--                through the API. Phase 3 (Stripe webhook, server side) and
--                the Table Editor (manual grants) create them.
-- Visitors who are not logged in (anon) get no access to any of these.

-- ------------------------------------------------------------------
-- profiles: one row per account (parent / adult learner)
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  whatsapp          text not null check (whatsapp ~ '^\+[0-9]{8,15}$'),  -- E.164, e.g. +85291234567
  marketing_consent boolean not null default false,
  consent_at        timestamptz,   -- when direct-marketing consent was last given; null = no consent
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- consent_at is set by the database, never trusted from the browser
create or replace function public.profiles_set_consent_at() returns trigger
language plpgsql as $$
begin
  if new.marketing_consent then
    if tg_op = 'INSERT' or not old.marketing_consent then
      new.consent_at := now();
    else
      new.consent_at := old.consent_at;
    end if;
  else
    new.consent_at := null;
  end if;
  return new;
end $$;

drop trigger if exists profiles_consent on public.profiles;
create trigger profiles_consent before insert or update on public.profiles
  for each row execute function public.profiles_set_consent_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- learners: the people who actually study (e.g. a parent's children)
-- ------------------------------------------------------------------
create table if not exists public.learners (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  birth_year  integer check (birth_year between 1920 and 2100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists learners_account_idx on public.learners(account_id);

drop trigger if exists learners_touch on public.learners;
create trigger learners_touch before update on public.learners
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- enrollments: paid (or manually granted) access to one course
-- ------------------------------------------------------------------
create table if not exists public.enrollments (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  course_id                  uuid not null references public.courses(id) on delete restrict,
  learner_id                 uuid references public.learners(id) on delete set null,
  status                     text not null default 'active'
                             check (status in ('active', 'refunded', 'cancelled')),
  source                     text not null default 'manual'
                             check (source in ('stripe', 'manual')),
  amount_hkd                 integer check (amount_hkd is null or amount_hkd >= 0),
  starts_at                  timestamptz not null default now(),
  expires_at                 timestamptz not null,
  stripe_checkout_session_id text unique,
  note                       text,         -- admin note, e.g. "complimentary"
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  check (expires_at > starts_at)
);

create index if not exists enrollments_user_idx on public.enrollments(user_id);

drop trigger if exists enrollments_touch on public.enrollments;
create trigger enrollments_touch before update on public.enrollments
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- API access. This project does NOT auto-grant new tables, so grant
-- explicitly. Only logged-in users (authenticated); anon gets nothing.
-- RLS below limits every user to their own rows.
-- ------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.learners to authenticated;
grant select on public.enrollments to authenticated;

alter table public.profiles enable row level security;
alter table public.learners enable row level security;
alter table public.enrollments enable row level security;

drop policy if exists "own profile: read" on public.profiles;
create policy "own profile: read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "own profile: create" on public.profiles;
create policy "own profile: create" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "own profile: edit" on public.profiles;
create policy "own profile: edit" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own learners" on public.learners;
create policy "own learners" on public.learners
  for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

drop policy if exists "own enrollments: read" on public.enrollments;
create policy "own enrollments: read" on public.enrollments
  for select to authenticated using (user_id = (select auth.uid()));

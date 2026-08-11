-- CampusLink Supabase schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query) for the
-- project referenced in .env.local. The app already knows how to read/write these
-- tables (see src/CampusLinkApp.jsx) — it just silently falls back to local-only
-- storage when they don't exist, which is why mentee requests/bookings placed on
-- one device never show up for a mentor on another device.
--
-- Confirmed missing via a live REST check on 2026-08-10:
--   GET /rest/v1/mentee_requests -> PGRST205 "Could not find the table 'public.mentee_requests'"
--   GET /rest/v1/bookings        -> PGRST205 "Could not find the table 'public.bookings'"

-- ---------------------------------------------------------------------------
-- mentee_requests: a mentee's request for help, shown on the mentor's
-- "Requests" page. Created either directly ("Request session") or as a side
-- effect of booking a session slot.
-- ---------------------------------------------------------------------------
create table if not exists public.mentee_requests (
  id text primary key,
  mentee_name text,
  mentee_initials text,
  major text,
  course text,
  focus text,
  urgency text,
  match integer,
  availability jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  bio text,
  testimonial_name text,
  testimonial_text text,
  mentee_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- bookings: a confirmed session ticket, shown on the mentee's "My sessions"
-- page and the mentor's session list.
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id text primary key,
  mentee_id text,
  mentee_name text,
  tutor_id text,
  tutor_name text,
  tutor_initials text,
  course text,
  day text,
  time text,
  code text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Realtime: the mentor Requests page subscribes to postgres_changes on
-- mentee_requests so new requests appear instantly without a refresh. Tables
-- must be explicitly added to the supabase_realtime publication.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.mentee_requests;

-- ---------------------------------------------------------------------------
-- Grants: tables created via the SQL Editor are owned by `postgres` and are
-- NOT automatically exposed to the `anon`/`authenticated` roles the app's
-- publishable key uses. Without these grants, PostgREST hides the table from
-- its schema entirely — which looks exactly like "table not found", not a
-- permissions error. This is the actual fix if you've already created the
-- tables and reloaded the schema cache but still see PGRST205.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.mentee_requests to anon, authenticated;
grant select, insert, update, delete on public.bookings to anon, authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Row Level Security: newer Supabase projects auto-enable RLS on tables
-- created via the SQL Editor, with zero policies attached. That silently
-- empties every SELECT and hard-fails every INSERT with 42501 ("new row
-- violates row-level security policy") — confirmed live against this project
-- on 2026-08-10. This app authenticates against its own `profiles` table
-- rather than real Supabase Auth sessions, so auth.uid()-based policies
-- can't work here anyway — turn RLS off to match how the rest of the app
-- (e.g. `profiles`) already operates.
-- ---------------------------------------------------------------------------
alter table public.mentee_requests disable row level security;
alter table public.bookings disable row level security;

-- ---------------------------------------------------------------------------
-- Migration: bookings.status + realtime, added when the mentee Sessions page
-- was wired to show "Approved" once a mentor accepts the linked request.
-- Safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Migration: mentee_requests.code — every mentee session now gets its own
-- ticket code at creation time, even a plain "Request session" with no slot
-- picked (which never gets a bookings row, only a mentee_requests row). This
-- is what the mentor's Sessions page displays once the request is accepted.
-- Safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.mentee_requests add column if not exists code text;

-- ---------------------------------------------------------------------------
-- Migration: chat_messages — the floating chat drawer previously stored
-- messages only in localStorage, so a message sent on one device never
-- reached the other person's. This is what makes it a real conversation.
-- Safe to re-run.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id text primary key,
  thread_id text not null,
  sender_id text not null,
  sender_name text,
  recipient_id text not null,
  recipient_name text,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages disable row level security;
grant select, insert, update, delete on public.chat_messages to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Migration: public read access to mentor profiles — the logged-out landing
-- page's tutor directory (Dashboard.jsx tutors tab + /tutors) queries
-- `profiles` directly with the anon key, but the table's existing RLS
-- policy only allows authenticated sessions to read rows. That made the
-- landing page always show "No mentors have joined yet" even with real
-- mentors in the table, since visitors there have no Supabase Auth session.
-- This opens SELECT to mentor rows only (mentee rows, emails etc. stay
-- private) for both anon and authenticated — narrower than disabling RLS
-- outright. Safe to re-run.
-- ---------------------------------------------------------------------------
-- Scoping mentee visibility to "authenticated" sessions only turned out
-- unreliable to depend on here, and it's inconsistent with every other
-- table in this schema (mentee_requests, bookings, chat_messages) which
-- already just disables RLS outright rather than keying policies off
-- auth.uid()/role. Matching that: open profiles reads to everyone so the
-- Skill Swap directory (mentees) works the same reliable way the Tutor
-- Marketplace directory (mentors) already does.
drop policy if exists "Public can view mentor profiles" on public.profiles;
drop policy if exists "Authenticated can view mentee profiles" on public.profiles;
drop policy if exists "Public can view all profiles" on public.profiles;
create policy "Public can view all profiles"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Migration: real backend for the landing page's Skill Swap, Course
-- Materials, and Resource Marketplace tabs — these were static demo arrays
-- before. Skill Swap is a directory of real mentees (from `profiles`, same
-- as the Tutor Marketplace tab is a directory of real mentors) rather than a
-- separately-posted listing, so it needs no table of its own — only
-- swap_requests to record a "Propose swap" click against a mentee's profile
-- id. Same open/no-RLS trust model as the rest of this schema (the landing
-- page is public with no Supabase Auth session, so there's no auth.uid() to
-- key policies off anyway). Safe to re-run.
-- ---------------------------------------------------------------------------
-- No FK to profiles(id): profiles.id is a uuid while every other id column
-- in this schema (bookings.mentee_id, mentee_requests.mentee_id, etc.) is
-- kept as plain text for the same reason — matches that existing pattern.
create table if not exists public.swap_requests (
  id text primary key,
  mentee_id text,
  requester_name text,
  created_at timestamptz not null default now()
);
alter table public.swap_requests disable row level security;
grant select, insert, update, delete on public.swap_requests to anon, authenticated;

create table if not exists public.course_materials (
  id text primary key,
  title text not null,
  course text not null,
  uploaded_by text,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  downloads integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.course_materials disable row level security;
grant select, insert, update, delete on public.course_materials to anon, authenticated;

create table if not exists public.marketplace_items (
  id text primary key,
  title text not null,
  description text,
  price text,
  interest_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.marketplace_items disable row level security;
grant select, insert, update, delete on public.marketplace_items to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'course_materials') then
    alter publication supabase_realtime add table public.course_materials;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_items') then
    alter publication supabase_realtime add table public.marketplace_items;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Mentor file uploads: mentors can now attach an actual document from their
-- computer to a course material instead of just posting a title/course pair.
-- Adds file_url/file_name to course_materials and a public storage bucket
-- for the uploaded files.
-- ---------------------------------------------------------------------------
alter table public.course_materials add column if not exists file_url text;
alter table public.course_materials add column if not exists file_name text;

insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read course material files" on storage.objects;
create policy "Public can read course material files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'course-materials');

drop policy if exists "Anyone can upload course material files" on storage.objects;
create policy "Anyone can upload course material files"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'course-materials');

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Mentors can now edit a material's title or remove it entirely. Adds
-- uploaded_by_id so edit/delete can be scoped in the UI to whichever mentor
-- actually uploaded the material, and a storage delete policy so removing a
-- material also cleans up its underlying file.
-- ---------------------------------------------------------------------------
alter table public.course_materials add column if not exists uploaded_by_id text;

drop policy if exists "Anyone can delete course material files" on storage.objects;
create policy "Anyone can delete course material files"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'course-materials');

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Migration: mentee_requests.tutor_id — records which mentor a mentee's
-- request/booking was originally addressed to (any mentor can still accept
-- it from the shared "Student requests" pool). This is what lets the app
-- tell a brand-new mentor apart from one who has actually been requested at
-- least once, so a fresh mentor account doesn't show a fabricated rating and
-- testimonial before anyone has ever reached out to them. Safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.mentee_requests add column if not exists tutor_id text;

notify pgrst, 'reload schema';

-- =====================================================================
-- FTPD5 – ระบบติดตามสำนวนคดี
-- Migration 1: Schema, constraints, indexes, helper functions, triggers
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- Internal helpers live in a schema that is NOT exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'officer');

-- ---------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Role is stored HERE (never in
-- user-editable auth metadata) and can only be changed by admins via RPC.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  email       text check (email is null or char_length(email) <= 320),
  role        public.app_role not null default 'officer',
  -- New accounts are inactive until an admin activates them (deny by default).
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_active_idx on public.profiles (role, is_active);

-- ---------------------------------------------------------------------
-- courts
-- ---------------------------------------------------------------------
create table public.courts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 150),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Prevent duplicates that differ only by case / surrounding or repeated spaces.
create unique index courts_name_normalized_key
  on public.courts (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

-- ---------------------------------------------------------------------
-- cases
-- Completion status is DERIVED from the case numbers (generated column),
-- so it can never contradict the data. "Skipped" is a separate flag.
-- ---------------------------------------------------------------------
create table public.cases (
  id                 uuid primary key default gen_random_uuid(),
  sequence_number    bigint generated always as identity,
  accused_name       text not null check (char_length(accused_name) between 1 and 200),
  court_id           uuid not null references public.courts (id) on delete restrict,
  black_case_number  text check (
                       black_case_number is null
                       or (char_length(black_case_number) between 1 and 50
                           and black_case_number ~ '^[ก-๙A-Za-z0-9./() -]+$')
                     ),
  red_case_number    text check (
                       red_case_number is null
                       or (char_length(red_case_number) between 1 and 50
                           and red_case_number ~ '^[ก-๙A-Za-z0-9./() -]+$')
                     ),
  is_complete        boolean generated always as
                       (black_case_number is not null and red_case_number is not null) stored,
  is_skipped         boolean not null default false,
  skipped_at         timestamptz,
  note               text check (note is null or char_length(note) <= 2000),
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  deleted_by         uuid references public.profiles (id) on delete set null,
  constraint cases_sequence_number_key unique (sequence_number)
);

-- Filtering / listing (active rows only)
create index cases_active_court_idx
  on public.cases (court_id, sequence_number) where deleted_at is null;
create index cases_active_status_idx
  on public.cases (is_complete, is_skipped, sequence_number) where deleted_at is null;
create index cases_deleted_idx
  on public.cases (deleted_at) where deleted_at is not null;

-- Partial-match search (ILIKE '%...%') on name and case numbers
create index cases_accused_name_trgm_idx
  on public.cases using gin (accused_name extensions.gin_trgm_ops);
create index cases_black_no_trgm_idx
  on public.cases using gin (black_case_number extensions.gin_trgm_ops);
create index cases_red_no_trgm_idx
  on public.cases using gin (red_case_number extensions.gin_trgm_ops);

-- Business rule: a case number is unique WITHIN a court (not across courts),
-- ignoring whitespace and letter case, among non-deleted rows.
create unique index cases_court_black_no_key
  on public.cases (court_id, lower(regexp_replace(black_case_number, '\s', '', 'g')))
  where deleted_at is null and black_case_number is not null;
create unique index cases_court_red_no_key
  on public.cases (court_id, lower(regexp_replace(red_case_number, '\s', '', 'g')))
  where deleted_at is null and red_case_number is not null;

-- FK helper indexes
create index cases_created_by_idx on public.cases (created_by);
create index cases_updated_by_idx on public.cases (updated_by);

-- ---------------------------------------------------------------------
-- audit_logs (append-only)
-- actor_id has no FK on purpose: history must survive user removal.
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  action       text not null check (char_length(action) <= 64),
  entity_type  text not null check (entity_type in ('case', 'court', 'user')),
  entity_id    uuid,
  old_values   jsonb,
  new_values   jsonb,
  created_at   timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so they can read profiles
-- without recursive RLS; fixed empty search_path; not exposed via API).
-- ---------------------------------------------------------------------
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'admin'
  );
$$;

-- Used by the cases trigger; bypasses RLS so that permission errors are
-- reported by RLS itself rather than as "court inactive".
create or replace function private.court_is_active(p_court_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.courts c where c.id = p_court_id and c.is_active);
$$;

revoke all on function private.is_active_user() from public, anon;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.court_is_active(uuid) from public, anon;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.court_is_active(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Triggers: profile bootstrap from auth.users
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the display name is taken from metadata. Role / active flag are
  -- NEVER read from user-editable metadata.
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_user_email();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.sync_user_email() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Triggers: timestamps & normalisation
-- ---------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

create or replace function private.courts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger courts_before_write
  before insert or update on public.courts
  for each row execute function private.courts_before_write();

create or replace function private.cases_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Normalise free text (collapse whitespace, empty string -> NULL)
  new.accused_name := regexp_replace(btrim(new.accused_name), '\s+', ' ', 'g');
  new.black_case_number := nullif(regexp_replace(btrim(coalesce(new.black_case_number, '')), '\s+', ' ', 'g'), '');
  new.red_case_number   := nullif(regexp_replace(btrim(coalesce(new.red_case_number, '')), '\s+', ' ', 'g'), '');
  new.note              := nullif(btrim(coalesce(new.note, '')), '');

  if tg_op = 'INSERT' then
    -- Server-controlled fields: never trust client values.
    new.created_by := (select auth.uid());
    new.updated_by := (select auth.uid());
    new.created_at := now();
    new.updated_at := now();
    new.deleted_at := null;
    new.deleted_by := null;
    new.is_skipped := false;
    new.skipped_at := null;

    if not private.court_is_active(new.court_id) then
      raise exception using errcode = 'P0001', message = 'COURT_INACTIVE';
    end if;
    return new;
  end if;

  -- UPDATE
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), old.updated_by);

  -- Officers may only record case numbers, notes and the skip flag.
  if (new.accused_name is distinct from old.accused_name
      or new.court_id is distinct from old.court_id)
     and not private.is_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN_FIELD';
  end if;

  if new.court_id is distinct from old.court_id
     and not private.court_is_active(new.court_id) then
    raise exception using errcode = 'P0001', message = 'COURT_INACTIVE';
  end if;

  -- Saving case numbers resolves a previous "skip".
  if (new.black_case_number is distinct from old.black_case_number
      or new.red_case_number is distinct from old.red_case_number)
     and new.is_skipped = old.is_skipped then
    new.is_skipped := false;
  end if;

  if new.is_skipped and not old.is_skipped then
    new.skipped_at := now();
  elsif not new.is_skipped then
    new.skipped_at := null;
  end if;

  return new;
end;
$$;

create trigger cases_before_write
  before insert or update on public.cases
  for each row execute function private.cases_before_write();

revoke all on function private.touch_updated_at() from public, anon;
revoke all on function private.courts_before_write() from public, anon;
revoke all on function private.cases_before_write() from public, anon;

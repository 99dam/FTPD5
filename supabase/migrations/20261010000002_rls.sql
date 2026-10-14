-- =====================================================================
-- FTPD5 – Migration 2: Privileges & Row Level Security (deny by default)
-- =====================================================================

-- Supabase grants broad default privileges on public tables to anon and
-- authenticated. Remove them all, then grant back only what is needed.
revoke all on table public.profiles   from anon, authenticated;
revoke all on table public.courts     from anon, authenticated;
revoke all on table public.cases      from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

alter table public.profiles   enable row level security;
alter table public.courts     enable row level security;
alter table public.cases      enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- Read: own row (even if inactive, so the app can show "account disabled"),
--       admins read all. No INSERT/UPDATE/DELETE privileges at all:
--       changes go through admin_update_user() / update_my_profile().
-- ---------------------------------------------------------------------
grant select on public.profiles to authenticated;

create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

-- ---------------------------------------------------------------------
-- courts
-- Read: any active user. Insert/update: admins only. No delete.
-- ---------------------------------------------------------------------
grant select on public.courts to authenticated;
grant insert (name, is_active) on public.courts to authenticated;
grant update (name, is_active) on public.courts to authenticated;

create policy courts_select_active_users
  on public.courts for select
  to authenticated
  using ((select private.is_active_user()));

create policy courts_insert_admin
  on public.courts for insert
  to authenticated
  with check ((select private.is_admin()));

create policy courts_update_admin
  on public.courts for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- cases
-- Read: active users see non-deleted rows; admins also see deleted rows.
-- Insert: active users (server sets created_by etc. via trigger).
-- Update: active users on non-deleted rows; only whitelisted columns.
--         Officers are further restricted by cases_before_write().
-- Delete: nobody (soft delete only via soft_delete_case()).
-- deleted_at / deleted_by are not in any column grant.
-- ---------------------------------------------------------------------
grant select on public.cases to authenticated;
grant insert (accused_name, court_id, black_case_number, red_case_number, note)
  on public.cases to authenticated;
grant update (accused_name, court_id, black_case_number, red_case_number, note, is_skipped)
  on public.cases to authenticated;

create policy cases_select_active_users
  on public.cases for select
  to authenticated
  using (
    (select private.is_active_user())
    and (deleted_at is null or (select private.is_admin()))
  );

create policy cases_insert_active_users
  on public.cases for insert
  to authenticated
  with check ((select private.is_active_user()));

create policy cases_update_active_users
  on public.cases for update
  to authenticated
  using ((select private.is_active_user()) and deleted_at is null)
  with check ((select private.is_active_user()) and deleted_at is null);

-- ---------------------------------------------------------------------
-- audit_logs
-- Read: admins all; other active users only their own actions.
-- No write privileges for any API role. Rows are written by triggers.
-- ---------------------------------------------------------------------
grant select on public.audit_logs to authenticated;

create policy audit_logs_select
  on public.audit_logs for select
  to authenticated
  using (
    (select private.is_admin())
    or (actor_id = (select auth.uid()) and (select private.is_active_user()))
  );

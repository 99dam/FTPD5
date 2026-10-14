-- =====================================================================
-- FTPD5 โ€“ Migration 4: RPC functions
-- * Read functions are SECURITY INVOKER: results always respect RLS.
-- * Privileged write functions are SECURITY DEFINER with an explicit
--   permission check, empty search_path and EXECUTE only for authenticated.
-- * All inputs are bound parameters (no dynamic SQL).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Search / list cases with server-side filtering & pagination
-- p_status: 'complete' | 'incomplete' | 'skipped' | NULL (all)
-- p_deleted_only: admins can browse soft-deleted rows (RLS hides them
--                 from everyone else, so officers simply get nothing).
-- ---------------------------------------------------------------------
create or replace function public.search_cases(
  p_query        text    default null,
  p_court_id     uuid    default null,
  p_status       text    default null,
  p_deleted_only boolean default false,
  p_limit        integer default 20,
  p_offset       integer default 0
)
returns table (
  id                uuid,
  sequence_number   bigint,
  accused_name      text,
  court_id          uuid,
  court_name        text,
  black_case_number text,
  red_case_number   text,
  is_complete       boolean,
  is_skipped        boolean,
  note              text,
  created_at        timestamptz,
  updated_at        timestamptz,
  deleted_at        timestamptz,
  total_count       bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_query   text := nullif(btrim(left(coalesce(p_query, ''), 100)), '');
  v_pattern text;
  v_limit   integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset  integer := greatest(coalesce(p_offset, 0), 0);
begin
  if p_status is not null and p_status not in ('complete', 'incomplete', 'skipped') then
    raise exception using errcode = '22023', message = 'INVALID_STATUS';
  end if;

  if v_query is not null then
    -- Escape LIKE wildcards so user input is matched literally.
    v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select
    c.id, c.sequence_number, c.accused_name, c.court_id, ct.name,
    c.black_case_number, c.red_case_number, c.is_complete, c.is_skipped,
    c.note, c.created_at, c.updated_at, c.deleted_at,
    count(*) over () as total_count
  from public.cases c
  join public.courts ct on ct.id = c.court_id
  where (case when p_deleted_only then c.deleted_at is not null else c.deleted_at is null end)
    and (p_court_id is null or c.court_id = p_court_id)
    and (
      p_status is null
      or (p_status = 'complete'   and c.is_complete)
      or (p_status = 'incomplete' and not c.is_complete and not c.is_skipped)
      or (p_status = 'skipped'    and not c.is_complete and c.is_skipped)
    )
    and (
      v_pattern is null
      or c.accused_name      ilike v_pattern
      or c.black_case_number ilike v_pattern
      or c.red_case_number   ilike v_pattern
      or ct.name             ilike v_pattern
    )
  order by c.sequence_number asc
  limit v_limit offset v_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- Dashboard statistics (RLS-aware; excludes soft-deleted rows)
-- ---------------------------------------------------------------------
create or replace function public.get_case_stats(p_court_id uuid default null)
returns table (total bigint, complete bigint, incomplete bigint, skipped bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*),
    count(*) filter (where c.is_complete),
    count(*) filter (where not c.is_complete and not c.is_skipped),
    count(*) filter (where not c.is_complete and c.is_skipped)
  from public.cases c
  where c.deleted_at is null
    and (p_court_id is null or c.court_id = p_court_id);
$$;

create or replace function public.get_court_stats()
returns table (
  court_id   uuid,
  court_name text,
  is_active  boolean,
  total      bigint,
  complete   bigint,
  incomplete bigint,
  skipped    bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    ct.id, ct.name, ct.is_active,
    count(c.id),
    count(c.id) filter (where c.is_complete),
    count(c.id) filter (where not c.is_complete and not c.is_skipped),
    count(c.id) filter (where not c.is_complete and c.is_skipped)
  from public.courts ct
  left join public.cases c on c.court_id = ct.id and c.deleted_at is null
  group by ct.id, ct.name, ct.is_active
  order by ct.is_active desc, ct.name;
$$;

-- ---------------------------------------------------------------------
-- Soft delete / restore (admin only)
-- ---------------------------------------------------------------------
create or replace function public.soft_delete_case(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  update public.cases
     set deleted_at = now(), deleted_by = (select auth.uid())
   where id = p_case_id and deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
end;
$$;

create or replace function public.restore_case(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  -- May raise 23505 if an active row now uses the same case number.
  update public.cases
     set deleted_at = null, deleted_by = null
   where id = p_case_id and deleted_at is not null;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- User administration (admin only). Account creation itself happens in
-- the invite-user Edge Function (needs the service role, server-side).
-- ---------------------------------------------------------------------
create or replace function public.admin_update_user(
  p_user_id   uuid,
  p_full_name text            default null,
  p_role      public.app_role default null,
  p_is_active boolean         default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;

  -- Prevent admins from locking themselves out.
  if p_user_id = (select auth.uid())
     and ((p_role is not null and p_role <> 'admin') or p_is_active = false) then
    raise exception using errcode = '42501', message = 'CANNOT_MODIFY_SELF';
  end if;

  if p_full_name is not null and char_length(btrim(p_full_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_NAME';
  end if;

  update public.profiles
     set full_name = coalesce(btrim(p_full_name), full_name),
         role      = coalesce(p_role, role),
         is_active = coalesce(p_is_active, is_active)
   where id = p_user_id;

  -- There must always be at least one active admin.
  if not exists (select 1 from public.profiles where role = 'admin' and is_active) then
    raise exception using errcode = '42501', message = 'LAST_ADMIN';
  end if;
end;
$$;

create or replace function public.update_my_profile(p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_NAME';
  end if;

  update public.profiles
     set full_name = btrim(p_full_name)
   where id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- Audit log listing (RLS-aware: admins see all, others only their own)
-- ---------------------------------------------------------------------
create or replace function public.list_audit_logs(
  p_entity_type text    default null,
  p_actor_id    uuid    default null,
  p_limit       integer default 30,
  p_offset      integer default 0
)
returns table (
  id          bigint,
  actor_id    uuid,
  actor_name  text,
  action      text,
  entity_type text,
  entity_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  created_at  timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id, a.actor_id, p.full_name, a.action, a.entity_type, a.entity_id,
    a.old_values, a.new_values, a.created_at,
    count(*) over ()
  from public.audit_logs a
  left join public.profiles p on p.id = a.actor_id
  where (p_entity_type is null or a.entity_type = p_entity_type)
    and (p_actor_id is null or a.actor_id = p_actor_id)
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------
-- EXECUTE privileges: authenticated only (functions re-check is_active).
-- ---------------------------------------------------------------------
revoke all on function public.search_cases(text, uuid, text, boolean, integer, integer) from public, anon;
revoke all on function public.get_case_stats(uuid) from public, anon;
revoke all on function public.get_court_stats() from public, anon;
revoke all on function public.soft_delete_case(uuid) from public, anon;
revoke all on function public.restore_case(uuid) from public, anon;
revoke all on function public.admin_update_user(uuid, text, public.app_role, boolean) from public, anon;
revoke all on function public.update_my_profile(text) from public, anon;
revoke all on function public.list_audit_logs(text, uuid, integer, integer) from public, anon;

grant execute on function public.search_cases(text, uuid, text, boolean, integer, integer) to authenticated;
grant execute on function public.get_case_stats(uuid) to authenticated;
grant execute on function public.get_court_stats() to authenticated;
grant execute on function public.soft_delete_case(uuid) to authenticated;
grant execute on function public.restore_case(uuid) to authenticated;
grant execute on function public.admin_update_user(uuid, text, public.app_role, boolean) to authenticated;
grant execute on function public.update_my_profile(text) to authenticated;
grant execute on function public.list_audit_logs(text, uuid, integer, integer) to authenticated;

-- Future functions in public are NOT executable by anon unless granted.
alter default privileges in schema public revoke execute on functions from public, anon;

-- =====================================================================
-- FTPD5 – Migration 5: Lock case numbers once a case is complete
--
-- After both the black and the red case number have been recorded, only
-- admins may change them (to correct mistakes). Everyone else gets
-- CASE_LOCKED. Notes and other rules are unchanged.
-- =====================================================================

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

  -- Completed cases (both numbers recorded) are locked for non-admins.
  if old.black_case_number is not null and old.red_case_number is not null
     and (new.black_case_number is distinct from old.black_case_number
          or new.red_case_number is distinct from old.red_case_number)
     and not private.is_admin() then
    raise exception using errcode = '42501', message = 'CASE_LOCKED';
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

revoke all on function private.cases_before_write() from public, anon;

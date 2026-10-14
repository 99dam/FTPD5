-- =====================================================================
-- FTPD5 – Migration 3: Tamper-resistant audit trail (database triggers)
-- The frontend never writes audit rows; it cannot forge actor or values.
-- =====================================================================

create or replace function private.jsonb_changed(old_row jsonb, new_row jsonb, ignored text[])
returns table (old_values jsonb, new_values jsonb)
language sql
immutable
set search_path = ''
as $$
  select
    coalesce(jsonb_object_agg(n.key, old_row -> n.key), '{}'::jsonb),
    coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
  from jsonb_each(new_row) as n
  where not (n.key = any (ignored))
    and (old_row -> n.key) is distinct from n.value;
$$;

create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity   text := tg_argv[0];
  v_ignored  text[] := array['updated_at', 'updated_by', 'created_at', 'is_complete', 'skipped_at'];
  v_old      jsonb;
  v_new      jsonb;
  v_action   text;
begin
  if tg_op = 'INSERT' then
    v_old := null;
    select jsonb_object_agg(key, value) into v_new
      from jsonb_each(to_jsonb(new)) where not (key = any (v_ignored));
    v_action := v_entity || '.create';
  else
    select c.old_values, c.new_values into v_old, v_new
      from private.jsonb_changed(to_jsonb(old), to_jsonb(new), v_ignored) c;

    if v_new = '{}'::jsonb then
      return null; -- nothing meaningful changed
    end if;

    v_action := case
      when v_entity = 'case' and v_new ? 'deleted_at' and (v_new ->> 'deleted_at') is not null then 'case.delete'
      when v_entity = 'case' and v_new ? 'deleted_at'                                then 'case.restore'
      when v_entity = 'case' and v_new ? 'is_skipped' and (v_new ->> 'is_skipped')::boolean
           and not (v_new ? 'black_case_number' or v_new ? 'red_case_number')        then 'case.skip'
      when v_entity = 'case' and v_new ? 'is_skipped'
           and not (v_new ? 'black_case_number' or v_new ? 'red_case_number'
                    or v_new ? 'accused_name' or v_new ? 'court_id' or v_new ? 'note') then 'case.unskip'
      when v_entity = 'case' and (v_new ? 'black_case_number' or v_new ? 'red_case_number')
           and not (v_new ? 'accused_name' or v_new ? 'court_id' or v_new ? 'note')  then 'case.record_numbers'
      when v_entity = 'case'                                                          then 'case.update'
      when v_entity = 'court' and v_new ? 'is_active' and (v_new ->> 'is_active')::boolean then 'court.activate'
      when v_entity = 'court' and v_new ? 'is_active'                                then 'court.deactivate'
      when v_entity = 'court'                                                         then 'court.update'
      when v_entity = 'user' and v_new ? 'role'                                       then 'user.role_change'
      when v_entity = 'user' and v_new ? 'is_active' and (v_new ->> 'is_active')::boolean then 'user.activate'
      when v_entity = 'user' and v_new ? 'is_active'                                 then 'user.deactivate'
      else v_entity || '.update'
    end;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  values ((select auth.uid()), v_action, v_entity, new.id, v_old, v_new);

  return null;
end;
$$;

revoke all on function private.write_audit_log() from public, anon, authenticated;
revoke all on function private.jsonb_changed(jsonb, jsonb, text[]) from public, anon, authenticated;

create trigger cases_audit
  after insert or update on public.cases
  for each row execute function private.write_audit_log('case');

create trigger courts_audit
  after insert or update on public.courts
  for each row execute function private.write_audit_log('court');

create trigger profiles_audit
  after insert or update on public.profiles
  for each row execute function private.write_audit_log('user');

-- Make audit_logs append-only even for privileged roles using the API.
create or replace function private.block_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'AUDIT_LOG_IMMUTABLE';
end;
$$;

revoke all on function private.block_audit_mutation() from public, anon, authenticated;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function private.block_audit_mutation();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.block_audit_mutation();

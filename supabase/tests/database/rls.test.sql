-- =====================================================================
-- FTPD5 – RLS / authorization tests (pgTAP)
-- Run locally:  supabase start && supabase test db
-- Everything runs inside a transaction and is rolled back.
-- Uses only synthetic test data – never real case data.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(45);

-- ---------------------------------------------------------------------
-- Fixtures (as postgres / superuser)
-- ---------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',    '{"full_name":"Test Admin"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'officer@test.local',  '{"full_name":"Test Officer"}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive@test.local', '{"full_name":"Test Inactive","role":"admin"}');

select is(
  (select count(*)::int from public.profiles where id in (
    '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333')),
  3, 'profiles are created automatically for new auth users');

select is(
  (select role::text || ':' || is_active::text from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'officer:false', 'role in user metadata is ignored; new users default to inactive officer');

update public.profiles set role = 'admin', is_active = true where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set is_active = true where id = '22222222-2222-2222-2222-222222222222';

insert into public.courts (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ศาลทดสอบหนึ่ง'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ศาลทดสอบสอง');

insert into public.cases (id, accused_name, court_id, black_case_number) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ผู้ทดสอบ หนึ่ง', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'อ.1/2569'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ผู้ทดสอบ สอง',  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null);

-- ---------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok('select * from public.cases',      '42501', null, 'anon cannot read cases');
select throws_ok('select * from public.profiles',   '42501', null, 'anon cannot read profiles');
select throws_ok('select * from public.courts',     '42501', null, 'anon cannot read courts');
select throws_ok('select * from public.audit_logs', '42501', null, 'anon cannot read audit logs');
select throws_ok('select * from public.get_case_stats()', '42501', null, 'anon cannot call get_case_stats');
select throws_ok('select * from public.search_cases()',   '42501', null, 'anon cannot call search_cases');
select throws_ok($$insert into public.cases (accused_name, court_id) values ('x', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501', null, 'anon cannot insert cases');

-- ---------------------------------------------------------------------
-- Officer
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*)::int from public.cases), 2, 'officer reads active cases');
select is((select count(*)::int from public.profiles), 1, 'officer reads only own profile');
select is((select total::int from public.get_case_stats()), 2, 'officer stats count active cases');

select lives_ok($$insert into public.cases (accused_name, court_id, black_case_number) values ('ผู้ทดสอบ สาม', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'อ.3/2569')$$,
  'officer can add a case');
select is(
  (select created_by::text from public.cases where black_case_number = 'อ.3/2569'),
  '22222222-2222-2222-2222-222222222222', 'created_by is set by the server');

select lives_ok($$update public.cases set red_case_number = 'อ.99/2569' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  'officer can record a red case number');
select ok((select is_complete from public.cases where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'is_complete is derived from both case numbers');
select throws_ok($$update public.cases set red_case_number = 'อ.98/2569' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  '42501', 'CASE_LOCKED', 'officer cannot change numbers of a completed case');
select lives_ok($$update public.cases set note = 'บันทึกเพิ่ม' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  'officer can still edit the note of a completed case');

select lives_ok($$update public.cases set is_skipped = true where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  'officer can skip a case');
select is((select skipped::int from public.get_case_stats()), 1, 'skipped case is counted');

select throws_ok($$update public.cases set accused_name = 'แก้ชื่อ' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  '42501', null, 'officer cannot change accused name');
select throws_ok($$update public.cases set deleted_at = now() where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  '42501', null, 'officer cannot set deleted_at directly');
select throws_ok($$delete from public.cases where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  '42501', null, 'officer cannot hard delete');
select throws_ok($$select public.soft_delete_case('dddddddd-dddd-dddd-dddd-dddddddddddd')$$,
  '42501', null, 'officer cannot soft delete');
select throws_ok($$update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'officer cannot change own role via table');
select throws_ok($$select public.admin_update_user('22222222-2222-2222-2222-222222222222', null, 'admin', null)$$,
  '42501', null, 'officer cannot call admin_update_user');
select throws_ok($$insert into public.courts (name) values ('ศาลปลอม')$$,
  '42501', null, 'officer cannot add courts');
select throws_ok($$insert into public.audit_logs (action, entity_type) values ('x', 'case')$$,
  '42501', null, 'officer cannot insert audit logs');
select throws_ok($$update public.audit_logs set action = 'tampered'$$,
  '42501', null, 'officer cannot update audit logs');
select throws_ok($$delete from public.audit_logs$$,
  '42501', null, 'officer cannot delete audit logs');
select ok(
  (select bool_and(actor_id = '22222222-2222-2222-2222-222222222222') from public.audit_logs),
  'officer sees only own audit entries');

-- ---------------------------------------------------------------------
-- Inactive user (valid JWT, but deactivated profile)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select is((select count(*)::int from public.cases), 0, 'inactive user reads no cases');
select is((select count(*)::int from public.courts), 0, 'inactive user reads no courts');
select is((select total::int from public.get_case_stats()), 0, 'inactive user gets empty stats');
select throws_ok($$insert into public.cases (accused_name, court_id) values ('x', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501', null, 'inactive user cannot insert');

-- ---------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok($$select public.soft_delete_case('dddddddd-dddd-dddd-dddd-dddddddddddd')$$, 'admin can soft delete');
select is((select count(*)::int from public.search_cases(p_deleted_only => true)), 1, 'admin sees deleted cases');
select ok(exists (select 1 from public.audit_logs where action = 'case.delete'
                  and entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
                  and actor_id = '11111111-1111-1111-1111-111111111111'),
  'soft delete is audited with the real actor');
select throws_ok($$select public.admin_update_user('11111111-1111-1111-1111-111111111111', null, 'officer', null)$$,
  '42501', null, 'admin cannot demote self');
select throws_ok($$insert into public.courts (name) values ('  ศาลทดสอบหนึ่ง  ')$$,
  '23505', null, 'duplicate court name (normalised) is rejected');
select throws_ok($$insert into public.cases (accused_name, court_id, black_case_number) values ('ซ้ำ', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'อ. 1/2569')$$,
  '23505', null, 'duplicate black case number in same court is rejected');
select lives_ok($$insert into public.cases (accused_name, court_id, black_case_number) values ('ต่างศาล', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'อ.1/2569')$$,
  'same case number in a different court is allowed');
select lives_ok($$update public.cases set red_case_number = 'อ.100/2569' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  'admin can correct numbers of a completed case');

-- Officer cannot see the deleted row; admin restores it.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.cases where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0,
  'officer cannot see soft-deleted case');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$select public.restore_case('dddddddd-dddd-dddd-dddd-dddddddddddd')$$, 'admin can restore');

select * from finish();
rollback;

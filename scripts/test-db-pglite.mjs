// Runs FTPD5 migrations + RLS tests on PGlite (real Postgres in WASM)
// with minimal stubs for the Supabase environment and pgTAP.
// This is NOT a substitute for 'supabase test db' against the real stack;
// it is a fast offline check of SQL syntax, grants, RLS and triggers.
// Usage: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const project = process.argv[2] ?? '.';
const db = new PGlite({ extensions: { pg_trgm } });

// ---- Supabase-like environment -------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema extensions;
  create schema auth;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema extensions to anon, authenticated;

  create table auth.users (
    id uuid primary key,
    instance_id uuid,
    aud text,
    role text,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );

  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;

  -- Mimic Supabase's permissive defaults so the migrations' REVOKEs are exercised.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

// ---- Migrations -------------------------------------------------------------
const migDir = join(project, 'supabase', 'migrations');
for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(migDir, f), 'utf8'));
    console.log(`migration OK: ${f}`);
  } catch (e) {
    console.error(`migration FAILED: ${f}\n  ${e.message}`);
    process.exit(1);
  }
}

// ---- Minimal pgTAP stub --------------------------------------------------------
await db.exec(`
  create table public.__tap (n serial primary key, ok boolean, description text, diag text);
  grant all on public.__tap to public;
  grant usage on sequence public.__tap_n_seq to public;

  create function public.plan(int) returns text language sql as $$ select '1..' || $1 $$;

  create function public.ok(boolean, text) returns text language plpgsql as $$
  begin
    insert into public.__tap (ok, description) values (coalesce($1, false), $2);
    return $2;
  end $$;

  create function public.is(anyelement, anyelement, text) returns text language plpgsql as $$
  begin
    insert into public.__tap (ok, description, diag)
    values ($1 is not distinct from $2, $3, format('have %s want %s', $1, $2));
    return $3;
  end $$;

  create function public.lives_ok(text, text) returns text language plpgsql as $$
  begin
    begin
      execute $1;
      insert into public.__tap (ok, description) values (true, $2);
    exception when others then
      insert into public.__tap (ok, description, diag) values (false, $2, sqlstate || ' ' || sqlerrm);
    end;
    return $2;
  end $$;

  create function public.throws_ok(text, char(5), text, text) returns text language plpgsql as $$
  begin
    begin
      execute $1;
      insert into public.__tap (ok, description, diag) values (false, $4, 'no exception raised');
    exception when others then
      insert into public.__tap (ok, description, diag)
      values (sqlstate = $2, $4, 'got ' || sqlstate || ' ' || sqlerrm);
    end;
    return $4;
  end $$;

  create function public.finish() returns setof text language sql as $$ select 'done'::text $$;
  grant execute on function public.plan(int), public.ok(boolean, text), public.is(anyelement, anyelement, text), public.lives_ok(text, text), public.throws_ok(text, char, text, text), public.finish() to public;
`);

// ---- Run the real test file (minus pgtap extension + final rollback) -------
const testFile = join(project, 'supabase', 'tests', 'database', 'rls.test.sql');
let sql = readFileSync(testFile, 'utf8')
  .replace(/create extension if not exists pgtap[^;]*;/i, '')
  .replace(/\nrollback;\s*$/i, '\n');

const planned = Number(/select plan\((\d+)\)/i.exec(sql)?.[1] ?? 0);

try {
  await db.exec(sql);
} catch (e) {
  console.error(`TEST SCRIPT ABORTED: ${e.message}`);
}
await db.exec('reset role;');
const { rows } = await db.query('select n, ok, description, diag from public.__tap order by n');
await db.exec('rollback;').catch(() => {});

let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'ok    ' : 'NOT OK'} ${r.n} - ${r.description}${r.ok ? '' : `  [${r.diag}]`}`);
}
console.log(`\nplanned ${planned}, ran ${rows.length}, failed ${failed}`);
process.exit(failed || rows.length !== planned ? 1 : 0);

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Real PostgreSQL Integration Test Suite.
 * Uses PGlite (official WASM-compiled PostgreSQL 16 engine).
 * Executes exact SQL migration files, DDL, DML, triggers, RLS, and PL/pgSQL functions.
 */

async function createTestPostgres() {
  const db = new PGlite({ extensions: { pgcrypto } });

  // Provision Supabase default roles and auth schema
  await db.exec(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role;
      end if;
    end $$;

    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      created_at timestamptz default now()
    );

    -- Configurable auth.uid() session simulator
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);

  return db;
}

function setSessionUser(db: PGlite, userId: string | null) {
  if (userId) {
    return db.query(`set request.jwt.claim.sub = '${userId}';`);
  }
  return db.query(`set request.jwt.claim.sub = '';`);
}

// ============================================================================
// SUITE 1: Fresh Installation (001_initial_schema.sql)
// ============================================================================

test("Real Postgres: Fresh installation creates all tables, triggers, and functions", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  // Verify tables exist
  const tables = await db.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' and tablename in ('applications', 'status_history', 'coordinators');`
  );
  assert.equal(tables.rows.length, 3, "applications, status_history, and coordinators tables must exist");

  // Verify RLS is enabled on all 3 tables
  const rls = await db.query<{ tablename: string; rowsecurity: boolean }>(
    `select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('applications', 'status_history', 'coordinators');`
  );
  for (const row of rls.rows) {
    assert.equal(row.rowsecurity, true, `RLS must be enabled on ${row.tablename}`);
  }
});

test("Real Postgres: add_coordinator(text) has EXECUTE revoked from anon and authenticated", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  const anonPriv = await db.query<{ allowed: boolean }>(
    `select has_function_privilege('anon', 'public.add_coordinator(text)', 'EXECUTE') as allowed;`
  );
  const authPriv = await db.query<{ allowed: boolean }>(
    `select has_function_privilege('authenticated', 'public.add_coordinator(text)', 'EXECUTE') as allowed;`
  );

  assert.equal(anonPriv.rows[0].allowed, false, "anon role must NOT have execute on add_coordinator");
  assert.equal(authPriv.rows[0].allowed, false, "authenticated role must NOT have execute on add_coordinator");
});

test("Real Postgres: Database trigger forces initial status to 'applied' and normalizes email", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  // Attempt to insert an application with status = 'selected' and unnormalized email
  await db.query(`
    insert into public.applications (name, email, email_normalized, branch, year, team, status)
    values ('Sneaky Applicant', '  Applicant.One@RBU.EDU  ', 'temporary', 'CSE', 2, 'Technical', 'selected');
  `);

  const inserted = await db.query<{ status: string; email_normalized: string }>(
    `select status, email_normalized from public.applications where name = 'Sneaky Applicant';`
  );

  assert.equal(inserted.rows.length, 1);
  assert.equal(inserted.rows[0].status, "applied", "Trigger must override status to 'applied'");
  assert.equal(inserted.rows[0].email_normalized, "applicant.one@rbu.edu", "Trigger must lowercase and trim email");
});

test("Real Postgres: Enforces unique normalized email at database level across casing and whitespace", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  await db.query(`
    insert into public.applications (name, email, email_normalized, branch, year, team)
    values ('First Applicant', 'sam@rbu.edu', 'sam@rbu.edu', 'CSE', 1, 'Design');
  `);

  // Attempt duplicate insert with different casing and whitespace
  let duplicateError = false;
  try {
    await db.query(`
      insert into public.applications (name, email, email_normalized, branch, year, team)
      values ('Duplicate Applicant', '  SAM@RBU.EDU  ', 'sam@rbu.edu', 'IT', 2, 'Events');
    `);
  } catch (err: unknown) {
    duplicateError = true;
    assert.match((err as Error).message, /unique constraint|duplicate key/i);
  }

  assert.equal(duplicateError, true, "Database unique constraint must reject duplicate normalized emails");
});

test("Real Postgres: Single status transition rejects unauthorized caller", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  // Insert application
  const app = await db.query<{ id: string }>(`
    insert into public.applications (name, email, email_normalized, branch, year, team)
    values ('Candidate A', 'a@rbu.edu', 'a@rbu.edu', 'CSE', 1, 'Technical')
    returning id;
  `);

  // Call transition without coordinator auth
  await setSessionUser(db, null);
  const resultUnauth = await db.query<{ transition_application_status: { success: boolean; error: string } }>(`
    select public.transition_application_status('${app.rows[0].id}', 'shortlisted') as transition_application_status;
  `);

  assert.equal(resultUnauth.rows[0].transition_application_status.success, false);
  assert.match(resultUnauth.rows[0].transition_application_status.error, /Unauthorized/i);
});

test("Real Postgres: Authorized coordinator transitions candidate with verified audit actor", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  // Create coordinator in auth.users and public.coordinators
  const user = await db.query<{ id: string }>(`
    insert into auth.users (email) values ('coord@rbu.edu') returning id;
  `);
  const coordId = user.rows[0].id;
  await db.query(`select public.add_coordinator('coord@rbu.edu');`);

  // Insert candidate
  const app = await db.query<{ id: string }>(`
    insert into public.applications (name, email, email_normalized, branch, year, team)
    values ('Candidate B', 'b@rbu.edu', 'b@rbu.edu', 'CSE', 2, 'Technical')
    returning id;
  `);
  const appId = app.rows[0].id;

  // Set session as coordinator
  await setSessionUser(db, coordId);

  // Transition from 'applied' to 'shortlisted'
  const res = await db.query<{ transition_application_status: { success: boolean; new_status: string } }>(`
    select public.transition_application_status('${appId}', 'shortlisted') as transition_application_status;
  `);

  assert.equal(res.rows[0].transition_application_status.success, true);
  assert.equal(res.rows[0].transition_application_status.new_status, "shortlisted");

  // Verify candidate row
  const updatedApp = await db.query<{ status: string }>(`select status from public.applications where id = '${appId}';`);
  assert.equal(updatedApp.rows[0].status, "shortlisted");

  // Verify status_history audit entry
  const history = await db.query<{ previous_status: string; new_status: string; actor_id: string }>(
    `select previous_status, new_status, actor_id from public.status_history where application_id = '${appId}';`
  );
  assert.equal(history.rows.length, 1);
  assert.equal(history.rows[0].previous_status, "applied");
  assert.equal(history.rows[0].new_status, "shortlisted");
  assert.equal(history.rows[0].actor_id, coordId, "Audit actor_id must match authenticated coordinator");
});

test("Real Postgres: Bulk status transition executes in single transaction with all-or-nothing rollback", async () => {
  const db = await createTestPostgres();
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"), "utf8");
  await db.exec(sql);

  // Authorize coordinator
  const user = await db.query<{ id: string }>(`insert into auth.users (email) values ('lead@rbu.edu') returning id;`);
  const coordId = user.rows[0].id;
  await db.query(`select public.add_coordinator('lead@rbu.edu');`);
  await setSessionUser(db, coordId);

  // Insert 3 candidates
  const app1 = await db.query<{ id: string }>(
    `insert into public.applications (name, email, email_normalized, branch, year, team) values ('C1', 'c1@rbu.edu', 'c1@rbu.edu', 'CSE', 1, 'Design') returning id;`
  );
  const app2 = await db.query<{ id: string }>(
    `insert into public.applications (name, email, email_normalized, branch, year, team) values ('C2', 'c2@rbu.edu', 'c2@rbu.edu', 'CSE', 2, 'Design') returning id;`
  );
  const app3 = await db.query<{ id: string }>(
    `insert into public.applications (name, email, email_normalized, branch, year, team) values ('C3', 'c3@rbu.edu', 'c3@rbu.edu', 'CSE', 3, 'Design') returning id;`
  );

  const id1 = app1.rows[0].id;
  const id2 = app2.rows[0].id;
  const id3 = app3.rows[0].id;

  // Move C3 to 'shortlisted', then 'interview'
  await db.query(`select public.transition_application_status('${id3}', 'shortlisted');`);
  await db.query(`select public.transition_application_status('${id3}', 'interview');`);

  const historyCountBefore = (await db.query<{ count: string }>(`select count(*) from public.status_history;`)).rows[0].count;

  // Attempt bulk transition of all 3 to 'shortlisted'
  // C1 and C2 are 'applied' (valid target)
  // C3 is 'interview' ('interview' -> 'shortlisted' is an INVALID transition!)
  const bulkRes = await db.query<{ bulk_transition_application_status: { success: boolean; error: string } }>(`
    select public.bulk_transition_application_status(
      array['${id1}', '${id2}', '${id3}']::uuid[],
      'shortlisted'
    ) as bulk_transition_application_status;
  `);

  assert.equal(bulkRes.rows[0].bulk_transition_application_status.success, false);
  assert.match(bulkRes.rows[0].bulk_transition_application_status.error, /Batch rejected/i);

  // VERIFY ALL-OR-NOTHING ROLLBACK:
  // C1 and C2 must remain 'applied' (no partial status changes committed!)
  const status1 = (await db.query<{ status: string }>(`select status from public.applications where id = '${id1}';`)).rows[0].status;
  const status2 = (await db.query<{ status: string }>(`select status from public.applications where id = '${id2}';`)).rows[0].status;
  const status3 = (await db.query<{ status: string }>(`select status from public.applications where id = '${id3}';`)).rows[0].status;

  assert.equal(status1, "applied", "C1 must NOT have been updated");
  assert.equal(status2, "applied", "C2 must NOT have been updated");
  assert.equal(status3, "interview", "C3 must remain 'interview'");

  // ZERO new audit entries committed for the failed batch
  const historyCountAfter = (await db.query<{ count: string }>(`select count(*) from public.status_history;`)).rows[0].count;
  assert.equal(historyCountAfter, historyCountBefore, "No audit entries must be written on batch failure");
});

// ============================================================================
// SUITE 2: Upgrade Migration Path (001 legacy -> 002 -> 003)
// ============================================================================

test("Real Postgres: Upgrade path drops legacy 3-param transition RPC and removes blanket promotion", async () => {
  const db = await createTestPostgres();

  // 1. Simulate existing database with Milestone 1 legacy schema
  await db.exec(`
    create type application_status as enum ('applied', 'shortlisted', 'interview', 'selected', 'rejected');
    create table public.applications (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null,
      email_normalized text not null,
      branch text not null,
      year integer not null,
      team text not null,
      answers jsonb not null default '{}',
      status application_status not null default 'applied',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create unique index idx_applications_email_normalized on public.applications (email_normalized);
    create table public.status_history (
      id uuid primary key default gen_random_uuid(),
      application_id uuid not null references public.applications(id) on delete cascade,
      previous_status application_status,
      new_status application_status not null,
      actor_id uuid,
      created_at timestamptz not null default now()
    );

    -- Milestone 1 legacy 3-parameter function
    create or replace function public.transition_application_status(
      p_application_id uuid,
      p_new_status application_status,
      p_actor_id uuid
    ) returns jsonb language plpgsql as $$
    begin
      return jsonb_build_object('success', true, 'legacy', true);
    end;
    $$;

    -- Add a regular student user to auth.users before migration
    insert into auth.users (email) values ('student@rbu.edu');
  `);

  // Verify that the legacy 3-argument function initially exists in pg_proc
  const procsBefore = await db.query<{ pronargs: number }>(
    `select pronargs from pg_proc where proname = 'transition_application_status';`
  );
  assert.equal(procsBefore.rows.some((r) => r.pronargs === 3), true, "Legacy 3-arg function must exist before upgrade");

  // 2. Apply migration 002
  const sql002 = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/002_security_and_bulk_transitions.sql"), "utf8");
  await db.exec(sql002);

  // 3. Apply migration 003
  const sql003 = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/003_harden_coordinator_auth_and_drop_legacy_rpc.sql"), "utf8");
  await db.exec(sql003);

  // VERIFY: Legacy 3-argument function has been dropped completely
  const procsAfter = await db.query<{ pronargs: number }>(
    `select pronargs from pg_proc where proname = 'transition_application_status';`
  );
  assert.equal(procsAfter.rows.length, 1, "Only one transition_application_status function should exist");
  assert.equal(procsAfter.rows[0].pronargs, 2, "Only the secure 2-parameter function must exist");

  // VERIFY: No blanket promotion of auth.users
  const coordCount = await db.query<{ count: string | number }>(`select count(*) from public.coordinators;`);
  assert.equal(Number(coordCount.rows[0].count), 0, "student@rbu.edu must NOT have been automatically promoted to coordinator");

  // VERIFY: add_coordinator execution is revoked from anon and authenticated
  const privAnon = await db.query<{ allowed: boolean }>(
    `select has_function_privilege('anon', 'public.add_coordinator(text)', 'EXECUTE') as allowed;`
  );
  const privAuth = await db.query<{ allowed: boolean }>(
    `select has_function_privilege('authenticated', 'public.add_coordinator(text)', 'EXECUTE') as allowed;`
  );
  assert.equal(privAnon.rows[0].allowed, false, "anon cannot execute add_coordinator");
  assert.equal(privAuth.rows[0].allowed, false, "authenticated cannot execute add_coordinator");
});

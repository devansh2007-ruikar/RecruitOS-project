-- RecruitOS: Milestone 2 Security Hardening & Bulk Transitions Migration
-- Run this in the Supabase SQL Editor on existing databases.
-- ============================================================================

-- 1. Create coordinators table
-- ============================================================================
create table if not exists public.coordinators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'coordinator',
  created_at timestamptz not null default now()
);

alter table public.coordinators enable row level security;

-- Drop existing coordinator policies if re-running
drop policy if exists "Coordinators can view coordinators list" on public.coordinators;
create policy "Coordinators can view coordinators list"
  on public.coordinators for select
  to authenticated
  using (auth.uid() = user_id);

-- Note on Coordinator Memberships:
-- Blanket promotion of auth.users is removed to prevent unauthorized access.
-- Coordinators must be authorized explicitly via public.add_coordinator('email')
-- or via direct insert in the SQL Editor. Do not automatically delete existing
-- coordinators without manual review.

-- 2. Explicit coordinator check function (SECURITY DEFINER with safe search_path)
-- ============================================================================
create or replace function public.is_coordinator(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.coordinators
    where user_id = p_user_id
  );
$$;

revoke execute on function public.is_coordinator(uuid) from public;
grant execute on function public.is_coordinator(uuid) to authenticated;

-- Admin helper to authorize a coordinator by email (SQL Editor / Service Role only)
create or replace function public.add_coordinator(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(trim(email)) = lower(trim(p_email));

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'No auth user found with email ' || p_email);
  end if;

  insert into public.coordinators (user_id, email)
  values (v_user_id, lower(trim(p_email)))
  on conflict (user_id) do nothing;

  return jsonb_build_object('success', true, 'user_id', v_user_id);
end;
$$;

-- Restrict execution to SQL Editor / Admin / Service Role only
revoke all on function public.add_coordinator(text) from public;
revoke all on function public.add_coordinator(text) from anon;
revoke all on function public.add_coordinator(text) from authenticated;

-- 3. Hardened Application triggers: force initial status & database-level email normalization
-- ============================================================================
create or replace function public.handle_application_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Force initial status to 'applied' regardless of what client payload sent
  new.status := 'applied'::application_status;

  -- Force normalization of email at database level (lowercase and trimmed)
  new.email_normalized := lower(trim(new.email));

  return new;
end;
$$;

drop trigger if exists on_application_insert on public.applications;
create trigger on_application_insert
  before insert on public.applications
  for each row
  execute function public.handle_application_insert();

-- Ensure handle_updated_at also has a safe search_path and normalizes email if changed
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.email is distinct from old.email then
    new.email_normalized := lower(trim(new.email));
  end if;
  return new;
end;
$$;

-- 4. Restrict application and history access via RLS
-- ============================================================================
-- Applications table:
-- Drop old permissive policies
drop policy if exists "Coordinators can read applications" on public.applications;
drop policy if exists "Coordinators can update applications" on public.applications;
drop policy if exists "Authorized coordinators can read applications" on public.applications;

-- Only authorized coordinators can read candidates
create policy "Authorized coordinators can read applications"
  on public.applications for select
  to authenticated
  using (public.is_coordinator(auth.uid()));

-- NOTICE: We do NOT create any UPDATE policy on public.applications for authenticated users.
-- This prevents direct status updates from the browser or malicious clients.
-- All status updates MUST flow through transition_application_status or bulk_transition_application_status.

-- Status history table:
-- Drop old permissive policies
drop policy if exists "System can insert status history" on public.status_history;
drop policy if exists "Coordinators can read status history" on public.status_history;
drop policy if exists "Authorized coordinators can read status history" on public.status_history;

-- Only authorized coordinators can read status history
create policy "Authorized coordinators can read status history"
  on public.status_history for select
  to authenticated
  using (public.is_coordinator(auth.uid()));

-- NOTICE: We do NOT create any INSERT policy on status_history for authenticated/anon.
-- Audit entries can ONLY be written by the SECURITY DEFINER transition functions.
-- This prevents forged audit inserts.

-- 5. Hardened Single Transition Function
-- ============================================================================
-- Explicitly drop the legacy 3-argument function overload from Milestone 1
drop function if exists public.transition_application_status(uuid, application_status, uuid);

-- Removes caller-supplied actor_id: derives actor identity strictly from auth.uid()
-- Checks coordinator authorization inside the function
-- Uses safe search_path = public, pg_temp
create or replace function public.transition_application_status(
  p_application_id uuid,
  p_new_status application_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_current_status application_status;
  v_valid boolean := false;
begin
  -- 1. Explicit coordinator authorization check
  if v_actor_id is null or not public.is_coordinator(v_actor_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: caller is not an authorized coordinator'
    );
  end if;

  -- 2. Lock row for atomic update
  select status into v_current_status
  from public.applications
  where id = p_application_id
  for update;

  if v_current_status is null then
    return jsonb_build_object('success', false, 'error', 'Application not found');
  end if;

  -- 3. Validate transition state machine
  v_valid := case
    when v_current_status = 'applied' and p_new_status in ('shortlisted', 'rejected') then true
    when v_current_status = 'shortlisted' and p_new_status in ('interview', 'rejected') then true
    when v_current_status = 'interview' and p_new_status in ('selected', 'rejected') then true
    else false
  end;

  if not v_valid then
    return jsonb_build_object(
      'success', false,
      'error', format('Invalid transition: %s → %s', v_current_status, p_new_status)
    );
  end if;

  -- 4. Update status atomically
  update public.applications
  set status = p_new_status
  where id = p_application_id;

  -- 5. Insert audit entry with verified actor_id
  insert into public.status_history (application_id, previous_status, new_status, actor_id)
  values (p_application_id, v_current_status, p_new_status, v_actor_id);

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

revoke execute on function public.transition_application_status(uuid, application_status) from public;
grant execute on function public.transition_application_status(uuid, application_status) to authenticated;

-- 6. Bulk Transition Function (All-or-Nothing Transaction)
-- ============================================================================
create or replace function public.bulk_transition_application_status(
  p_application_ids uuid[],
  p_new_status application_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_app record;
  v_valid boolean;
  v_count integer := 0;
  v_found_count integer := 0;
  v_expected_count integer;
begin
  -- 1. Explicit coordinator authorization check
  if v_actor_id is null or not public.is_coordinator(v_actor_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: caller is not an authorized coordinator'
    );
  end if;

  -- 2. Validate input array
  if p_application_ids is null or array_length(p_application_ids, 1) is null or array_length(p_application_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'No candidate IDs provided');
  end if;

  v_expected_count := array_length(p_application_ids, 1);

  -- 3. Verify that all candidates exist in database
  select count(distinct id) into v_found_count
  from public.applications
  where id = any(p_application_ids);

  if v_found_count <> v_expected_count then
    return jsonb_build_object(
      'success', false,
      'error', format('Batch rejected: expected %s candidates, but found %s in database', v_expected_count, v_found_count)
    );
  end if;

  -- 4. Check that every candidate can transition to p_new_status
  -- If ANY candidate has an invalid transition, reject entire batch (0 changes committed)
  for v_app in
    select id, name, status
    from public.applications
    where id = any(p_application_ids)
    for update
  loop
    v_valid := case
      when v_app.status = 'applied' and p_new_status in ('shortlisted', 'rejected') then true
      when v_app.status = 'shortlisted' and p_new_status in ('interview', 'rejected') then true
      when v_app.status = 'interview' and p_new_status in ('selected', 'rejected') then true
      else false
    end;

    if not v_valid then
      return jsonb_build_object(
        'success', false,
        'error', format('Batch rejected: candidate "%s" with status "%s" cannot transition to "%s"', v_app.name, v_app.status, p_new_status)
      );
    end if;
  end loop;

  -- 5. If all transitions are valid, execute updates and audit entries
  for v_app in
    select id, status
    from public.applications
    where id = any(p_application_ids)
  loop
    update public.applications
    set status = p_new_status
    where id = v_app.id;

    insert into public.status_history (application_id, previous_status, new_status, actor_id)
    values (v_app.id, v_app.status, p_new_status, v_actor_id);

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'count', v_count,
    'new_status', p_new_status
  );
end;
$$;

revoke execute on function public.bulk_transition_application_status(uuid[], application_status) from public;
grant execute on function public.bulk_transition_application_status(uuid[], application_status) to authenticated;

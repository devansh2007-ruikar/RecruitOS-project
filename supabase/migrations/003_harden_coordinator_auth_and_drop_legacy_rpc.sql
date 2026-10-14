-- RecruitOS: Migration 003 — Harden Coordinator Authorization & Drop Legacy RPC
-- Run this in the Supabase SQL Editor on already-configured databases.
-- ============================================================================

-- 1. Explicitly drop the legacy 3-argument function overload
-- ============================================================================
-- Milestone 1 defined: transition_application_status(p_application_id uuid, p_new_status application_status, p_actor_id uuid)
-- Because Postgres matches functions by signature, creating the 2-argument version in Milestone 2
-- did not remove this 3-argument overload. We drop it here to eliminate the spoofable actor_id vector.
drop function if exists public.transition_application_status(uuid, application_status, uuid);

-- 2. Restrict add_coordinator(text) to SQL-Editor / Service-Role / Admin only
-- ============================================================================
-- Revoke execution from PUBLIC, anon, and authenticated so arbitrary users
-- cannot invoke this function via PostgREST / RPC.
revoke all on function public.add_coordinator(text) from public;
revoke all on function public.add_coordinator(text) from anon;
revoke all on function public.add_coordinator(text) from authenticated;

-- Ensure safe search path and security definer
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

revoke all on function public.add_coordinator(text) from public;
revoke all on function public.add_coordinator(text) from anon;
revoke all on function public.add_coordinator(text) from authenticated;

-- 3. Lock down coordinators table RLS
-- ============================================================================
-- Ensure no INSERT, UPDATE, or DELETE policies exist for anon or authenticated.
-- Only SQL Editor / service_role can modify the coordinators table.
alter table public.coordinators enable row level security;

drop policy if exists "Coordinators can view coordinators list" on public.coordinators;
create policy "Coordinators can view coordinators list"
  on public.coordinators for select
  to authenticated
  using (public.is_coordinator(auth.uid()));

-- 4. Manual Coordinator Membership Audit Instructions
-- ============================================================================
-- IMPORTANT: Do NOT automatically delete all coordinators, as this would lock out
-- legitimate team leads. Administrators must inspect current members manually:
--
-- View all current coordinators:
--   select c.user_id, c.email, c.role, c.created_at, u.created_at as auth_created_at
--   from public.coordinators c
--   left join auth.users u on u.id = c.user_id;
--
-- To remove an unverified or unintended coordinator account:
--   delete from public.coordinators where email = 'unauthorized-user@example.com';
--
-- To authorize a legitimate coordinator:
--   select public.add_coordinator('verified-coordinator@rbu.edu');

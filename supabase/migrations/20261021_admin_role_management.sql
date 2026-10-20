-- ─────────────────────────────────────────────────────────────────────────────
-- Velocity Turf: Admin Role Management & Turf Owner Direct-Access Support
-- Safe for existing production databases. Idempotent and reversible.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure profiles table has valid role check constraint
-- Valid roles: 'player', 'owner', 'admin'
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('player', 'owner', 'admin'));
  end if;
end $$;

-- 2. Verify that column-level permissions prevent authenticated users from self-elevating.
-- 'authenticated' users may only update full_name, never role directly.
revoke update (role) on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- 3. Ensure index exists on turfs.owner_id and archived_at for fast owner lookup
create index if not exists turfs_owner_active_idx
  on public.turfs (owner_id, archived_at)
  where archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Validation Query (Run to verify):
-- select role, count(*) from public.profiles group by role;
-- ─────────────────────────────────────────────────────────────────────────────

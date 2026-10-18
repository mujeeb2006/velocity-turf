-- ============================================================
-- Migration: 20261012_payout_and_schema_sync.sql
-- Idempotent & non-destructive.
-- 1. Synchronizes payouts schema (payout_number / payout_id compatibility)
-- 2. Ensures check constraints and status validity
-- 3. Ensures audit logging and soft archiving tables exist
-- ============================================================

-- ── 1. Payouts column and constraint synchronization ──────────
alter table public.payouts
  add column if not exists payout_number text;

alter table public.payouts
  add column if not exists payout_id text;

-- Populate payout_number from payout_id where available
update public.payouts
set payout_number = payout_id
where payout_number is null and payout_id is not null;

-- Populate payout_id from payout_number where available
update public.payouts
set payout_id = payout_number
where payout_id is null and payout_number is not null;

-- Ensure payouts status constraint accommodates all valid workflow states
alter table public.payouts drop constraint if exists payouts_status_check;
alter table public.payouts
  add constraint payouts_status_check
    check (status in ('pending', 'processing', 'paid', 'failed'));

-- ── 2. Ensure archived_at exists on turfs and bookings ─────────
alter table public.turfs
  add column if not exists archived_at timestamptz;

alter table public.bookings
  add column if not exists archived_at timestamptz;

create index if not exists turfs_archived_idx on public.turfs (archived_at) where archived_at is not null;
create index if not exists bookings_archived_idx on public.bookings (archived_at) where archived_at is not null;

-- ── 3. Ensure booking_audit_log table and trigger exist ───────
create table if not exists public.booking_audit_log (
  id              uuid        primary key default gen_random_uuid(),
  booking_id      uuid        not null references public.bookings(id) on delete restrict,
  turf_id         uuid        references public.turfs(id) on delete set null,
  player_id       uuid        references public.profiles(id) on delete set null,
  actor_id        uuid        references public.profiles(id) on delete set null,
  actor_role      text,
  action          text        not null,
  prev_status     text,
  new_status      text        not null,
  reason          text,
  idempotency_key text,
  created_at      timestamptz not null default now()
);

create index if not exists audit_log_booking_idx on public.booking_audit_log (booking_id, created_at desc);
create index if not exists audit_log_actor_idx   on public.booking_audit_log (actor_id, created_at desc);

alter table public.booking_audit_log enable row level security;
revoke all on public.booking_audit_log from anon, authenticated;
grant select on public.booking_audit_log to authenticated;

drop policy if exists "audit_log_read" on public.booking_audit_log;
create policy "audit_log_read" on public.booking_audit_log for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or player_id = auth.uid()
    or exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  );

-- ── 4. Ensure idempotency_keys table exists ───────────────────
create table if not exists public.idempotency_keys (
  key            text        primary key,
  player_id      uuid        not null references public.profiles(id) on delete cascade,
  resource_type  text        not null default 'booking',
  resource_id    uuid,
  payload_hash   text        not null,
  status         text        not null default 'pending'
    check (status in ('pending', 'success', 'failed')),
  response_body  jsonb,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '24 hours'
);

create index if not exists idempotency_player_idx on public.idempotency_keys (player_id, created_at desc);
alter table public.idempotency_keys enable row level security;
revoke all on public.idempotency_keys from anon, authenticated;

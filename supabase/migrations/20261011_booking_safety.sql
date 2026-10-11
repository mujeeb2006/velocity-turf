-- ============================================================
-- Migration: 20261011_booking_safety.sql
-- Non-destructive. Adds audit log, idempotency keys, fixes
-- payouts status constraint, and protects booking history.
-- Run in Supabase SQL Editor or via CLI.
-- ============================================================

-- ── 1. Booking Audit Log ─────────────────────────────────────
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

-- ── 2. Trigger: write audit log on every booking status change
create or replace function public.log_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.booking_audit_log (
    booking_id, turf_id, player_id,
    actor_id, actor_role,
    action, prev_status, new_status
  ) values (
    new.id, new.turf_id, new.player_id,
    auth.uid(), public.current_user_role(),
    case new.status
      when 'confirmed' then case when tg_op = 'INSERT' then 'created' else 'confirmed' end
      when 'declined'  then 'declined'
      when 'cancelled' then 'cancelled'
      when 'completed' then 'completed'
      else new.status
    end,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status
  );
  return null;
end;
$$;

drop trigger if exists bookings_audit_log on public.bookings;
create trigger bookings_audit_log
  after insert or update of status on public.bookings
  for each row execute function public.log_booking_change();

-- ── 3. Idempotency Keys ──────────────────────────────────────
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

-- ── 4. Fix payouts.status CHECK constraint ───────────────────
alter table public.payouts drop constraint if exists payouts_status_check;
alter table public.payouts
  add constraint payouts_status_check
    check (status in ('pending', 'processing', 'paid', 'failed'));

update public.payouts set status = 'paid'
  where status not in ('pending','processing','paid','failed') and lower(status) like '%paid%';
update public.payouts set status = 'processing'
  where status not in ('pending','processing','paid','failed') and lower(status) like '%process%';
update public.payouts set status = 'pending'
  where status not in ('pending','processing','paid','failed');

-- ── 5. Soft-archive old bookings (replace hard-delete) ───────
alter table public.bookings add column if not exists archived_at timestamptz;
create index if not exists bookings_archived_idx on public.bookings (archived_at) where archived_at is not null;

create or replace function public.archive_old_bookings()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.bookings b set archived_at = now()
  where b.archived_at is null
    and b.booking_date < current_date - 90
    and b.status in ('declined', 'cancelled', 'completed')
    and not exists (select 1 from public.disputes d where d.booking_id = b.id and d.status = 'open');
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.archive_old_bookings() from public, anon, authenticated;

-- Reschedule (replace delete job with archive job)
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'delete-expired-bookings';
  perform cron.schedule('archive-old-bookings','0 1 * * *','select public.archive_old_bookings();');
exception when others then
  raise notice 'pg_cron not available — skipping schedule';
end; $$;

-- ── 6. Tighten player cancel RLS ─────────────────────────────
drop policy if exists "bookings_player_cancel" on public.bookings;
create policy "bookings_player_cancel" on public.bookings for update to authenticated
  using  (player_id = auth.uid() and status in ('pending', 'confirmed'))
  with check (player_id = auth.uid() and status = 'cancelled');

-- ── 7. Record this migration ──────────────────────────────────
-- (Run preflight_validation.sql first to create _migrations table)
-- insert into public._migrations (filename, notes)
-- values ('20261011_booking_safety.sql', 'Audit log, idempotency, soft-archive, payouts constraint')
-- on conflict (filename) do nothing;

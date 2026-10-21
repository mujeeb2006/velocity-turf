-- ============================================================
-- Migration: 20261022_owner_community_games.sql
-- Description: Community games management for turf owners with
-- admin approval workflow, individual player pricing, and paid
-- participation recording with accounting safeguards.
-- ============================================================

-- ── 1. Enhance public.matches table ─────────────────────────
alter table public.matches
  add column if not exists title text not null default 'Community Match';

alter table public.matches
  add column if not exists description text;

alter table public.matches
  add column if not exists end_time time;

alter table public.matches
  add column if not exists price_per_player numeric(10,2) not null default 0 check (price_per_player >= 0);

alter table public.matches
  add column if not exists creator_id uuid references public.profiles(id);

alter table public.matches
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected'));

alter table public.matches
  add column if not exists rejection_reason text;

alter table public.matches
  add column if not exists approved_at timestamptz;

alter table public.matches
  add column if not exists approved_by uuid references public.profiles(id);

-- Backfill existing legacy matches as approved with 1-hour duration
update public.matches
set approval_status = 'approved',
    approved_at = coalesce(approved_at, created_at),
    end_time = coalesce(end_time, (start_time + interval '1 hour')::time)
where approval_status = 'pending';

-- Update status check constraint to include all lifecycle statuses
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches
  add constraint matches_status_check
    check (status in ('pending_approval', 'open', 'full', 'cancelled', 'completed', 'rejected'));

create index if not exists matches_creator_id_idx on public.matches (creator_id);
create index if not exists matches_turf_date_idx on public.matches (turf_id, match_date, start_time);
create index if not exists matches_approval_idx on public.matches (approval_status, status);

-- ── 2. Enhance public.match_participants table ──────────────
alter table public.match_participants
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded'));

alter table public.match_participants
  add column if not exists amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0);

alter table public.match_participants
  add column if not exists payment_id text;

alter table public.match_participants
  add column if not exists idempotency_key text;

-- ── 3. Create public.game_payments table ────────────────────
create table if not exists public.game_payments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  player_id uuid not null references public.profiles(id) on delete restrict,
  turf_id uuid not null references public.turfs(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  participation_id uuid references public.match_participants(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  fee numeric(10,2) not null default 0 check (fee >= 0),
  net_amount numeric(10,2) not null check (net_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  payment_method text not null default 'demo_simulated',
  transaction_reference text unique,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb
);

create index if not exists game_payments_owner_status_idx on public.game_payments (owner_id, status);
create index if not exists game_payments_player_idx on public.game_payments (player_id);
create index if not exists game_payments_match_idx on public.game_payments (match_id);

-- Enable Row Level Security
alter table public.game_payments enable row level security;
revoke all on public.game_payments from anon, authenticated;
grant select on public.game_payments to authenticated;

-- ── 4. RLS Policies for matches ─────────────────────────────
drop policy if exists "matches_read_open" on public.matches;
create policy "matches_read_open" on public.matches for select to anon, authenticated
  using (
    (
      matches.approval_status = 'approved'
      and matches.status in ('open', 'full')
      and exists (
        select 1 from public.turfs t
        where t.id = matches.turf_id and t.archived_at is null
      )
    )
    or public.current_user_role() = 'admin'
    or matches.creator_id = auth.uid()
    or exists (
      select 1 from public.turfs t
      where t.id = matches.turf_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "matches_owner_insert" on public.matches;
create policy "matches_owner_insert" on public.matches for insert to authenticated
  with check (
    (public.current_user_role() in ('owner', 'admin'))
    and (creator_id = auth.uid() or public.current_user_role() = 'admin')
    and approval_status = case when public.current_user_role() = 'admin' then approval_status else 'pending' end
    and exists (
      select 1 from public.turfs t
      where t.id = turf_id
        and (t.owner_id = auth.uid() or public.current_user_role() = 'admin')
        and t.archived_at is null
        and t.status = 'live'
    )
  );

drop policy if exists "matches_owner_update" on public.matches;
create policy "matches_owner_update" on public.matches for update to authenticated
  using (
    public.current_user_role() = 'admin'
    or creator_id = auth.uid()
    or exists (
      select 1 from public.turfs t
      where t.id = matches.turf_id and t.owner_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'admin'
    or (
      -- Owners cannot approve their own games:
      approval_status != 'approved'
      or status = 'cancelled'
    )
  );

-- ── 5. RLS Policies for game_payments ───────────────────────
drop policy if exists "game_payments_read" on public.game_payments;
create policy "game_payments_read" on public.game_payments for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or player_id = auth.uid()
    or owner_id = auth.uid()
  );

-- ── 6. Update Participant Count Trigger ─────────────────────
create or replace function public.update_match_participant_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.matches
    set participant_count = participant_count + 1,
        status = case when participant_count + 1 >= max_players then 'full' else 'open' end
    where id = new.match_id
      and status = 'open'
      and approval_status = 'approved'
      and participant_count < max_players;

    if not found then
      raise exception 'This match is full or closed.';
    end if;
    return new;
  end if;

  update public.matches
  set participant_count = greatest(participant_count - 1, 0),
      status = case when status = 'full' and participant_count - 1 < max_players then 'open' else status end
  where id = old.match_id;
  return old;
end;
$$;

-- ── 7. Update match_participants_insert_own Policy ──────────
drop policy if exists "match_participants_insert_own" on public.match_participants;
create policy "match_participants_insert_own" on public.match_participants for insert to authenticated
  with check (
    player_id = auth.uid()
    and (public.current_user_role() in ('player', 'admin'))
    and exists (
      select 1
      from public.matches m
      join public.turfs t on t.id = m.turf_id
      where m.id = match_id
        and t.archived_at is null
        and m.approval_status = 'approved'
        and m.status = 'open'
        and not exists (
          select 1 from public.bookings b
          where b.turf_id = m.turf_id
            and b.booking_date = m.match_date
            and b.start_time = m.start_time
            and b.status in ('pending', 'confirmed', 'completed')
        )
        and not exists (
          select 1 from public.blocked_slots bl
          where bl.turf_id = m.turf_id
            and bl.blocked_date = m.match_date
            and bl.start_time = m.start_time
        )
    )
  );

-- ── 8. Update turf_slots Function ───────────────────────────
create or replace function public.turf_slots(p_turf_id uuid, p_date date)
returns table (slot_time time, status text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with visible_turf as (
    select t.id, t.open_time, t.close_time
    from public.turfs t
    where t.id = p_turf_id
      and t.archived_at is null
      and (t.status = 'live' or t.owner_id = auth.uid() or public.current_user_role() = 'admin')
  ), slots as (
    select v.id as turf_id,
      (v.open_time + generated.hour_offset * interval '1 hour')::time as slot_time
    from visible_turf v
    cross join lateral generate_series(
      0,
      (extract(epoch from (v.close_time - v.open_time)) / 3600)::integer - 1
    ) as generated(hour_offset)
  )
  select s.slot_time,
    case
      when blocked.id is not null then 'blocked'
      when booking.status = 'pending' then 'locked'
      when booking.id is not null then 'booked'
      when match.id is not null then 'match'
      else 'available'
    end as status
  from slots s
  left join public.blocked_slots blocked
    on blocked.turf_id = s.turf_id and blocked.blocked_date = p_date and blocked.start_time = s.slot_time
  left join public.bookings booking
    on booking.turf_id = s.turf_id and booking.booking_date = p_date and booking.start_time = s.slot_time
    and booking.status in ('pending', 'confirmed', 'completed')
  left join public.matches match
    on match.turf_id = s.turf_id and match.match_date = p_date and match.start_time = s.slot_time
    and match.approval_status = 'approved' and match.status in ('open', 'full')
  order by s.slot_time;
$$;

revoke all on function public.turf_slots(uuid, date) from public;
grant execute on function public.turf_slots(uuid, date) to anon, authenticated;

-- Grants for authenticated users on matches & match_participants
grant select, insert (turf_id, creator_id, sport, title, description, match_date, start_time, end_time, max_players, price_per_player, skill_level, status, approval_status), update (title, description, max_players, price_per_player, status) on public.matches to authenticated;
grant select (match_id, player_id, payment_status, amount_paid, payment_id, idempotency_key), insert (match_id, player_id, payment_status, amount_paid, payment_id, idempotency_key), delete on public.match_participants to authenticated;

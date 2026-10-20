-- Migration: 20261021_match_booking_conflict_prevention.sql
-- Description: Synchronize community match schedules with turf availability to prevent
-- overlapping private bookings and matches on the same turf at the same time.
--
-- Rollback Instructions:
-- To rollback, re-apply the turf_slots definition and match_participants_insert_own policy
-- from 20261011_turf_archiving_a.sql.

-- 1. Update public.turf_slots to check for active community matches (status in 'open', 'full')
-- If an active match occupies the slot, the slot status is returned as 'match' (unavailable for booking).
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
    and match.status in ('open', 'full')
  order by s.slot_time;
$$;

revoke all on function public.turf_slots(uuid, date) from public;
grant execute on function public.turf_slots(uuid, date) to anon, authenticated;

-- 2. Update match_participants_insert_own policy
-- Enforce that a match can only be joined if the turf is not archived, the match is open,
-- and the slot has not been claimed by a private booking or blocked slot.
drop policy if exists "match_participants_insert_own" on public.match_participants;
create policy "match_participants_insert_own" on public.match_participants for insert to authenticated
  with check (
    player_id = auth.uid()
    and public.current_user_role() = 'player'
    and exists (
      select 1
      from public.matches m
      join public.turfs t on t.id = m.turf_id
      where m.id = match_id
        and t.archived_at is null
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

-- 3. Document Participant Roster View (Privacy-Safe Roster helper)
-- Provides authenticated match participants with display names without leaking emails, phone numbers, or metadata.
create or replace view public.match_rosters as
  select
    mp.match_id,
    p.id as player_id,
    coalesce(p.full_name, 'Player') as player_name,
    mp.created_at as joined_at
  from public.match_participants mp
  join public.profiles p on p.id = mp.player_id;

revoke all on public.match_rosters from public, anon;
grant select on public.match_rosters to authenticated;

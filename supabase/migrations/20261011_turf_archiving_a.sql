-- Archive turfs instead of deleting listings that may have booking history.
-- Existing bookings and financial records remain attached to their turf.

alter table public.turfs
  add column if not exists archived_at timestamptz;

drop policy if exists "turfs_read_live_or_owned" on public.turfs;
create policy "turfs_read_live_or_owned" on public.turfs for select to anon, authenticated
  using (
    (archived_at is null and status = 'live')
    or owner_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

create or replace function public.archive_turf(p_turf_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  turf_owner_id uuid;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to archive a turf.' using errcode = '42501';
  end if;

  select t.owner_id into turf_owner_id
  from public.turfs t
  where t.id = p_turf_id;

  if not found then
    return false;
  end if;

  actor_role := public.current_user_role();
  if actor_role is distinct from 'admin'
    and (actor_role is distinct from 'owner' or turf_owner_id is distinct from auth.uid()) then
    raise exception 'Only the turf owner or an admin can archive this listing.' using errcode = '42501';
  end if;

  update public.turfs
  set archived_at = coalesce(archived_at, now())
  where id = p_turf_id;

  return true;
end;
$$;

revoke all on function public.archive_turf(uuid) from public, anon;
grant execute on function public.archive_turf(uuid) to authenticated;

drop policy if exists "bookings_player_insert" on public.bookings;
create policy "bookings_player_insert" on public.bookings for insert to authenticated
  with check (
    player_id = auth.uid()
    and public.current_user_role() = 'player'
    and exists (
      select 1 from public.turfs t
      where t.id = turf_id and t.status = 'live' and t.archived_at is null
    )
  );

drop policy if exists "matches_read_open" on public.matches;
create policy "matches_read_open" on public.matches for select to anon, authenticated
  using (
    (
      matches.status in ('open', 'full')
      and exists (
        select 1 from public.turfs t
        where t.id = matches.turf_id and t.archived_at is null
      )
    )
    or public.current_user_role() = 'admin'
  );

drop policy if exists "match_participants_insert_own" on public.match_participants;
create policy "match_participants_insert_own" on public.match_participants for insert to authenticated
  with check (
    player_id = auth.uid()
    and public.current_user_role() = 'player'
    and exists (
      select 1
      from public.matches m
      join public.turfs t on t.id = m.turf_id
      where m.id = match_id and t.archived_at is null
    )
  );

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
      else 'available'
    end as status
  from slots s
  left join public.blocked_slots blocked
    on blocked.turf_id = s.turf_id and blocked.blocked_date = p_date and blocked.start_time = s.slot_time
  left join public.bookings booking
    on booking.turf_id = s.turf_id and booking.booking_date = p_date and booking.start_time = s.slot_time
    and booking.status in ('pending', 'confirmed', 'completed')
  order by s.slot_time;
$$;

create or replace function public.prepare_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  turf_row public.turfs%rowtype;
  slot_status text;
  occupied_count integer;
  total_count integer;
begin
  select * into turf_row from public.turfs where id = new.turf_id for update;
  if not found or turf_row.status <> 'live' or turf_row.archived_at is not null then
    raise exception 'This turf is not available for booking.';
  end if;
  if new.booking_date < current_date then
    raise exception 'Bookings cannot be made for a past date.';
  end if;
  if not (new.sport = any(turf_row.sports)) then
    raise exception 'This sport is not offered at this turf.';
  end if;

  select s.status into slot_status
  from public.turf_slots(new.turf_id, new.booking_date) s
  where s.slot_time = new.start_time;
  if slot_status is distinct from 'available' then
    raise exception 'This slot is not available.';
  end if;

  select count(*) filter (where s.status <> 'available'), count(*)
    into occupied_count, total_count
  from public.turf_slots(new.turf_id, new.booking_date) s;

  new.price := case
    when total_count > 0 and occupied_count::numeric / total_count > 0.7 then turf_row.peak_price
    else turf_row.base_price
  end;
  new.status := 'confirmed';
  return new;
end;
$$;

alter table public.bookings
  alter column status set default 'confirmed';

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
  if not found or turf_row.status <> 'live' then
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

drop policy if exists "bookings_owner_respond" on public.bookings;
create policy "bookings_owner_respond" on public.bookings for update to authenticated
  using (
    status in ('pending', 'confirmed')
    and exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  )
  with check (
    status in ('confirmed', 'declined')
    and exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  );

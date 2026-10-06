-- Run this once in a new Supabase project's SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'player' check (role in ('player', 'owner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to anon, authenticated;

create table if not exists public.turfs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  address text not null,
  city text not null,
  sports text[] not null default '{}',
  amenities text[] not null default '{}',
  base_price numeric(10, 2) not null check (base_price >= 0),
  peak_price numeric(10, 2) not null check (peak_price >= 0),
  open_time time not null default '06:00',
  close_time time not null default '22:00',
  status text not null default 'pending' check (status in ('pending', 'live', 'rejected')),
  approved_at timestamptz,
  rating numeric(3, 2) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  constraint turfs_valid_hours check (open_time < close_time)
);

create index if not exists turfs_owner_id_idx on public.turfs (owner_id);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete restrict,
  player_id uuid not null references public.profiles(id) on delete restrict,
  booking_date date not null,
  start_time time not null,
  sport text not null,
  players_count integer not null default 1 check (players_count > 0),
  price numeric(10, 2) not null check (price >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_active_slot_unique
  on public.bookings (turf_id, booking_date, start_time)
  where status in ('pending', 'confirmed', 'completed');

create index if not exists bookings_player_date_idx on public.bookings (player_id, booking_date);
create index if not exists bookings_turf_date_status_idx on public.bookings (turf_id, booking_date, status);

create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  blocked_date date not null,
  start_time time not null,
  created_at timestamptz not null default now(),
  unique (turf_id, blocked_date, start_time)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete restrict,
  turf_id uuid not null references public.turfs(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists reviews_turf_created_idx on public.reviews (turf_id, created_at desc);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('VT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  raised_by uuid not null references public.profiles(id) on delete restrict,
  turf_id uuid not null references public.turfs(id) on delete restrict,
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  issue text not null check (char_length(issue) between 1 and 2000),
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists disputes_status_created_idx on public.disputes (status, created_at desc);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payout_id text unique,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  period text,
  period_start date,
  period_end date,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

create or replace function public.notify_admins(notification_title text, notification_body text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, title, body)
  select p.id, notification_title, notification_body
  from public.profiles p
  where p.role = 'admin';
$$;

revoke all on function public.notify_admins(text, text) from public, anon;
grant execute on function public.notify_admins(text, text) to authenticated;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete restrict,
  sport text not null,
  match_date date not null,
  start_time time not null,
  max_players integer not null check (max_players > 0),
  participant_count integer not null default 0 check (participant_count >= 0),
  skill_level text not null default 'Any',
  status text not null default 'open' check (status in ('open', 'full', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  constraint matches_participant_capacity check (participant_count <= max_players)
);

create index if not exists matches_status_date_idx on public.matches (status, match_date);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists match_participants_player_id_idx on public.match_participants (player_id);

alter table public.profiles enable row level security;
alter table public.turfs enable row level security;
alter table public.bookings enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.payouts enable row level security;
alter table public.notifications enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;

revoke all on public.profiles, public.turfs, public.bookings, public.blocked_slots,
  public.reviews, public.disputes, public.payouts, public.notifications,
  public.matches, public.match_participants from anon, authenticated;

grant select (id, full_name, role, created_at) on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.turfs to anon, authenticated;
grant insert (owner_id, name, address, city, sports, amenities, base_price, peak_price, open_time, close_time, status)
  on public.turfs to authenticated;
grant update (status, approved_at) on public.turfs to authenticated;
grant select on public.bookings to authenticated;
grant insert (turf_id, player_id, booking_date, start_time, sport, players_count) on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;
grant select on public.blocked_slots to authenticated;
grant insert (turf_id, blocked_date, start_time) on public.blocked_slots to authenticated;
grant delete on public.blocked_slots to authenticated;
grant select on public.reviews to authenticated;
grant insert (player_id, turf_id, booking_id, rating, comment) on public.reviews to authenticated;
grant select on public.disputes to authenticated;
grant insert (raised_by, turf_id, booking_id, issue) on public.disputes to authenticated;
grant update (status, resolved_at) on public.disputes to authenticated;
grant select on public.payouts, public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
grant select on public.matches to anon, authenticated;
grant select (match_id, player_id), insert (match_id, player_id), delete on public.match_participants to authenticated;

drop policy if exists "profiles_authenticated_read" on public.profiles;
create policy "profiles_authenticated_read" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
    or exists (
      select 1
      from public.bookings b
      join public.turfs t on t.id = b.turf_id
      where b.player_id = profiles.id and t.owner_id = auth.uid()
    )
  );
drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "turfs_read_live_or_owned" on public.turfs;
create policy "turfs_read_live_or_owned" on public.turfs for select to anon, authenticated
  using (status = 'live' or owner_id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists "turfs_owner_insert_pending" on public.turfs;
create policy "turfs_owner_insert_pending" on public.turfs for insert to authenticated
  with check (owner_id = auth.uid() and public.current_user_role() = 'owner' and status = 'pending');
drop policy if exists "turfs_admin_update" on public.turfs;
create policy "turfs_admin_update" on public.turfs for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "bookings_read_player_owner_admin" on public.bookings;
create policy "bookings_read_player_owner_admin" on public.bookings for select to authenticated
  using (
    player_id = auth.uid()
    or public.current_user_role() = 'admin'
    or exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  );
drop policy if exists "bookings_player_insert" on public.bookings;
create policy "bookings_player_insert" on public.bookings for insert to authenticated
  with check (
    player_id = auth.uid()
    and public.current_user_role() = 'player'
    and exists (select 1 from public.turfs t where t.id = turf_id and t.status = 'live')
  );
drop policy if exists "bookings_player_cancel" on public.bookings;
create policy "bookings_player_cancel" on public.bookings for update to authenticated
  using (player_id = auth.uid() and status in ('pending', 'confirmed'))
  with check (player_id = auth.uid() and status = 'cancelled');
drop policy if exists "bookings_owner_respond" on public.bookings;
create policy "bookings_owner_respond" on public.bookings for update to authenticated
  using (
    status = 'pending'
    and exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  )
  with check (
    status in ('confirmed', 'declined')
    and exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  );
drop policy if exists "bookings_admin_read" on public.bookings;
create policy "bookings_admin_read" on public.bookings for select to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists "blocked_slots_owner_read" on public.blocked_slots;
create policy "blocked_slots_owner_read" on public.blocked_slots for select to authenticated
  using (public.current_user_role() = 'admin' or exists (
    select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid()
  ));
drop policy if exists "blocked_slots_owner_insert" on public.blocked_slots;
create policy "blocked_slots_owner_insert" on public.blocked_slots for insert to authenticated
  with check (exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid()));
drop policy if exists "blocked_slots_owner_delete" on public.blocked_slots;
create policy "blocked_slots_owner_delete" on public.blocked_slots for delete to authenticated
  using (exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid()));

drop policy if exists "reviews_read_owner_player_admin" on public.reviews;
create policy "reviews_read_owner_player_admin" on public.reviews for select to authenticated
  using (
    player_id = auth.uid()
    or public.current_user_role() = 'admin'
    or exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  );
drop policy if exists "reviews_player_insert_for_booking" on public.reviews;
create policy "reviews_player_insert_for_booking" on public.reviews for insert to authenticated
  with check (
    player_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.player_id = auth.uid() and b.turf_id = turf_id
        and b.booking_date <= current_date and b.status in ('confirmed', 'completed')
    )
  );

drop policy if exists "disputes_read_raised_by_admin" on public.disputes;
create policy "disputes_read_raised_by_admin" on public.disputes for select to authenticated
  using (raised_by = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists "disputes_player_insert_for_booking" on public.disputes;
create policy "disputes_player_insert_for_booking" on public.disputes for insert to authenticated
  with check (
    raised_by = auth.uid()
    and exists (select 1 from public.bookings b where b.id = booking_id and b.player_id = auth.uid() and b.turf_id = turf_id)
  );
drop policy if exists "disputes_admin_update" on public.disputes;
create policy "disputes_admin_update" on public.disputes for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "payouts_owner_read" on public.payouts;
create policy "payouts_owner_read" on public.payouts for select to authenticated
  using (owner_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "notifications_update_own_read_flag" on public.notifications;
create policy "notifications_update_own_read_flag" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "matches_read_open" on public.matches;
create policy "matches_read_open" on public.matches for select to anon, authenticated
  using (status in ('open', 'full') or public.current_user_role() = 'admin');
drop policy if exists "match_participants_read_own" on public.match_participants;
create policy "match_participants_read_own" on public.match_participants for select to authenticated
  using (player_id = auth.uid());
drop policy if exists "match_participants_insert_own" on public.match_participants;
create policy "match_participants_insert_own" on public.match_participants for insert to authenticated
  with check (player_id = auth.uid() and public.current_user_role() = 'player');
drop policy if exists "match_participants_delete_own" on public.match_participants;
create policy "match_participants_delete_own" on public.match_participants for delete to authenticated
  using (player_id = auth.uid());

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

revoke all on function public.turf_slots(uuid, date) from public;
grant execute on function public.turf_slots(uuid, date) to anon, authenticated;

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
  new.status := 'pending';
  return new;
end;
$$;

drop trigger if exists bookings_prepare_before_insert on public.bookings;
create trigger bookings_prepare_before_insert
  before insert on public.bookings
  for each row execute function public.prepare_booking();

create or replace function public.validate_blocked_slot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  turf_row public.turfs%rowtype;
  slot_status text;
begin
  select * into turf_row from public.turfs where id = new.turf_id for update;
  if not found or new.blocked_date < current_date
    or new.start_time < turf_row.open_time or new.start_time >= turf_row.close_time
    or mod(extract(epoch from (new.start_time - turf_row.open_time))::integer, 3600) <> 0 then
    raise exception 'Invalid turf slot.';
  end if;

  select s.status into slot_status
  from public.turf_slots(new.turf_id, new.blocked_date) s
  where s.slot_time = new.start_time;
  if slot_status is distinct from 'available' then
    raise exception 'Only available slots can be blocked.';
  end if;
  return new;
end;
$$;

drop trigger if exists blocked_slots_validate_before_insert on public.blocked_slots;
create trigger blocked_slots_validate_before_insert
  before insert on public.blocked_slots
  for each row execute function public.validate_blocked_slot();

create or replace function public.prepare_dispute()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select b.price into new.amount
  from public.bookings b
  where b.id = new.booking_id and b.player_id = new.raised_by and b.turf_id = new.turf_id;
  if not found then
    raise exception 'Dispute must reference one of your bookings.';
  end if;
  new.status := 'open';
  new.resolved_at := null;
  return new;
end;
$$;

drop trigger if exists disputes_prepare_before_insert on public.disputes;
create trigger disputes_prepare_before_insert
  before insert on public.disputes
  for each row execute function public.prepare_dispute();

create or replace function public.refresh_turf_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_turf_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_turf_id := old.turf_id;
  else
    affected_turf_id := new.turf_id;
  end if;

  update public.turfs t
  set rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.turf_id = affected_turf_id), 0),
      review_count = (select count(*)::integer from public.reviews r where r.turf_id = affected_turf_id)
  where t.id = affected_turf_id;

  if tg_op = 'UPDATE' and old.turf_id <> new.turf_id then
    update public.turfs t
    set rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.turf_id = old.turf_id), 0),
        review_count = (select count(*)::integer from public.reviews r where r.turf_id = old.turf_id)
    where t.id = old.turf_id;
  end if;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_turf_stats on public.reviews;
create trigger reviews_refresh_turf_stats
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_turf_review_stats();

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
    where id = new.match_id and status = 'open' and participant_count < max_players;
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

drop trigger if exists match_participants_update_count on public.match_participants;
create trigger match_participants_update_count
  after insert or delete on public.match_participants
  for each row execute function public.update_match_participant_count();

create or replace view public.leaderboard as
  with points as (
    select b.player_id, sum(floor(b.price * 0.1))::bigint as points
    from public.bookings b
    where b.status in ('confirmed', 'completed')
    group by b.player_id
  )
  select p.player_id, profile.full_name, p.points,
    dense_rank() over (order by p.points desc, profile.full_name asc) as rank
  from points p
  join public.profiles profile on profile.id = p.player_id;

grant select on public.leaderboard to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when lower(coalesce(new.raw_user_meta_data->>'role', 'player')) = 'owner' then 'owner'
      else 'player'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- To provision the first admin, sign up as a player and run this in SQL Editor:
-- update public.profiles set role = 'admin' where email = 'you@example.com';

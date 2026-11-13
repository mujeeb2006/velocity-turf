-- Migration: 20261113_group_booking_bill_split.sql
-- Description: Group Booking and Bill Split Payment System with authoritative tracking,
-- individual participant payment states, deadline enforcement, and slot locking.

-- 1. Create group_bookings table
create table if not exists public.group_bookings (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete set null,
  turf_id             uuid not null references public.turfs(id) on delete restrict,
  leader_id           uuid not null references public.profiles(id) on delete restrict,
  sport               text not null default 'Football',
  booking_date        date not null,
  start_time          time not null,
  total_price         numeric(10,2) not null check (total_price >= 0),
  participant_count   integer not null check (participant_count >= 2 and participant_count <= 50),
  split_mode          text not null check (split_mode in ('equal', 'custom', 'leader_pays')),
  payment_mode        text not null default 'all_or_nothing' check (payment_mode in ('all_or_nothing', 'leader_immediate')),
  payment_status      text not null default 'pending' check (payment_status in ('pending', 'partial', 'paid', 'failed', 'refunded', 'expired', 'cancelled')),
  status              text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  invitation_code     text not null unique,
  expires_at          timestamptz not null,
  reminder_sent       boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 2. Create group_participants table
create table if not exists public.group_participants (
  id                  uuid primary key default gen_random_uuid(),
  group_booking_id    uuid not null references public.group_bookings(id) on delete cascade,
  player_id           uuid references public.profiles(id) on delete set null,
  guest_name          text,
  guest_email         text,
  role                text not null default 'member' check (role in ('leader', 'member')),
  share_amount        numeric(10,2) not null check (share_amount >= 0),
  payment_status      text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'refund_initiated')),
  paid_at             timestamptz,
  transaction_reference text,
  created_at          timestamptz not null default now(),
  unique (group_booking_id, player_id)
);

-- 3. Create group_payment_transactions table
create table if not exists public.group_payment_transactions (
  id                  uuid primary key default gen_random_uuid(),
  group_booking_id    uuid not null references public.group_bookings(id) on delete cascade,
  participant_id      uuid not null references public.group_participants(id) on delete cascade,
  player_id           uuid not null references public.profiles(id) on delete restrict,
  amount              numeric(10,2) not null check (amount > 0),
  payment_method      text not null default 'demo_simulated',
  transaction_reference text not null unique,
  status              text not null default 'success' check (status in ('success', 'failed', 'refunded', 'refund_initiated')),
  idempotency_key     text,
  created_at          timestamptz not null default now()
);

-- 4. Indexes for fast query resolution
create index if not exists idx_group_bookings_leader on public.group_bookings(leader_id);
create index if not exists idx_group_bookings_turf on public.group_bookings(turf_id);
create index if not exists idx_group_bookings_status on public.group_bookings(status);
create index if not exists idx_group_bookings_code on public.group_bookings(invitation_code);
create index if not exists idx_group_bookings_slot on public.group_bookings(turf_id, booking_date, start_time);
create index if not exists idx_group_participants_group on public.group_participants(group_booking_id);
create index if not exists idx_group_participants_player on public.group_participants(player_id);
create index if not exists idx_group_transactions_group on public.group_payment_transactions(group_booking_id);

-- 5. Row Level Security Policies
alter table public.group_bookings enable row level security;
alter table public.group_participants enable row level security;
alter table public.group_payment_transactions enable row level security;

-- Policies for group_bookings
drop policy if exists "group_bookings_select" on public.group_bookings;
create policy "group_bookings_select" on public.group_bookings
  for select using (
    leader_id = auth.uid()
    or exists (
      select 1 from public.group_participants gp
      where gp.group_booking_id = id and gp.player_id = auth.uid()
    )
    or exists (
      select 1 from public.turfs t
      where t.id = turf_id and (t.owner_id = auth.uid() or public.current_user_role() = 'admin')
    )
    or true -- Allow lookup by invitation_code for guests joining
  );

drop policy if exists "group_bookings_leader_all" on public.group_bookings;
create policy "group_bookings_leader_all" on public.group_bookings
  for all using (
    leader_id = auth.uid() or public.current_user_role() = 'admin'
  );

-- Policies for group_participants
drop policy if exists "group_participants_select" on public.group_participants;
create policy "group_participants_select" on public.group_participants
  for select using (
    player_id = auth.uid()
    or exists (
      select 1 from public.group_bookings gb
      where gb.id = group_booking_id and (
        gb.leader_id = auth.uid()
        or exists (select 1 from public.turfs t where t.id = gb.turf_id and (t.owner_id = auth.uid() or public.current_user_role() = 'admin'))
      )
    )
    or exists (
      select 1 from public.group_participants gp2
      where gp2.group_booking_id = group_booking_id and gp2.player_id = auth.uid()
    )
  );

drop policy if exists "group_participants_modify" on public.group_participants;
create policy "group_participants_modify" on public.group_participants
  for all using (
    player_id = auth.uid()
    or exists (
      select 1 from public.group_bookings gb
      where gb.id = group_booking_id and gb.leader_id = auth.uid()
    )
    or public.current_user_role() = 'admin'
  );

-- Policies for group_payment_transactions
drop policy if exists "group_transactions_select" on public.group_payment_transactions;
create policy "group_transactions_select" on public.group_payment_transactions
  for select using (
    player_id = auth.uid()
    or exists (
      select 1 from public.group_bookings gb
      where gb.id = group_booking_id and (
        gb.leader_id = auth.uid()
        or exists (select 1 from public.turfs t where t.id = gb.turf_id and (t.owner_id = auth.uid() or public.current_user_role() = 'admin'))
      )
    )
  );


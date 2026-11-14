-- ─────────────────────────────────────────────────────────────────────────────
-- Consolidated Migration: 20261114_fix_slot_availability_and_wallet.sql
-- Self-contained: creates Group Booking tables, Rewards & Referral tables,
-- ensures Booking columns, and updates slot availability without missing table dependencies.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. GROUP BOOKING TABLES (If not yet created)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  turf_id             UUID NOT NULL REFERENCES public.turfs(id) ON DELETE RESTRICT,
  leader_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sport               TEXT NOT NULL DEFAULT 'Football',
  booking_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  total_price         NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  participant_count   INTEGER NOT NULL CHECK (participant_count >= 2 AND participant_count <= 50),
  split_mode          TEXT NOT NULL CHECK (split_mode IN ('equal', 'custom', 'leader_pays')),
  payment_mode        TEXT NOT NULL DEFAULT 'all_or_nothing' CHECK (payment_mode IN ('all_or_nothing', 'leader_immediate')),
  payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'failed', 'refunded', 'expired', 'cancelled')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  invitation_code     TEXT NOT NULL UNIQUE,
  expires_at          TIMESTAMPTZ NOT NULL,
  reminder_sent       BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_participants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id    UUID NOT NULL REFERENCES public.group_bookings(id) ON DELETE CASCADE,
  player_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name          TEXT,
  guest_email         TEXT,
  role                TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  share_amount        NUMERIC(10,2) NOT NULL CHECK (share_amount >= 0),
  payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'refund_initiated')),
  paid_at             TIMESTAMPTZ,
  transaction_reference TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_booking_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.group_payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id    UUID NOT NULL REFERENCES public.group_bookings(id) ON DELETE CASCADE,
  participant_id      UUID NOT NULL REFERENCES public.group_participants(id) ON DELETE CASCADE,
  player_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method      TEXT NOT NULL DEFAULT 'demo_simulated',
  transaction_reference TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'refunded', 'refund_initiated')),
  idempotency_key     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_bookings_leader ON public.group_bookings(leader_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_turf ON public.group_bookings(turf_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_status ON public.group_bookings(status);
CREATE INDEX IF NOT EXISTS idx_group_bookings_code ON public.group_bookings(invitation_code);
CREATE INDEX IF NOT EXISTS idx_group_bookings_slot ON public.group_bookings(turf_id, booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_group_participants_group ON public.group_participants(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_participants_player ON public.group_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_group_transactions_group ON public.group_payment_transactions(group_booking_id);

ALTER TABLE public.group_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Group RLS Policies
DROP POLICY IF EXISTS "group_bookings_select" ON public.group_bookings;
CREATE POLICY "group_bookings_select" ON public.group_bookings
  FOR SELECT USING (
    leader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_participants gp
      WHERE gp.group_booking_id = id AND gp.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.turfs t
      WHERE t.id = turf_id AND (t.owner_id = auth.uid() OR public.current_user_role() = 'admin')
    )
    OR true
  );

DROP POLICY IF EXISTS "group_bookings_leader_all" ON public.group_bookings;
CREATE POLICY "group_bookings_leader_all" ON public.group_bookings
  FOR ALL USING (
    leader_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "group_participants_select" ON public.group_participants;
CREATE POLICY "group_participants_select" ON public.group_participants
  FOR SELECT USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_bookings gb
      WHERE gb.id = group_booking_id AND (
        gb.leader_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.turfs t WHERE t.id = gb.turf_id AND (t.owner_id = auth.uid() OR public.current_user_role() = 'admin'))
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.group_participants gp2
      WHERE gp2.group_booking_id = group_booking_id AND gp2.player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_participants_modify" ON public.group_participants;
CREATE POLICY "group_participants_modify" ON public.group_participants
  FOR ALL USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_bookings gb
      WHERE gb.id = group_booking_id AND gb.leader_id = auth.uid()
    )
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "group_transactions_select" ON public.group_payment_transactions;
CREATE POLICY "group_transactions_select" ON public.group_payment_transactions
  FOR SELECT USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_bookings gb
      WHERE gb.id = group_booking_id AND (
        gb.leader_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.turfs t WHERE t.id = gb.turf_id AND (t.owner_id = auth.uid() OR public.current_user_role() = 'admin'))
      )
    )
  );


-- 2. REWARD SETTINGS, WALLETS, TRANSACTIONS & REFERRALS TABLES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code 
  ON public.profiles(referral_code) 
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.reward_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  referrer_reward_points INTEGER NOT NULL DEFAULT 200 CHECK (referrer_reward_points >= 0),
  referred_welcome_points INTEGER NOT NULL DEFAULT 100 CHECK (referred_welcome_points >= 0),
  booking_reward_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (booking_reward_percentage >= 0 AND booking_reward_percentage <= 100),
  point_to_rupee_ratio NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (point_to_rupee_ratio > 0),
  min_redemption_points INTEGER NOT NULL DEFAULT 100 CHECK (min_redemption_points >= 0),
  max_discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (max_discount_percentage >= 0 AND max_discount_percentage <= 100),
  allow_full_slot_redemption BOOLEAN NOT NULL DEFAULT true,
  max_referrals_per_user INTEGER NOT NULL DEFAULT 3 CHECK (max_referrals_per_user >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.reward_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.reward_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_points INTEGER NOT NULL DEFAULT 0 CHECK (available_points >= 0),
  pending_points INTEGER NOT NULL DEFAULT 0 CHECK (pending_points >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_redeemed >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'welcome_bonus', 'booking_reward', 'redemption', 'refund', 'admin_adjustment')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  description TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_transactions_user 
  ON public.reward_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'completed', 'cancelled')),
  qualifying_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  referrer_points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (referrer_points_awarded >= 0),
  referred_points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (referred_points_awarded >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_no_self_referral CHECK (referrer_id <> referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer 
  ON public.referrals(referrer_id, status);

ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view reward settings" ON public.reward_settings;
CREATE POLICY "Anyone authenticated can view reward settings"
  ON public.reward_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can read own reward wallet" ON public.reward_wallets;
CREATE POLICY "Users can read own reward wallet"
  ON public.reward_wallets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read own reward transactions" ON public.reward_transactions;
CREATE POLICY "Users can read own reward transactions"
  ON public.reward_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (
    referrer_id = auth.uid() OR
    referred_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 3. ENSURE BLOCKED SLOTS & BOOKINGS EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id UUID NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (turf_id, blocked_date, start_time)
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0);

-- Release any existing stale pending holds (older than 15 minutes)
UPDATE public.bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND created_at < now() - interval '15 minutes';

UPDATE public.group_bookings
SET status = 'expired',
    payment_status = 'expired',
    updated_at = now()
WHERE status = 'pending'
  AND expires_at < now();


-- 4. UPDATE TURF_SLOTS FUNCTION (Zero missing dependencies)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.turf_slots(p_turf_id UUID, p_date DATE)
RETURNS TABLE (slot_time TIME, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH visible_turf AS (
    SELECT t.id, t.open_time, t.close_time
    FROM public.turfs t
    WHERE t.id = p_turf_id
      AND t.archived_at IS NULL
      AND (
        t.status = 'live'
        OR t.owner_id = auth.uid()
        OR public.current_user_role() = 'admin'
      )
  ), slots AS (
    SELECT v.id AS turf_id,
      (v.open_time + generated.hour_offset * interval '1 hour')::TIME AS slot_time
    FROM visible_turf v
    CROSS JOIN LATERAL generate_series(
      0,
      (EXTRACT(epoch FROM (v.close_time - v.open_time)) / 3600)::INTEGER - 1
    ) AS generated(hour_offset)
  )
  SELECT s.slot_time,
    CASE
      WHEN blocked.id IS NOT NULL THEN 'blocked'
      WHEN booking.status = 'pending' THEN 'locked'
      WHEN booking.id IS NOT NULL THEN 'booked'
      WHEN match.id IS NOT NULL THEN 'match'
      ELSE 'available'
    END AS status
  FROM slots s
  LEFT JOIN public.blocked_slots blocked
    ON blocked.turf_id = s.turf_id
    AND blocked.blocked_date = p_date
    AND blocked.start_time = s.slot_time
  LEFT JOIN public.bookings booking
    ON booking.turf_id = s.turf_id
    AND booking.booking_date = p_date
    AND booking.start_time = s.slot_time
    AND (
      booking.status IN ('confirmed', 'completed')
      OR (
        booking.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM public.group_bookings gb
          WHERE gb.booking_id = booking.id
            AND (gb.status IN ('expired', 'cancelled') OR gb.expires_at < now())
        )
        AND booking.created_at >= now() - interval '15 minutes'
      )
    )
  LEFT JOIN public.matches match
    ON match.turf_id = s.turf_id
    AND match.match_date = p_date
    AND match.start_time = s.slot_time
    AND match.status IN ('open', 'full')
  ORDER BY s.slot_time;
$$;


-- 5. UPDATE PREPARE_BOOKING TRIGGER (Allows pending holds & locks turf atomically)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prepare_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  turf_row public.turfs%rowtype;
  slot_status text;
  occupied_count integer;
  total_count integer;
BEGIN
  SELECT * INTO turf_row FROM public.turfs WHERE id = new.turf_id FOR UPDATE;
  IF NOT FOUND OR turf_row.status <> 'live' OR turf_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'This turf is not available for booking.';
  END IF;
  IF new.booking_date < current_date THEN
    RAISE EXCEPTION 'Bookings cannot be made for a past date.';
  END IF;
  IF NOT (new.sport = ANY(turf_row.sports)) THEN
    RAISE EXCEPTION 'This sport is not offered at this turf.';
  END IF;

  SELECT s.status INTO slot_status
  FROM public.turf_slots(new.turf_id, new.booking_date) s
  WHERE s.slot_time = new.start_time;
  IF slot_status IS DISTINCT FROM 'available' THEN
    RAISE EXCEPTION 'This slot is not available.';
  END IF;

  SELECT count(*) FILTER (WHERE s.status <> 'available'), count(*)
    INTO occupied_count, total_count
  FROM public.turf_slots(new.turf_id, new.booking_date) s;

  IF new.price IS NULL OR new.price <= 0 THEN
    new.price := CASE
      WHEN total_count > 0 AND occupied_count::numeric / total_count > 0.7 THEN turf_row.peak_price
      ELSE turf_row.base_price
    END;
  END IF;

  -- Preserve pending status for group bookings; default normal bookings to confirmed
  IF new.status IS NULL OR new.status = '' THEN
    new.status := 'confirmed';
  END IF;

  RETURN new;
END;
$$;


-- 6. PREVENT CONCURRENT DOUBLE BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_turf_slot 
  ON public.bookings (turf_id, booking_date, start_time) 
  WHERE status IN ('pending', 'confirmed');

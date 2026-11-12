-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Migration: 20261112_unified_referrals_and_rewards.sql
-- Unified Referral & Reward Points System
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. PROFILES EXTENSIONS (Unique Referral Codes)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code 
  ON public.profiles(referral_code) 
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by 
  ON public.profiles(referred_by) 
  WHERE referred_by IS NOT NULL;

-- Function to generate an 8-character unique referral code: 'VT' + 6 alphanumeric chars
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  done BOOLEAN := false;
  i INTEGER;
BEGIN
  WHILE NOT done LOOP
    result := 'VT';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = result) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-assign referral_code to new profiles if not already present
CREATE OR REPLACE FUNCTION public.assign_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_unique_referral_code();
  ELSE
    NEW.referral_code := upper(trim(NEW.referral_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_assign_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_profile_referral_code();

-- Backfill existing profiles that have no referral code
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL OR referral_code = '' LOOP
    UPDATE public.profiles 
    SET referral_code = public.generate_unique_referral_code()
    WHERE id = r.id;
  END LOOP;
END $$;


-- 2. REWARD SETTINGS (Configurable via Admin)
-- ─────────────────────────────────────────────────────────────────────────────
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


-- 3. REWARD WALLETS (One central wallet per player)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reward_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_points INTEGER NOT NULL DEFAULT 0 CHECK (available_points >= 0),
  pending_points INTEGER NOT NULL DEFAULT 0 CHECK (pending_points >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_redeemed >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill wallets for existing profiles
INSERT INTO public.reward_wallets (user_id, available_points, lifetime_earned, updated_at)
SELECT id, 0, 0, now()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- 4. REWARD TRANSACTIONS (Auditable Ledger)
-- ─────────────────────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_reward_transactions_type 
  ON public.reward_transactions(type);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_ref 
  ON public.reward_transactions(reference_id);


-- 5. REFERRALS (Tracking & 3-referral cap enforcement)
-- ─────────────────────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_referrals_referred 
  ON public.referrals(referred_id);


-- 6. BOOKINGS EXTENSIONS (Redemption & Discount tracking)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0);


-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- reward_settings: readable by authenticated, writeable only by admin
DROP POLICY IF EXISTS "Anyone authenticated can view reward settings" ON public.reward_settings;
CREATE POLICY "Anyone authenticated can view reward settings"
  ON public.reward_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update reward settings" ON public.reward_settings;
CREATE POLICY "Admins can update reward settings"
  ON public.reward_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- reward_wallets: user can read own wallet, admins can read all
DROP POLICY IF EXISTS "Users can read own reward wallet" ON public.reward_wallets;
CREATE POLICY "Users can read own reward wallet"
  ON public.reward_wallets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- reward_transactions: user can read own transactions, admins can read all
DROP POLICY IF EXISTS "Users can read own reward transactions" ON public.reward_transactions;
CREATE POLICY "Users can read own reward transactions"
  ON public.reward_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- referrals: user can read if referrer or referred, admins can read all
DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (
    referrer_id = auth.uid() OR
    referred_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261114_owner_dashboard_pricing_and_walkin.sql
-- Velocity Turf – Advanced Pricing Rules, Walk-in Bookings & Dashboard Analytics
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ADD PRICING RULES TO TURFS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'turfs' AND column_name = 'pricing_rules'
  ) THEN
    ALTER TABLE public.turfs ADD COLUMN pricing_rules JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;


-- 2. ADD WALK-IN & PAYMENT TRACKING COLUMNS TO BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_source'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN booking_source TEXT NOT NULL DEFAULT 'online' CHECK (booking_source IN ('online', 'walk_in', 'admin', 'corporate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN customer_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN customer_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'online' CHECK (payment_method IN ('online', 'cash', 'upi', 'card', 'split', 'pass', 'unpaid', 'demo_simulated'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded', 'failed'));
    
    -- Ensure existing non-confirmed bookings are NOT incorrectly backfilled as 'paid'
    UPDATE public.bookings
    SET payment_status = CASE
      WHEN status = 'pending' THEN 'pending'
      WHEN status IN ('cancelled', 'declined') THEN 'refunded'
      ELSE 'paid'
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings (turf_id, booking_source);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings (turf_id, payment_status);

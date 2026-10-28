-- 20261030_game_features.sql
-- -----------------------------------------------------------------
-- Velocity Turf – Games & Flexible Payments Feature
-- Migration adds:
--   * public.game_invites      – private invitation tokens
--   * public.turf_slot_durations – allowed slot durations per turf
--   * matches.min_advance_payment – flat amount required in advance
--   * game_payments.is_advance – flag for advance‑only payments
--   * related indexes and RLS policies
-- -----------------------------------------------------------------

-- 1️⃣  game_invites table (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'game_invites' AND relnamespace = 'public'::regnamespace) THEN
    CREATE TABLE public.game_invites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      max_uses integer NOT NULL CHECK (max_uses > 0),
      uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
      revoked boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS game_invites_token_idx ON public.game_invites (token) WHERE revoked = false AND expires_at > now();
  END IF;
END $$;

-- 2️⃣  turf_slot_durations table (owner‑configured allowed durations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'turf_slot_durations' AND relnamespace = 'public'::regnamespace) THEN
    CREATE TABLE public.turf_slot_durations (
      turf_id uuid PRIMARY KEY REFERENCES public.turfs(id) ON DELETE CASCADE,
      allowed_durations integer[] NOT NULL DEFAULT '{30,60,90}' -- minutes, default list
    );
    CREATE INDEX IF NOT EXISTS turf_slot_durations_idx ON public.turf_slot_durations (turf_id);
  END IF;
END $$;

-- 3️⃣  Extend matches with min_advance_payment (flat amount per match)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='min_advance_payment') THEN
    ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS min_advance_payment numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_advance_payment >= 0);
  END IF;
END $$;

-- 4️⃣  Extend game_payments with is_advance flag
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='game_payments' AND column_name='is_advance') THEN
    ALTER TABLE public.game_payments ADD COLUMN IF NOT EXISTS is_advance boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 5️⃣  Enable Row Level Security for new tables
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turf_slot_durations ENABLE ROW LEVEL SECURITY;

-- 6️⃣  Revoke all default privileges and grant minimal needed rights
REVOKE ALL ON public.game_invites FROM anon, authenticated;
REVOKE ALL ON public.turf_slot_durations FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.turf_slot_durations TO authenticated;
GRANT SELECT ON public.game_invites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_invites TO authenticated;

-- 7️⃣  RLS policies for game_invites (owners & admins only)
DROP POLICY IF EXISTS game_invites_owner_all ON public.game_invites;
CREATE POLICY game_invites_owner_all ON public.game_invites FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.creator_id = auth.uid() OR public.current_user_role() = 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.creator_id = auth.uid() OR public.current_user_role() = 'admin'))
  );

-- 8️⃣  RLS policies for turf_slot_durations (owners & admins)
DROP POLICY IF EXISTS turf_slot_durations_owner ON public.turf_slot_durations;
CREATE POLICY turf_slot_durations_owner ON public.turf_slot_durations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.turfs t WHERE t.id = turf_id AND (t.owner_id = auth.uid() OR public.current_user_role() = 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.turfs t WHERE t.id = turf_id AND (t.owner_id = auth.uid() OR public.current_user_role() = 'admin'))
  );

-- 9️⃣  Grant select on new columns to authenticated
GRANT SELECT (min_advance_payment) ON public.matches TO authenticated;
GRANT SELECT (is_advance) ON public.game_payments TO authenticated;

-- Migration complete – idempotent and reversible.

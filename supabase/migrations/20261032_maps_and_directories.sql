-- 20261032_maps_and_directories.sql
-- -----------------------------------------------------------------
-- Velocity Turf – Extensions for Maps, Trainers, Coaching Centres, and
-- Sports‑Academy Collaboration
-- -----------------------------------------------------------------
-- 1. Turf coordinates (if not already present)
-- -----------------------------------------------------------------
ALTER TABLE public.turfs
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for fast geospatial queries (simple B‑tree on lat/long)
CREATE INDEX IF NOT EXISTS idx_turfs_location ON public.turfs (latitude, longitude);

-- -----------------------------------------------------------------
-- 2. Trainer directory
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  bio           TEXT,
  sports        TEXT[] NOT NULL,               -- e.g. '{football,badminton}'
  experience_yrs INTEGER DEFAULT 0,
  qualifications TEXT[],
  availability   JSONB,                       -- free‑form schedule structure
  price_per_hour NUMERIC(10,2) DEFAULT 0,
  location_lat  DOUBLE PRECISION,
  location_lng  DOUBLE PRECISION,
  approved      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS – only the trainer themselves and admins can read/write their own record
CREATE POLICY trainers_select ON public.trainers
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');
CREATE POLICY trainers_insert ON public.trainers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY trainers_update ON public.trainers
  FOR UPDATE USING (user_id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() = 'admin');
CREATE POLICY trainers_delete ON public.trainers
  FOR DELETE USING (user_id = auth.uid() OR public.current_user_role() = 'admin');
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 3. Coaching centre directory
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_centres (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sports        TEXT[] NOT NULL,
  address       TEXT NOT NULL,
  city          TEXT,
  age_groups    TEXT[],                     -- e.g. '{U12,U15,Open}'
  schedule      JSONB,                      -- structured weekly schedule
  fee_structure JSONB,                      -- e.g. {"per_hour":50, "monthly":300}
  facilities    TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  approved      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY centres_select ON public.coaching_centres
  FOR SELECT USING (approved = TRUE OR public.current_user_role() = 'admin' OR owner_id = auth.uid());
CREATE POLICY centres_insert ON public.coaching_centres
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY centres_update ON public.coaching_centres
  FOR UPDATE USING (owner_id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (owner_id = auth.uid() OR public.current_user_role() = 'admin');
CREATE POLICY centres_delete ON public.coaching_centres
  FOR DELETE USING (owner_id = auth.uid() OR public.current_user_role() = 'admin');
ALTER TABLE public.coaching_centres ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 4. Sports‑Academy collaboration applications
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  sports           TEXT[] NOT NULL,
  location         TEXT NOT NULL,
  contact_name     TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  contact_phone    TEXT,
  proposal_text    TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',   -- pending / approved / rejected
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Only admins can read/write applications; the applicant can insert only via a function
CREATE POLICY academy_select ON public.academy_applications
  FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY academy_update ON public.academy_applications
  FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY academy_delete ON public.academy_applications
  FOR DELETE USING (public.current_user_role() = 'admin');
ALTER TABLE public.academy_applications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 5. Secure insert function for academy applications (public callable)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_academy_application(
    p_name          TEXT,
    p_sports        TEXT[],
    p_location      TEXT,
    p_contact_name  TEXT,
    p_contact_email TEXT,
    p_contact_phone TEXT,
    p_proposal_text TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.academy_applications (
        name, sports, location, contact_name, contact_email, contact_phone, proposal_text
    ) VALUES (
        p_name, p_sports, p_location, p_contact_name, p_contact_email, p_contact_phone, p_proposal_text
    ) RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_academy_application(
    TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------
-- End of migration
-- -----------------------------------------------------------------

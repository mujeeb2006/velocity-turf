-- 20261035_teams_tournaments_packages.sql
-- -----------------------------------------------------------------
-- Velocity Turf – Team Management, Tournaments & Sports Packages
-- -----------------------------------------------------------------

-- 1. TEAMS & ROSTERS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 60),
  logo_url      TEXT NOT NULL DEFAULT '',
  sport         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_captain ON public.teams (captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_sport ON public.teams (sport);

CREATE TABLE IF NOT EXISTS public.team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'pending')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_member UNIQUE (team_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player ON public.team_members (player_id);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  max_uses      INTEGER NOT NULL DEFAULT 10 CHECK (max_uses > 0),
  uses          INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  revoked       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites (token)
  WHERE revoked = false;

-- Add team_id & package_redemption_id to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'team_id') THEN
    ALTER TABLE public.bookings ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_bookings_team_id ON public.bookings (team_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'package_redemption_id') THEN
    ALTER TABLE public.bookings ADD COLUMN package_redemption_id UUID;
  END IF;
END $$;


-- 2. TOURNAMENTS & LEAGUES
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  turf_id                UUID NOT NULL REFERENCES public.turfs(id) ON DELETE RESTRICT,
  title                  TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 100),
  description            TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  sport                  TEXT NOT NULL,
  format                 TEXT NOT NULL DEFAULT 'knockout' CHECK (format IN ('knockout', 'round_robin', 'league')),
  team_size              INTEGER NOT NULL DEFAULT 5 CHECK (team_size BETWEEN 1 AND 30),
  max_teams              INTEGER NOT NULL DEFAULT 8 CHECK (max_teams BETWEEN 2 AND 64),
  entry_fee              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  platform_fee           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  prize_pool             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
  prize_description      TEXT NOT NULL DEFAULT '' CHECK (char_length(prize_description) <= 500),
  rules                  TEXT NOT NULL DEFAULT '' CHECK (char_length(rules) <= 3000),
  registration_deadline  TIMESTAMPTZ NOT NULL,
  start_date             DATE NOT NULL,
  end_date               DATE NOT NULL,
  turf_approval_status   TEXT NOT NULL DEFAULT 'approved' CHECK (turf_approval_status IN ('pending', 'approved', 'rejected')),
  admin_approval_status  TEXT NOT NULL DEFAULT 'approved' CHECK (admin_approval_status IN ('pending', 'approved', 'rejected')),
  status                 TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'pending_approval', 'open', 'registration_closed', 'ongoing', 'completed', 'cancelled')),
  rejection_reason       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tournaments_dates CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_turf ON public.tournaments (turf_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON public.tournaments (organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments (status);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id         UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id               UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  registered_by         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  team_name             TEXT NOT NULL CHECK (char_length(trim(team_name)) BETWEEN 2 AND 60),
  payment_status        TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  amount_paid           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  transaction_reference TEXT,
  approval_status       TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tournament_registration UNIQUE (tournament_id, registered_by)
);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON public.tournament_registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team ON public.tournament_registrations (team_id);

CREATE TABLE IF NOT EXISTS public.tournament_fixtures (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round                  INTEGER NOT NULL DEFAULT 1 CHECK (round >= 1),
  match_number           INTEGER NOT NULL DEFAULT 1 CHECK (match_number >= 1),
  home_registration_id   UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  away_registration_id   UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  home_score             INTEGER DEFAULT NULL CHECK (home_score IS NULL OR home_score >= 0),
  away_score             INTEGER DEFAULT NULL CHECK (away_score IS NULL OR away_score >= 0),
  winner_registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  match_date             DATE,
  start_time             TIME,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_fixtures_tournament ON public.tournament_fixtures (tournament_id, round);

CREATE TABLE IF NOT EXISTS public.tournament_payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id        UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  turf_id                UUID NOT NULL REFERENCES public.turfs(id) ON DELETE RESTRICT,
  amount                 NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  platform_fee           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount             NUMERIC(10,2) NOT NULL CHECK (net_amount >= 0),
  status                 TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payment_method         TEXT NOT NULL DEFAULT 'demo_simulated',
  transaction_reference  TEXT NOT NULL UNIQUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_payments_tournament ON public.tournament_payments (tournament_id);


-- 3. SUBSCRIPTION PASSES & SPORTS PACKAGES
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packages (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  description            TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  price                  NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  total_sessions         INTEGER NOT NULL CHECK (total_sessions > 0),
  validity_days          INTEGER NOT NULL CHECK (validity_days > 0),
  eligible_sports        TEXT[] NOT NULL DEFAULT '{}',
  eligible_turfs         UUID[] NOT NULL DEFAULT '{}',
  max_sessions_per_day   INTEGER DEFAULT NULL CHECK (max_sessions_per_day IS NULL OR max_sessions_per_day > 0),
  restrictions           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_active ON public.packages (is_active);

CREATE TABLE IF NOT EXISTS public.user_packages (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id             UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  total_sessions         INTEGER NOT NULL CHECK (total_sessions > 0),
  remaining_sessions     INTEGER NOT NULL CHECK (remaining_sessions >= 0 AND remaining_sessions <= total_sessions),
  price_paid             NUMERIC(10,2) NOT NULL CHECK (price_paid >= 0),
  transaction_reference  TEXT NOT NULL,
  payment_status         TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'refunded', 'failed')),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted', 'cancelled')),
  purchased_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at             TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_packages_user_status ON public.user_packages (user_id, status, expires_at);

CREATE TABLE IF NOT EXISTS public.package_redemptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_package_id        UUID NOT NULL REFERENCES public.user_packages(id) ON DELETE CASCADE,
  booking_id             UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action                 TEXT NOT NULL CHECK (action IN ('redeem', 'refund', 'expire')),
  sessions_delta         INTEGER NOT NULL,
  remaining_after        INTEGER NOT NULL CHECK (remaining_after >= 0),
  notes                  TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_redemptions_user_package ON public.package_redemptions (user_package_id);
CREATE INDEX IF NOT EXISTS idx_package_redemptions_booking ON public.package_redemptions (booking_id);

-- Add default seed packages if none exist
INSERT INTO public.packages (name, description, price, total_sessions, validity_days, eligible_sports, restrictions, is_active)
SELECT '5-Session Starter Pass', 'Ideal for casual weekly games across any sport.', 1800.00, 5, 30, '{}', '{"off_peak_only": false}', true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE name = '5-Session Starter Pass');

INSERT INTO public.packages (name, description, price, total_sessions, validity_days, eligible_sports, restrictions, is_active)
SELECT '10-Session Pro Pack', 'Great savings for dedicated regular players and training.', 3200.00, 10, 60, '{}', '{"off_peak_only": false}', true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE name = '10-Session Pro Pack');

INSERT INTO public.packages (name, description, price, total_sessions, validity_days, eligible_sports, restrictions, is_active)
SELECT 'Monthly Unlimited Pass', 'Play up to 25 sessions in a calendar month.', 6500.00, 25, 30, '{}', '{"max_sessions_per_day": 1}', true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE name = 'Monthly Unlimited Pass');


-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;

-- Teams RLS
DROP POLICY IF EXISTS teams_select_all ON public.teams;
CREATE POLICY teams_select_all ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS teams_insert ON public.teams;
CREATE POLICY teams_insert ON public.teams FOR INSERT WITH CHECK (captain_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS teams_update ON public.teams;
CREATE POLICY teams_update ON public.teams FOR UPDATE USING (captain_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS teams_delete ON public.teams;
CREATE POLICY teams_delete ON public.teams FOR DELETE USING (captain_id = auth.uid() OR public.current_user_role() = 'admin');

-- Team members RLS
DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS team_members_insert ON public.team_members;
CREATE POLICY team_members_insert ON public.team_members FOR INSERT WITH CHECK (
  player_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.captain_id = auth.uid()) OR
  public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS team_members_delete ON public.team_members;
CREATE POLICY team_members_delete ON public.team_members FOR DELETE USING (
  player_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.captain_id = auth.uid()) OR
  public.current_user_role() = 'admin'
);

-- Team invites RLS
DROP POLICY IF EXISTS team_invites_select ON public.team_invites;
CREATE POLICY team_invites_select ON public.team_invites FOR SELECT USING (
  revoked = false AND expires_at > now() OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.captain_id = auth.uid()) OR
  public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS team_invites_all ON public.team_invites;
CREATE POLICY team_invites_all ON public.team_invites FOR ALL USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.captain_id = auth.uid()) OR
  public.current_user_role() = 'admin'
);

-- Tournaments RLS
DROP POLICY IF EXISTS tournaments_select ON public.tournaments;
CREATE POLICY tournaments_select ON public.tournaments FOR SELECT USING (
  status != 'draft' OR
  organizer_id = auth.uid() OR
  public.current_user_role() = 'admin' OR
  EXISTS (SELECT 1 FROM public.turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
);

DROP POLICY IF EXISTS tournaments_manage ON public.tournaments;
CREATE POLICY tournaments_manage ON public.tournaments FOR ALL USING (
  organizer_id = auth.uid() OR
  public.current_user_role() = 'admin' OR
  EXISTS (SELECT 1 FROM public.turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid())
);

-- Tournament registrations RLS
DROP POLICY IF EXISTS tournament_regs_select ON public.tournament_registrations;
CREATE POLICY tournament_regs_select ON public.tournament_registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS tournament_regs_insert ON public.tournament_registrations;
CREATE POLICY tournament_regs_insert ON public.tournament_registrations FOR INSERT WITH CHECK (
  registered_by = auth.uid() OR public.current_user_role() = 'admin'
);

-- Tournament fixtures RLS
DROP POLICY IF EXISTS tournament_fixtures_select ON public.tournament_fixtures;
CREATE POLICY tournament_fixtures_select ON public.tournament_fixtures FOR SELECT USING (true);

DROP POLICY IF EXISTS tournament_fixtures_manage ON public.tournament_fixtures;
CREATE POLICY tournament_fixtures_manage ON public.tournament_fixtures FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND (t.organizer_id = auth.uid() OR public.current_user_role() = 'admin'))
);

-- Packages RLS
DROP POLICY IF EXISTS packages_select ON public.packages;
CREATE POLICY packages_select ON public.packages FOR SELECT USING (
  is_active = true OR public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS packages_admin_all ON public.packages;
CREATE POLICY packages_admin_all ON public.packages FOR ALL USING (
  public.current_user_role() = 'admin'
);

-- User packages RLS
DROP POLICY IF EXISTS user_packages_select ON public.user_packages;
CREATE POLICY user_packages_select ON public.user_packages FOR SELECT USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS user_packages_all ON public.user_packages;
CREATE POLICY user_packages_all ON public.user_packages FOR ALL USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);

-- Package redemptions RLS
DROP POLICY IF EXISTS package_redemptions_select ON public.package_redemptions;
CREATE POLICY package_redemptions_select ON public.package_redemptions FOR SELECT USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_fixtures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_redemptions TO authenticated;

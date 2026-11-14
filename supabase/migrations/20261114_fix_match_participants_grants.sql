-- 20261114_fix_match_participants_grants.sql
-- Fix HTTP 400 permission denied error for authenticated users on match_participants
-- Grant full select on match_participants so client-side headcount and joined matches queries work reliably.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'match_participants') THEN
    GRANT SELECT ON public.match_participants TO authenticated;
    GRANT SELECT ON public.match_participants TO anon;
  END IF;
END $$;

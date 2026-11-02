-- Migration: Fix Turf Admin Status Trigger and Service Role Support
-- Allows both authenticated admins and service_role backend operations to approve/reject turfs.

-- 1. Ensure current_user_role() recognizes service_role as admin
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    CASE
      WHEN NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN 'admin'
      WHEN current_user = 'service_role' THEN 'admin'
      ELSE NULL
    END
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

-- 2. Ensure is_admin() recognizes service_role as admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    CASE
      WHEN NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN true
      WHEN current_user = 'service_role' THEN true
      ELSE false
    END
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 3. Update or replace turf status trigger function so service_role is never blocked
CREATE OR REPLACE FUNCTION public.check_turf_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      public.current_user_role() = 'admin'
      OR NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      OR current_user = 'service_role'
    ) THEN
      RAISE EXCEPTION 'Only an admin can change a turf''s status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure turfs RLS update policy allows authenticated admin and service_role
DROP POLICY IF EXISTS "turfs_admin_update" ON public.turfs;
CREATE POLICY "turfs_admin_update" ON public.turfs FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


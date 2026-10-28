-- 20261036_maintenance_staff_notifications.sql
-- -----------------------------------------------------------------
-- Velocity Turf – Facility Maintenance, Staff Permissions & Smart Notifications
-- -----------------------------------------------------------------

-- 1. VENUE STAFF & PERMISSIONS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_staff (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turf_id           UUID REFERENCES public.turfs(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL DEFAULT '',
  role              TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('venue_manager', 'receptionist', 'maintenance_staff', 'custom')),
  permissions       TEXT[] NOT NULL DEFAULT '{}' CHECK (permissions <@ ARRAY['view_schedule', 'checkin_players', 'manage_maintenance', 'view_bookings', 'manage_bookings', 'manage_staff']::TEXT[]),
  status            TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked', 'expired')),
  invite_token      TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_staff_owner ON public.venue_staff (owner_id);
CREATE INDEX IF NOT EXISTS idx_venue_staff_turf ON public.venue_staff (turf_id);
CREATE INDEX IF NOT EXISTS idx_venue_staff_user ON public.venue_staff (user_id);
CREATE INDEX IF NOT EXISTS idx_venue_staff_email ON public.venue_staff (lower(email));
CREATE INDEX IF NOT EXISTS idx_venue_staff_token ON public.venue_staff (invite_token) WHERE invite_token IS NOT NULL;

-- 2. STAFF AUDIT LOG
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id     UUID REFERENCES public.turfs(id) ON DELETE SET NULL,
  actor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role  TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (char_length(action) <= 100),
  target_type TEXT,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_audit_turf ON public.staff_audit_log (turf_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_audit_actor ON public.staff_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_audit_action ON public.staff_audit_log (action);

-- 3. MAINTENANCE TASKS & WINDOWS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id       UUID NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 150),
  description   TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  facility_type TEXT NOT NULL CHECK (facility_type IN ('cleaning', 'turf_repair', 'lighting', 'equipment', 'nets', 'washrooms', 'other')),
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  assigned_to   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date      DATE,
  notes         TEXT NOT NULL DEFAULT '',
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  court_name    TEXT NOT NULL DEFAULT 'All Courts',
  start_date    DATE,
  end_date      DATE,
  start_time    TIME,
  end_time      TIME,
  blocks_slots  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_tasks_turf ON public.maintenance_tasks (turf_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_tasks_assigned ON public.maintenance_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_maint_tasks_priority ON public.maintenance_tasks (priority);

CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id       UUID NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  task_id       UUID REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
  court_name    TEXT NOT NULL DEFAULT 'All Courts',
  window_date   DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  reason        TEXT NOT NULL DEFAULT 'Scheduled Maintenance',
  status        TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_windows_lookup ON public.maintenance_windows (turf_id, window_date, status);

-- 4. BOOKINGS ATTENDANCE & CHECK-IN
-- -----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'checked_in_at') THEN
    ALTER TABLE public.bookings ADD COLUMN checked_in_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'attendance_status') THEN
    ALTER TABLE public.bookings ADD COLUMN attendance_status TEXT NOT NULL DEFAULT 'not_arrived' CHECK (attendance_status IN ('not_arrived', 'checked_in', 'no_show'));
  END IF;
END $$;

-- 5. NOTIFICATIONS EXTENSIONS & NOTIFICATION PREFERENCES
-- -----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE public.notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_type') THEN
    ALTER TABLE public.notifications ADD COLUMN event_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link') THEN
    ALTER TABLE public.notifications ADD COLUMN link TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'dedup_key') THEN
    ALTER TABLE public.notifications ADD COLUMN dedup_key TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'delivery_status') THEN
    ALTER TABLE public.notifications ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'channel') THEN
    ALTER TABLE public.notifications ADD COLUMN channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'whatsapp'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
  ON public.notifications (dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app          BOOLEAN NOT NULL DEFAULT true,
  email           BOOLEAN NOT NULL DEFAULT true,
  whatsapp        BOOLEAN NOT NULL DEFAULT false,
  reminders_24h   BOOLEAN NOT NULL DEFAULT true,
  reminders_2h    BOOLEAN NOT NULL DEFAULT true,
  promotional     BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. SECURITY DEFINER HELPER FUNCTIONS
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_turf_owner_or_staff(p_turf_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turfs t
    WHERE t.id = p_turf_id
      AND (
        t.owner_id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.venue_staff s
          WHERE (s.turf_id = t.id OR s.turf_id IS NULL)
            AND s.owner_id = t.owner_id
            AND s.user_id = auth.uid()
            AND s.status = 'active'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_staff_permission(p_turf_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turfs t
    WHERE t.id = p_turf_id
      AND (
        t.owner_id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.venue_staff s
          WHERE (s.turf_id = t.id OR s.turf_id IS NULL)
            AND s.owner_id = t.owner_id
            AND s.user_id = auth.uid()
            AND s.status = 'active'
            AND (p_permission = ANY(s.permissions) OR s.role = 'venue_manager')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_turf_owner_or_staff(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_turf_owner_or_staff(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.has_staff_permission(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(UUID, TEXT) TO authenticated;

-- 7. UPDATE TURF_SLOTS TO INCLUDE MAINTENANCE WINDOWS
-- -----------------------------------------------------------------
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
        OR EXISTS (
          SELECT 1 FROM public.venue_staff s
          WHERE (s.turf_id = t.id OR s.turf_id IS NULL)
            AND s.owner_id = t.owner_id
            AND s.user_id = auth.uid()
            AND s.status = 'active'
        )
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
      WHEN mw.id IS NOT NULL THEN 'maintenance'
      WHEN blocked.id IS NOT NULL THEN 'blocked'
      WHEN booking.status = 'pending' THEN 'locked'
      WHEN booking.id IS NOT NULL THEN 'booked'
      WHEN match.id IS NOT NULL THEN 'match'
      ELSE 'available'
    END AS status
  FROM slots s
  LEFT JOIN public.maintenance_windows mw
    ON mw.turf_id = s.turf_id
    AND mw.window_date = p_date
    AND mw.status IN ('scheduled', 'in_progress')
    AND s.slot_time >= mw.start_time
    AND s.slot_time < mw.end_time
  LEFT JOIN public.blocked_slots blocked
    ON blocked.turf_id = s.turf_id
    AND blocked.blocked_date = p_date
    AND blocked.start_time = s.slot_time
  LEFT JOIN public.bookings booking
    ON booking.turf_id = s.turf_id
    AND booking.booking_date = p_date
    AND booking.start_time = s.slot_time
    AND booking.status IN ('pending', 'confirmed', 'completed')
  LEFT JOIN public.matches match
    ON match.turf_id = s.turf_id
    AND match.match_date = p_date
    AND match.start_time = s.slot_time
    AND match.approval_status = 'approved'
    AND match.status IN ('open', 'full')
  ORDER BY s.slot_time;
$$;

-- 8. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------
ALTER TABLE public.venue_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.venue_staff TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_staff TO authenticated;

GRANT SELECT ON public.staff_audit_log TO authenticated;
GRANT INSERT ON public.staff_audit_log TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_windows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- venue_staff policies:
-- Owners can read staff they invited; staff can read their own record; admins can read all
DROP POLICY IF EXISTS "venue_staff_select" ON public.venue_staff;
CREATE POLICY "venue_staff_select" ON public.venue_staff
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- Only owners and admins can manage staff (staff CANNOT invite or edit staff)
DROP POLICY IF EXISTS "venue_staff_modify" ON public.venue_staff;
CREATE POLICY "venue_staff_modify" ON public.venue_staff
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- staff_audit_log policies:
DROP POLICY IF EXISTS "staff_audit_log_select" ON public.staff_audit_log;
CREATE POLICY "staff_audit_log_select" ON public.staff_audit_log
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR (turf_id IS NOT NULL AND public.is_turf_owner_or_staff(turf_id))
  );

DROP POLICY IF EXISTS "staff_audit_log_insert" ON public.staff_audit_log;
CREATE POLICY "staff_audit_log_insert" ON public.staff_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- maintenance_tasks policies:
DROP POLICY IF EXISTS "maint_tasks_select" ON public.maintenance_tasks;
CREATE POLICY "maint_tasks_select" ON public.maintenance_tasks
  FOR SELECT TO authenticated
  USING (public.is_turf_owner_or_staff(turf_id));

DROP POLICY IF EXISTS "maint_tasks_insert" ON public.maintenance_tasks;
CREATE POLICY "maint_tasks_insert" ON public.maintenance_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission(turf_id, 'manage_maintenance'));

DROP POLICY IF EXISTS "maint_tasks_update" ON public.maintenance_tasks;
CREATE POLICY "maint_tasks_update" ON public.maintenance_tasks
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission(turf_id, 'manage_maintenance'))
  WITH CHECK (public.has_staff_permission(turf_id, 'manage_maintenance'));

DROP POLICY IF EXISTS "maint_tasks_delete" ON public.maintenance_tasks;
CREATE POLICY "maint_tasks_delete" ON public.maintenance_tasks
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid()
    )
  );

-- maintenance_windows policies:
DROP POLICY IF EXISTS "maint_windows_select" ON public.maintenance_windows;
CREATE POLICY "maint_windows_select" ON public.maintenance_windows
  FOR SELECT TO authenticated
  USING (public.is_turf_owner_or_staff(turf_id));

DROP POLICY IF EXISTS "maint_windows_insert" ON public.maintenance_windows;
CREATE POLICY "maint_windows_insert" ON public.maintenance_windows
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission(turf_id, 'manage_maintenance'));

DROP POLICY IF EXISTS "maint_windows_update" ON public.maintenance_windows;
CREATE POLICY "maint_windows_update" ON public.maintenance_windows
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission(turf_id, 'manage_maintenance'))
  WITH CHECK (public.has_staff_permission(turf_id, 'manage_maintenance'));

DROP POLICY IF EXISTS "maint_windows_delete" ON public.maintenance_windows;
CREATE POLICY "maint_windows_delete" ON public.maintenance_windows
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.turfs t WHERE t.id = turf_id AND t.owner_id = auth.uid()
    )
  );

-- notification_preferences policies:
DROP POLICY IF EXISTS "notif_prefs_select" ON public.notification_preferences;
CREATE POLICY "notif_prefs_select" ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_prefs_upsert" ON public.notification_preferences;
CREATE POLICY "notif_prefs_upsert" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


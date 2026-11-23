-- Migration: Add checked_in_by and index to public.bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'checked_in_by'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN checked_in_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_attendance ON public.bookings (turf_id, booking_date, attendance_status);

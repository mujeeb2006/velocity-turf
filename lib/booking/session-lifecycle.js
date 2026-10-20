// lib/booking/session-lifecycle.js
// SERVER-ONLY session lifecycle automation.
// Sweeps active bookings and transitions expired sessions to "completed".

import { createAdminClient } from "@/lib/supabase/admin.js";
import {
  TURF_TIMEZONE,
  getTurfCurrentTime,
  addHoursToTime,
  isSessionEnded,
  isSessionStartedOrEnded,
  annotateSlotsWithLiveTime,
} from "./session-time.js";

export {
  TURF_TIMEZONE,
  getTurfCurrentTime,
  addHoursToTime,
  isSessionEnded,
  isSessionStartedOrEnded,
  annotateSlotsWithLiveTime,
};

/**
 * Closes and marks 'completed' for all bookings whose scheduled session has ended.
 * Safe and idempotent: updates existing status fields only without deleting any customer data.
 */
export async function closeExpiredBookings(admin = createAdminClient(), timeZone = TURF_TIMEZONE) {
  try {
    const current = getTurfCurrentTime(timeZone);

    // Fetch active bookings on or before today
    const { data: activeBookings, error } = await admin
      .from("bookings")
      .select("id, booking_date, start_time, status")
      .in("status", ["confirmed", "pending"])
      .lte("booking_date", current.date);

    if (error) {
      console.error("closeExpiredBookings fetch failed", error);
      return { ok: false, error: error.message, count: 0 };
    }

    const expiredIds = (activeBookings || [])
      .filter((b) => isSessionEnded(b.booking_date, b.start_time, 1, current))
      .map((b) => b.id);

    if (expiredIds.length === 0) {
      return { ok: true, count: 0, updatedIds: [], timestamp: current };
    }

    const { data: updated, error: updateError } = await admin
      .from("bookings")
      .update({ status: "completed" })
      .in("id", expiredIds)
      .select("id, status");

    if (updateError) {
      console.error("closeExpiredBookings update failed", updateError);
      return { ok: false, error: updateError.message, count: 0 };
    }

    return {
      ok: true,
      count: updated?.length || 0,
      updatedIds: (updated || []).map((u) => u.id),
      timestamp: current,
    };
  } catch (err) {
    console.error("closeExpiredBookings exception", err);
    return { ok: false, error: err.message, count: 0 };
  }
}

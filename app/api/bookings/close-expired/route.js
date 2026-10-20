import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { closeExpiredBookings, getTurfCurrentTime } from "@/lib/booking/session-lifecycle";

// GET / POST /api/bookings/close-expired
// Sweeps active bookings and transitions any session whose scheduled end time
// has passed into "completed". Safe, idempotent, preserves all customer data.
export async function GET() {
  const admin = createAdminClient();
  const result = await closeExpiredBookings(admin);
  const serverTime = getTurfCurrentTime();

  return NextResponse.json({
    success: result.ok,
    closedCount: result.count,
    updatedIds: result.updatedIds || [],
    serverTime,
    error: result.error || null,
  });
}

export async function POST() {
  return GET();
}

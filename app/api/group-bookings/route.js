import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";
import { readJson } from "@/lib/admin/server";
import { createGroupBooking, getPlayerGroupBookings } from "@/lib/group/service";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to view your group bookings.");
  }

  const admin = createAdminClient();
  try {
    const data = await getPlayerGroupBookings(admin, profile.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/group-bookings error:", err);
    return Errors.internal("Could not load group bookings.");
  }
}

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to create a group booking.");
  }

  const body = await readJson(request);
  const {
    turfId,
    sport,
    bookingDate,
    startTime,
    participantCount,
    splitMode,
    customShares,
    paymentMode,
    deadlineMinutes,
  } = body || {};

  if (!turfId || !bookingDate || !startTime) {
    return Errors.badRequest("Turf, date, and start time are required.");
  }

  const admin = createAdminClient();
  const origin = request.nextUrl.origin || "";

  try {
    const result = await createGroupBooking(admin, {
      leaderId: profile.id,
      turfId,
      sport,
      bookingDate,
      startTime,
      participantCount,
      splitMode,
      customShares,
      paymentMode,
      deadlineMinutes,
      origin,
    });

    if (!result.ok) {
      return Errors.badRequest(result.error);
    }

    return ok(result);
  } catch (err) {
    console.error("POST /api/group-bookings error:", err);
    return Errors.internal("Failed to create group booking.");
  }
}


import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { hasStaffPermission } from "@/lib/staff/policy";
import { sendSmartNotification, NOTIFICATION_EVENT_TYPES, NOTIFICATION_CATEGORIES, buildDedupKey } from "@/lib/notifications/service";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await readJson(request);
  const bookingId = body?.bookingId;
  const attendanceStatus = body?.status || "checked_in";

  if (!UUID_PATTERN.test(bookingId)) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  if (!["checked_in", "no_show", "not_arrived"].includes(attendanceStatus)) {
    return NextResponse.json({ error: "Invalid attendance status." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("id, turf_id, player_id, booking_date, start_time, sport, status, attendance_status, turf:turfs(id, name, owner_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return NextResponse.json(
      { error: `Cannot check in a booking with status "${booking.status}". Booking must be confirmed.` },
      { status: 409 }
    );
  }

  // Verify authorization
  const role = normalizeUserRole(profile.role);
  let authorized = false;
  let actorRole = role;

  if (role === "admin" || (role === "owner" && booking.turf?.owner_id === profile.id)) {
    authorized = true;
  } else {
    // Check staff permissions
    const { data: staffRec } = await admin
      .from("venue_staff")
      .select("id, owner_id, turf_id, role, permissions, status")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .maybeSingle();

    if (staffRec && (!staffRec.turf_id || staffRec.turf_id === booking.turf_id)) {
      if (hasStaffPermission(staffRec, "checkin_players")) {
        authorized = true;
        actorRole = "staff";
      }
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "You do not have permission to manage attendance for this venue." },
      { status: 403 }
    );
  }

  const updates = {
    attendance_status: attendanceStatus,
    checked_in_at: attendanceStatus === "checked_in" ? new Date().toISOString() : null,
  };

  const { data: updated, error: updateErr } = await admin
    .from("bookings")
    .update(updates)
    .eq("id", bookingId)
    .select()
    .single();

  if (updateErr) {
    console.error("checkin booking update error:", updateErr);
    return NextResponse.json({ error: "Failed to update attendance." }, { status: 500 });
  }

  // Audit log
  await admin.from("staff_audit_log").insert({
    turf_id: booking.turf_id,
    actor_id: profile.id,
    actor_role: actorRole,
    action: "player_checkin",
    target_type: "booking",
    target_id: bookingId,
    details: { attendance_status: attendanceStatus, player_id: booking.player_id },
  });

  // Notify player when checked in
  if (attendanceStatus === "checked_in") {
    const turfName = booking.turf?.name || "the venue";
    await sendSmartNotification(admin, {
      userId: booking.player_id,
      title: "Checked In! Game On",
      body: `You are successfully checked in for your ${booking.sport} session at ${turfName} (${formatBookingDate(booking.booking_date)} at ${formatTime12(booking.start_time)}). Have a great game!`,
      eventType: NOTIFICATION_EVENT_TYPES.BOOKING_CONFIRMED,
      category: NOTIFICATION_CATEGORIES.BOOKINGS,
      dedupKey: buildDedupKey("checkin", booking.id, booking.player_id),
    });
  }

  return NextResponse.json({ success: true, booking: updated });
}


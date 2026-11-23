import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { hasStaffPermission } from "@/lib/staff/policy";
import { sendSmartNotification, NOTIFICATION_EVENT_TYPES, NOTIFICATION_CATEGORIES, buildDedupKey } from "@/lib/notifications/service";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";
import { parseBookingQr } from "@/lib/qr/booking-qr";

/**
 * Helper to verify whether the actor is authorized to manage attendance for a given turf.
 * - Admin: always authorized
 * - Owner: authorized if turf.owner_id === profile.id
 * - Staff: active venue_staff record with 'checkin_players' permission matching turf_id
 */
async function checkAttendanceAuthorization(admin, profile, turf) {
  const role = normalizeUserRole(profile.role);
  if (role === "admin") {
    return { authorized: true, actorRole: "admin" };
  }
  if (role === "owner" && turf?.owner_id === profile.id) {
    return { authorized: true, actorRole: "owner" };
  }

  // Check venue staff permissions
  const { data: staffRec } = await admin
    .from("venue_staff")
    .select("id, owner_id, turf_id, role, permissions, status")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (staffRec && (!staffRec.turf_id || staffRec.turf_id === turf?.id)) {
    if (hasStaffPermission(staffRec, "checkin_players")) {
      return { authorized: true, actorRole: "staff" };
    }
  }

  return { authorized: false, actorRole: role };
}

/**
 * GET /api/bookings/checkin?bookingId=... or ?code=...
 * Verifies a scanned QR code or manual booking ID.
 * Returns booking details, player details, validity checks, and attendance state.
 */
export async function GET(request) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("bookingId") || searchParams.get("code") || "";
  const bookingId = parseBookingQr(rawId);

  if (!bookingId || !UUID_PATTERN.test(bookingId)) {
    return NextResponse.json(
      { error: "Invalid booking ID or QR format. Please scan a valid Velocity Turf ticket." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Fetch booking with turf info
  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("*, turf:turfs(id, name, owner_id, address, city)")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found in the system." }, { status: 404 });
  }

  // Authorization check
  const { authorized } = await checkAttendanceAuthorization(admin, profile, booking.turf);
  if (!authorized) {
    return NextResponse.json(
      { error: "You are not authorized to check in bookings for this venue." },
      { status: 403 }
    );
  }

  // Fetch player details
  let player = { id: booking.player_id, full_name: "Customer", email: null, phone: null };
  if (booking.player_id) {
    const { data: playerProfile } = await admin
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", booking.player_id)
      .maybeSingle();
    if (playerProfile) {
      player = playerProfile;
    }
  }

  // Fetch staff who previously checked them in if already checked in
  let checkedInByName = null;
  if (booking.checked_in_by) {
    const { data: staffProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", booking.checked_in_by)
      .maybeSingle();
    if (staffProfile) {
      checkedInByName = staffProfile.full_name;
    }
  }

  // Status validity
  const isConfirmed = booking.status === "confirmed" || booking.status === "completed";
  const isCancelled = booking.status === "cancelled" || booking.status === "rejected";
  const isPaid = !booking.payment_status || ["paid", "completed"].includes(booking.payment_status);

  // Date check
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const isToday = booking.booking_date === todayStr;

  let warning = null;
  if (!isToday) {
    if (booking.booking_date < todayStr) {
      warning = `Booking was scheduled for a past date (${formatBookingDate(booking.booking_date)}).`;
    } else {
      warning = `Booking is scheduled for a future date (${formatBookingDate(booking.booking_date)}).`;
    }
  }

  const alreadyCheckedIn = booking.attendance_status === "checked_in";

  return NextResponse.json({
    ok: true,
    booking: {
      id: booking.id,
      turf_id: booking.turf_id,
      turf_name: booking.turf?.name || "Unknown Venue",
      turf_address: booking.turf?.address || "",
      turf_city: booking.turf?.city || "",
      sport: booking.sport || "Sport",
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      payment_status: booking.payment_status || "paid",
      total_amount: booking.price ?? booking.total_amount ?? 0,
      attendance_status: booking.attendance_status || "not_arrived",
      checked_in_at: booking.checked_in_at,
      checked_in_by: booking.checked_in_by,
      checked_in_by_name: checkedInByName,
      player: {
        id: player.id,
        name: player.full_name || "Guest Player",
        email: player.email,
        phone: player.phone,
      },
    },
    is_today: isToday,
    is_confirmed: isConfirmed,
    is_cancelled: isCancelled,
    is_paid: isPaid,
    already_checked_in: alreadyCheckedIn,
    warning,
  });
}

/**
 * POST /api/bookings/checkin
 * Atomically marks player attendance as checked_in, no_show, or not_arrived.
 */
export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await readJson(request);
  const rawId = body?.bookingId;
  const bookingId = parseBookingQr(rawId);
  const attendanceStatus = body?.status || "checked_in";

  if (!bookingId || !UUID_PATTERN.test(bookingId)) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  if (!["checked_in", "no_show", "not_arrived"].includes(attendanceStatus)) {
    return NextResponse.json({ error: "Invalid attendance status." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("id, turf_id, player_id, booking_date, start_time, sport, status, payment_status, attendance_status, checked_in_at, checked_in_by, turf:turfs(id, name, owner_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // Players cannot check themselves in
  const { authorized, actorRole } = await checkAttendanceAuthorization(admin, profile, booking.turf);
  if (!authorized) {
    return NextResponse.json(
      { error: "You do not have permission to mark attendance for this venue." },
      { status: 403 }
    );
  }

  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return NextResponse.json(
      { error: `Cannot check in a booking with status "${booking.status}". Booking must be confirmed.` },
      { status: 409 }
    );
  }

  // Duplicate Check-in Prevention
  if (attendanceStatus === "checked_in" && booking.attendance_status === "checked_in") {
    return NextResponse.json(
      {
        error: `Booking has already been checked in at ${new Date(booking.checked_in_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
        already_checked_in: true,
        checked_in_at: booking.checked_in_at,
      },
      { status: 409 }
    );
  }

  const updates = {
    attendance_status: attendanceStatus,
    checked_in_at: attendanceStatus === "checked_in" ? new Date().toISOString() : null,
    checked_in_by: attendanceStatus === "checked_in" ? profile.id : null,
  };

  // Atomic database update query with concurrency guard
  let query = admin
    .from("bookings")
    .update(updates)
    .eq("id", bookingId);

  if (attendanceStatus === "checked_in") {
    // Condition on attendance_status != 'checked_in' to avoid race conditions across multiple devices
    query = query.neq("attendance_status", "checked_in");
  }

  const { data: updated, error: updateErr } = await query.select().maybeSingle();

  if (updateErr) {
    console.error("checkin booking update error:", updateErr);
    return NextResponse.json({ error: "Failed to update attendance." }, { status: 500 });
  }

  // If no row was updated because another concurrent request checked it in first
  if (!updated && attendanceStatus === "checked_in") {
    return NextResponse.json(
      {
        error: "This booking was just checked in from another device.",
        already_checked_in: true,
      },
      { status: 409 }
    );
  }

  // Audit log
  await admin.from("staff_audit_log").insert({
    turf_id: booking.turf_id,
    actor_id: profile.id,
    actor_role: actorRole,
    action: "player_checkin",
    target_type: "booking",
    target_id: bookingId,
    details: { attendance_status: attendanceStatus, player_id: booking.player_id, actor_name: profile.full_name },
  });

  // Notify player when checked in
  if (attendanceStatus === "checked_in" && booking.player_id) {
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

  return NextResponse.json({
    success: true,
    booking: updated || { ...booking, ...updates },
    message: attendanceStatus === "checked_in" ? "Player Checked In Successfully" : "Attendance status updated.",
  });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { notifyUser, readJson, UUID_PATTERN } from "@/lib/admin/server";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";

// Valid state transitions for owner/admin decisions
const ALLOWED_TRANSITIONS = {
  approve: { from: ["pending"],             to: "confirmed" },
  reject:  { from: ["pending", "confirmed"], to: "declined"  },
};

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });
  }

  const body = await readJson(request);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  const decision  = body?.decision;
  const reason    = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

  if (!UUID_PATTERN.test(bookingId) || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const transition = ALLOWED_TRANSITIONS[decision];
  const admin = createAdminClient();

  // ── Load booking ──────────────────────────────────────────────────────────
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, status, turf_id, player_id, booking_date, start_time, sport, price, turf:turfs(name, owner_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("booking decision lookup failed", bookingError);
    return NextResponse.json({ error: "Could not load that booking." }, { status: 500 });
  }
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  // ── State machine guard ───────────────────────────────────────────────────
  if (!transition.from.includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot ${decision} a booking with status "${booking.status}".` },
      { status: 409 }
    );
  }

  // ── Owner authorization ───────────────────────────────────────────────────
  if (role === "owner") {
    if (!booking.turf || booking.turf.owner_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only respond to bookings for your own turfs." },
        { status: 403 }
      );
    }
  }

  const newStatus = transition.to;

  // ── Atomic update (re-checks current status) ──────────────────────────────
  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId)
    .in("status", transition.from)   // concurrent-safe guard
    .select("id, status");

  if (updateError) {
    console.error("booking decision update failed", updateError);
    return NextResponse.json({ error: "Could not update that booking." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This booking has already been changed." }, { status: 409 });
  }

  // ── Write audit log (best-effort) ─────────────────────────────────────────
  try {
    await admin.from("booking_audit_log").insert({
      booking_id:  bookingId,
      turf_id:     booking.turf_id,
      player_id:   booking.player_id,
      actor_id:    profile.id,
      actor_role:  role,
      action:      newStatus === "confirmed" ? "confirmed" : "declined",
      prev_status: booking.status,
      new_status:  newStatus,
      reason,
    });
  } catch (auditErr) {
    console.error("audit log write failed", auditErr);
  }

  // ── Notify player ──────────────────────────────────────────────────────────
  if (decision === "reject") {
    const turfName  = booking.turf?.name || "the turf";
    const wasConfirmed = booking.status === "confirmed";
    const action = wasConfirmed ? "cancelled" : "rejected";
    await notifyUser(
      admin,
      booking.player_id,
      wasConfirmed ? "Booking cancelled" : "Booking rejected",
      `Your booking at ${turfName} on ${formatBookingDate(booking.booking_date)} at ${formatTime12(booking.start_time)} was ${action} by the ${role === "owner" ? "turf owner" : "admin"}. The slot is available again.${reason ? ` Reason: ${reason}` : ""}`
    );
  } else {
    // Notify player of approval
    await notifyUser(
      admin,
      booking.player_id,
      "Booking confirmed",
      `Your booking at ${booking.turf?.name || "the turf"} on ${formatBookingDate(booking.booking_date)} at ${formatTime12(booking.start_time)} has been confirmed.`
    );
  }

  return NextResponse.json({ success: true, status: newStatus });
}

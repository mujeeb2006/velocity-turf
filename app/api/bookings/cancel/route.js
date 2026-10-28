import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { notifyUser, readJson, UUID_PATTERN } from "@/lib/admin/server";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";

import { refundPackageSession } from "@/lib/package/service";

// POST /api/bookings/cancel
// Body: { bookingId: uuid, reason?: string }
// Only the booking's own player (or an admin) may cancel.
export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  const body = await readJson(request);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  const reason    = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

  if (!UUID_PATTERN.test(bookingId)) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Load booking ──────────────────────────────────────────────────────────
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, status, turf_id, player_id, booking_date, start_time, package_redemption_id, turf:turfs(name, owner_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("cancel lookup failed", bookingError);
    return NextResponse.json({ error: "Could not load that booking." }, { status: 500 });
  }
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  // ── Authorization ─────────────────────────────────────────────────────────
  if (role === "player" && booking.player_id !== profile.id) {
    return NextResponse.json({ error: "You can only cancel your own bookings." }, { status: 403 });
  }
  // Owners cannot cancel through this endpoint (use /decision)
  if (role === "owner") {
    return NextResponse.json({ error: "Owners should use the reject endpoint." }, { status: 403 });
  }

  // ── State machine guard ───────────────────────────────────────────────────
  if (!["pending", "confirmed"].includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a booking with status "${booking.status}".` },
      { status: 409 }
    );
  }

  // ── Atomic update ─────────────────────────────────────────────────────────
  const prevStatus = booking.status;
  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"])   // concurrent-safe
    .select("id, status");

  if (updateError) {
    console.error("cancel update failed", updateError);
    return NextResponse.json({ error: "Could not cancel that booking." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This booking has already been changed." }, { status: 409 });
  }

  // ── Write audit log ───────────────────────────────────────────────────────
  try {
    await admin.from("booking_audit_log").insert({
      booking_id:  bookingId,
      turf_id:     booking.turf_id,
      player_id:   booking.player_id,
      actor_id:    profile.id,
      actor_role:  role,
      action:      "cancelled",
      prev_status: prevStatus,
      new_status:  "cancelled",
      reason,
    });
  } catch (auditErr) {
    console.error("audit log write failed on cancel", auditErr);
  }

  // ── Restore pass session if booked via sports package ───────────────────
  if (booking.package_redemption_id) {
    try {
      await refundPackageSession(admin, {
        redemptionId: booking.package_redemption_id,
        bookingId: booking.id,
        userId: booking.player_id,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
      });
    } catch (refundErr) {
      console.error("Pass session refund failed upon booking cancellation:", refundErr);
    }
  }

  // ── Notify turf owner that the slot is free again (best-effort) ───────────
  try {
    if (booking.turf?.owner_id) {
      await notifyUser(
        admin,
        booking.turf.owner_id,
        "Booking cancelled — slot reopened",
        `A booking at ${booking.turf.name} on ${formatBookingDate(booking.booking_date)} at ${formatTime12(booking.start_time)} was cancelled by the player. The slot is available again.`
      );
    }
  } catch (notifErr) {
    console.warn("Could not notify owner of cancellation", notifErr);
  }

  return NextResponse.json({ success: true, status: "cancelled" });
}

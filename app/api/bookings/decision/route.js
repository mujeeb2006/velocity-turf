import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { notifyUser, readJson, UUID_PATTERN } from "@/lib/admin/server";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });
  }

  const body = await readJson(request);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  const decision = body?.decision;
  if (!UUID_PATTERN.test(bookingId) || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, status, turf_id, player_id, booking_date, start_time, turf:turfs(name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) {
    console.error("booking decision lookup failed", bookingError);
    return NextResponse.json({ error: "Could not load that booking." }, { status: 500 });
  }
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const allowedStatuses = decision === "reject" ? ["pending", "confirmed"] : ["pending"];
  if (!allowedStatuses.includes(booking.status)) {
    return NextResponse.json({ error: "This booking can no longer be changed." }, { status: 409 });
  }

  if (role === "owner") {
    const { data: turf, error: turfError } = await admin
      .from("turfs")
      .select("owner_id")
      .eq("id", booking.turf_id)
      .maybeSingle();
    if (turfError) {
      console.error("booking owner lookup failed", turfError);
      return NextResponse.json({ error: "Could not verify booking ownership." }, { status: 500 });
    }
    if (!turf || turf.owner_id !== profile.id) {
      return NextResponse.json({ error: "You can only respond to bookings for your own turfs." }, { status: 403 });
    }
  }

  const status = decision === "approve" ? "confirmed" : "declined";
  const { data: updated, error } = await admin
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .in("status", allowedStatuses)
    .select("id");
  if (error) {
    console.error("booking decision update failed", error);
    return NextResponse.json({ error: "Could not update that booking." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This booking has already been changed." }, { status: 409 });
  }

  if (decision === "reject") {
    const turfName = booking.turf?.name || "the turf";
    const wasConfirmed = booking.status === "confirmed";
    const action = wasConfirmed ? "cancelled" : "rejected";
    await notifyUser(
      admin,
      booking.player_id,
      wasConfirmed ? "Booking cancelled" : "Booking rejected",
      `Your booking at ${turfName} on ${formatBookingDate(booking.booking_date)} at ${formatTime12(booking.start_time)} was ${action} by the ${role === "owner" ? "turf owner" : "admin"}. The slot is available again.`,
    );
  }

  return NextResponse.json({ success: true, status });
}

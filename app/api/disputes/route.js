import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { notifyUser, readJson, UUID_PATTERN } from "@/lib/admin/server";

// POST /api/disputes
// Body: { bookingId, category, details }
// Only the player who made the booking (or an admin) may raise a support dispute.
export async function POST(request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const role = normalizeUserRole(profile.role);
  if (role !== "player" && role !== "admin") {
    return NextResponse.json({ error: "Only player accounts can raise support requests." }, { status: 403 });
  }

  // ── Parse & Validate body ─────────────────────────────────────────────────
  const body = await readJson(request);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
  const category  = typeof body?.category  === "string" ? body.category.trim()  : "Other";
  const details   = typeof body?.details   === "string" ? body.details.trim()   : "";

  if (!UUID_PATTERN.test(bookingId)) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  if (!details || details.length < 5 || details.length > 2000) {
    return NextResponse.json(
      { error: "Please provide a detailed description (between 5 and 2000 characters)." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // ── Verify booking eligibility ─────────────────────────────────────────────
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, player_id, turf_id, price, status, booking_date, turf:turfs(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("dispute: booking lookup failed", { code: bookingError.code, message: bookingError.message });
    return NextResponse.json({ error: "Could not verify booking." }, { status: 500 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (role !== "admin" && booking.player_id !== profile.id) {
    return NextResponse.json({ error: "You can only report issues with your own bookings." }, { status: 403 });
  }

  // ── Check if dispute already exists for this booking ───────────────────────
  const { data: existingDispute } = await admin
    .from("disputes")
    .select("id, ticket_number, status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingDispute) {
    return NextResponse.json(
      {
        error: `A support ticket (${existingDispute.ticket_number}) has already been opened for this booking.`,
        ticketNumber: existingDispute.ticket_number,
      },
      { status: 409 }
    );
  }

  // ── Generate ticket number & insert ────────────────────────────────────────
  const ticketNumber = "VT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  const issueText = `${category}: ${details}`;
  const amount = Number(booking.price) || 0;

  const { data: dispute, error: insertError } = await admin
    .from("disputes")
    .insert({
      ticket_number: ticketNumber,
      raised_by: profile.id,
      turf_id: booking.turf_id,
      booking_id: bookingId,
      issue: issueText,
      amount,
      status: "open",
    })
    .select("id, ticket_number, issue, amount, status, created_at")
    .single();

  if (insertError) {
    console.error("dispute: insert failed", {
      code: insertError.code,
      message: insertError.message,
      bookingId,
      userId: profile.id,
    });
    return NextResponse.json({ error: "Could not submit your support request. Please try again." }, { status: 500 });
  }

  // ── Confirmation notification (best-effort) ────────────────────────────────
  const turfName = booking.turf?.name || "your booking";
  notifyUser(
    admin,
    profile.id,
    `Support ticket opened: ${ticketNumber}`,
    `We received your request regarding ${turfName}. Our support team will review it shortly.`
  ).catch((err) => console.error("dispute notification error", err));

  return NextResponse.json({
    success: true,
    ticketNumber,
    dispute,
  });
}

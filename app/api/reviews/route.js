import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { dateKey } from "@/lib/dashboard/analytics";

// POST /api/reviews
// Body: { turfId, bookingId, rating, comment }
// Only the booking's own player may submit a review.
export async function POST(request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const role = normalizeUserRole(profile.role);
  if (role !== "player" && role !== "admin") {
    return NextResponse.json({ error: "Only player accounts can submit reviews." }, { status: 403 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const body = await readJson(request);
  const turfId    = typeof body?.turfId    === "string" ? body.turfId.trim()    : "";
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
  const rating    = typeof body?.rating    === "number" ? body.rating           : Number(body?.rating);
  const comment   = typeof body?.comment   === "string" ? body.comment.trim()   : "";

  if (!UUID_PATTERN.test(turfId) || !UUID_PATTERN.test(bookingId)) {
    return NextResponse.json({ error: "Invalid turf or booking ID." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (!comment || comment.length < 1 || comment.length > 1000) {
    return NextResponse.json({ error: "Review comment must be between 1 and 1000 characters." }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Verify booking eligibility ─────────────────────────────────────────────
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, player_id, turf_id, booking_date, start_time, status, archived_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("review: booking lookup failed", { code: bookingError.code, message: bookingError.message });
    return NextResponse.json({ error: "Could not verify booking." }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // ── Authorization ─────────────────────────────────────────────────────────
  if (role !== "admin" && booking.player_id !== profile.id) {
    return NextResponse.json({ error: "You can only review your own bookings." }, { status: 403 });
  }

  // ── Turf ID must match booking ────────────────────────────────────────────
  if (booking.turf_id !== turfId) {
    return NextResponse.json({ error: "Turf ID does not match the booking." }, { status: 400 });
  }

  // ── Only confirmed or completed bookings can be reviewed ──────────────────
  if (!["confirmed", "completed"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Only confirmed or completed bookings can be reviewed." },
      { status: 409 }
    );
  }

  // ── Booking must have taken place (local date key comparison) ──────────────
  const today = dateKey();
  if (booking.booking_date > today) {
    return NextResponse.json(
      { error: "You can only review bookings that have already taken place." },
      { status: 409 }
    );
  }

  // ── Check for duplicate review ─────────────────────────────────────────────
  const { data: existingReview } = await admin
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingReview) {
    return NextResponse.json(
      { error: "You've already reviewed this booking." },
      { status: 409 }
    );
  }

  // ── Insert review (database column is 'text'; fallback to 'comment' if needed) ──
  let review = null;
  let insertError = null;

  const textPayload = {
    player_id:  profile.id,
    turf_id:    turfId,
    booking_id: bookingId,
    rating,
    text:       comment,
  };

  const res1 = await admin
    .from("reviews")
    .insert(textPayload)
    .select("id, rating, text, created_at")
    .single();

  review = res1.data;
  insertError = res1.error;

  // Fallback if the database schema uses 'comment' instead of 'text'
  if (insertError && (insertError.code === "PGRST204" || insertError.code === "42703")) {
    const commentPayload = {
      player_id:  profile.id,
      turf_id:    turfId,
      booking_id: bookingId,
      rating,
      comment,
    };
    const res2 = await admin
      .from("reviews")
      .insert(commentPayload)
      .select("id, rating, created_at")
      .single();
    review = res2.data;
    insertError = res2.error;
  }

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You've already reviewed this booking." },
        { status: 409 }
      );
    }
    console.error("review: insert failed", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      playerId: profile.id,
      turfId,
      bookingId,
    });
    return NextResponse.json({ error: "Could not save review. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    review: {
      id: review.id,
      rating: review.rating,
      comment: review.text || comment,
      created_at: review.created_at,
    },
  });
}

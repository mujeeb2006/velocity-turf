import test from "node:test";
import assert from "node:assert/strict";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation helper mirroring /api/reviews business rules
function validateReviewPayload({ turfId, bookingId, rating, comment }) {
  if (!turfId || !UUID_PATTERN.test(turfId)) {
    return { ok: false, status: 400, error: "Invalid turf or booking ID." };
  }
  if (!bookingId || !UUID_PATTERN.test(bookingId)) {
    return { ok: false, status: 400, error: "Invalid turf or booking ID." };
  }
  const numericRating = typeof rating === "number" ? rating : Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return { ok: false, status: 400, error: "Rating must be between 1 and 5." };
  }
  const trimmed = typeof comment === "string" ? comment.trim() : "";
  if (!trimmed || trimmed.length < 1 || trimmed.length > 1000) {
    return { ok: false, status: 400, error: "Review comment must be between 1 and 1000 characters." };
  }
  return { ok: true, rating: numericRating, comment: trimmed };
}

// Eligibility checker mirroring /api/reviews verification logic
function canReviewBooking({ booking, profile, role, existingReview, todayStr }) {
  if (!profile) {
    return { ok: false, status: 401, error: "Sign in required." };
  }
  if (role !== "player" && role !== "admin") {
    return { ok: false, status: 403, error: "Only player accounts can submit reviews." };
  }
  if (!booking) {
    return { ok: false, status: 404, error: "Booking not found." };
  }
  if (role !== "admin" && booking.player_id !== profile.id) {
    return { ok: false, status: 403, error: "You can only review your own bookings." };
  }
  if (!["confirmed", "completed"].includes(booking.status)) {
    return { ok: false, status: 409, error: "Only confirmed or completed bookings can be reviewed." };
  }
  if (booking.booking_date > todayStr) {
    return { ok: false, status: 409, error: "You can only review bookings that have already taken place." };
  }
  if (existingReview) {
    return { ok: false, status: 409, error: "You've already reviewed this booking." };
  }
  return { ok: true };
}

test("Review payload validation: accepts valid input", () => {
  const result = validateReviewPayload({
    turfId: "11111111-1111-4111-8111-111111111111",
    bookingId: "22222222-2222-4222-8222-222222222222",
    rating: 5,
    comment: "Excellent pitch and great lighting!",
  });
  assert.equal(result.ok, true);
  assert.equal(result.rating, 5);
  assert.equal(result.comment, "Excellent pitch and great lighting!");
});

test("Review payload validation: rejects invalid UUIDs", () => {
  assert.equal(validateReviewPayload({ turfId: "bad-id", bookingId: "22222222-2222-4222-8222-222222222222", rating: 5, comment: "Good" }).ok, false);
  assert.equal(validateReviewPayload({ turfId: "11111111-1111-4111-8111-111111111111", bookingId: "bad-id", rating: 5, comment: "Good" }).ok, false);
});

test("Review payload validation: rejects out-of-range or non-integer ratings", () => {
  assert.equal(validateReviewPayload({ turfId: "11111111-1111-4111-8111-111111111111", bookingId: "22222222-2222-4222-8222-222222222222", rating: 0, comment: "Good" }).ok, false);
  assert.equal(validateReviewPayload({ turfId: "11111111-1111-4111-8111-111111111111", bookingId: "22222222-2222-4222-8222-222222222222", rating: 6, comment: "Good" }).ok, false);
  assert.equal(validateReviewPayload({ turfId: "11111111-1111-4111-8111-111111111111", bookingId: "22222222-2222-4222-8222-222222222222", rating: 4.5, comment: "Good" }).ok, false);
});

test("Review payload validation: rejects empty or excessive comments", () => {
  assert.equal(validateReviewPayload({ turfId: "11111111-1111-4111-8111-111111111111", bookingId: "22222222-2222-4222-8222-222222222222", rating: 4, comment: "   " }).ok, false);
  assert.equal(validateReviewPayload({ turfId: "11111111-1111-4111-8111-111111111111", bookingId: "22222222-2222-4222-8222-222222222222", rating: 4, comment: "a".repeat(1001) }).ok, false);
});

test("Review eligibility: allows player to review their played confirmed booking", () => {
  const result = canReviewBooking({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      booking_date: "2026-10-15",
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingReview: null,
    todayStr: "2026-10-20",
  });
  assert.equal(result.ok, true);
});

test("Review eligibility: blocks reviewing other user's booking", () => {
  const result = canReviewBooking({
    booking: {
      id: "b1",
      player_id: "user-2",
      turf_id: "t1",
      booking_date: "2026-10-15",
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingReview: null,
    todayStr: "2026-10-20",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("Review eligibility: blocks future booking review", () => {
  const result = canReviewBooking({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      booking_date: "2026-10-25",
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingReview: null,
    todayStr: "2026-10-20",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});

test("Review eligibility: blocks cancelled booking review", () => {
  const result = canReviewBooking({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      booking_date: "2026-10-15",
      status: "cancelled",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingReview: null,
    todayStr: "2026-10-20",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});

test("Review eligibility: blocks duplicate review submission", () => {
  const result = canReviewBooking({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      booking_date: "2026-10-15",
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingReview: { id: "rev-1" },
    todayStr: "2026-10-20",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});

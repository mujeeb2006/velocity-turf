import test from "node:test";
import assert from "node:assert/strict";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET_PATTERN = /^VT-[0-9A-Z]{8,12}$/;

// Validation helper mirroring /api/disputes business rules
function validateDisputePayload({ bookingId, category, details }) {
  if (!bookingId || !UUID_PATTERN.test(bookingId)) {
    return { ok: false, status: 400, error: "Invalid booking ID." };
  }
  const trimmed = typeof details === "string" ? details.trim() : "";
  if (!trimmed || trimmed.length < 5 || trimmed.length > 2000) {
    return {
      ok: false,
      status: 400,
      error: "Please provide a detailed description (between 5 and 2000 characters).",
    };
  }
  const cat = typeof category === "string" && category.trim() ? category.trim() : "Other";
  return { ok: true, bookingId, category: cat, details: trimmed };
}

// Eligibility checker mirroring /api/disputes verification logic
function canRaiseDispute({ booking, profile, role, existingDispute }) {
  if (!profile) {
    return { ok: false, status: 401, error: "Sign in required." };
  }
  if (role !== "player" && role !== "admin") {
    return { ok: false, status: 403, error: "Only player accounts can raise support requests." };
  }
  if (!booking) {
    return { ok: false, status: 404, error: "Booking not found." };
  }
  if (role !== "admin" && booking.player_id !== profile.id) {
    return { ok: false, status: 403, error: "You can only report issues with your own bookings." };
  }
  if (existingDispute) {
    return {
      ok: false,
      status: 409,
      error: `A support ticket (${existingDispute.ticket_number}) has already been opened for this booking.`,
    };
  }
  return { ok: true };
}

// Ticket generator helper
function generateTicketNumber() {
  return "VT-" + Math.random().toString(36).substring(2, 12).toUpperCase();
}

test("Dispute payload validation: accepts valid input", () => {
  const result = validateDisputePayload({
    bookingId: "11111111-2222-4333-8444-555555555555",
    category: "Facility issue",
    details: "The floodlights went out 20 minutes before our slot ended.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.category, "Facility issue");
  assert.equal(result.details, "The floodlights went out 20 minutes before our slot ended.");
});

test("Dispute payload validation: rejects invalid UUID", () => {
  const result = validateDisputePayload({
    bookingId: "invalid-booking-id",
    category: "Payment",
    details: "I was charged twice.",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("Dispute payload validation: rejects empty or too short details (<5 chars)", () => {
  assert.equal(validateDisputePayload({ bookingId: "11111111-2222-4333-8444-555555555555", category: "Other", details: "" }).ok, false);
  assert.equal(validateDisputePayload({ bookingId: "11111111-2222-4333-8444-555555555555", category: "Other", details: "help" }).ok, false);
});

test("Dispute payload validation: rejects excessive details (>2000 chars)", () => {
  const result = validateDisputePayload({
    bookingId: "11111111-2222-4333-8444-555555555555",
    category: "Other",
    details: "x".repeat(2001),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("Dispute eligibility: allows player to raise dispute on their own booking", () => {
  const result = canRaiseDispute({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      price: 500,
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingDispute: null,
  });
  assert.equal(result.ok, true);
});

test("Dispute eligibility: allows dispute on cancelled booking (e.g. for refund query)", () => {
  const result = canRaiseDispute({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      price: 500,
      status: "cancelled",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingDispute: null,
  });
  assert.equal(result.ok, true);
});

test("Dispute eligibility: blocks player from raising dispute on someone else's booking", () => {
  const result = canRaiseDispute({
    booking: {
      id: "b1",
      player_id: "user-other",
      turf_id: "t1",
      price: 500,
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingDispute: null,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("Dispute eligibility: blocks duplicate dispute on same booking", () => {
  const result = canRaiseDispute({
    booking: {
      id: "b1",
      player_id: "user-1",
      turf_id: "t1",
      price: 500,
      status: "confirmed",
    },
    profile: { id: "user-1", role: "player" },
    role: "player",
    existingDispute: { id: "d1", ticket_number: "VT-ABC12345" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.match(result.error, /VT-ABC12345/);
});

test("Dispute ticket number format matches VT-XXXXXXXX", () => {
  const ticket = generateTicketNumber();
  assert.match(ticket, TICKET_PATTERN);
});

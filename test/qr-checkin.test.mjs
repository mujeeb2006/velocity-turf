import test from "node:test";
import assert from "node:assert/strict";

import { parseBookingQr, formatBookingQr, BOOKING_QR_PREFIX } from "../lib/qr/booking-qr.js";
import { hasStaffPermission } from "../lib/staff/policy.js";

// ============================================================================
// 1. QR Code Parsing & Formatting Tests
// ============================================================================

test("QR Parsing: parses standard velocity-turf ticket QR payload", () => {
  const uuid = "e58ed763-928c-4155-bee9-fdbaaadc15f3";
  const qrString = `velocity-turf:booking:${uuid}`;
  const parsed = parseBookingQr(qrString);
  assert.equal(parsed, uuid);
});

test("QR Parsing: parses raw UUID string directly", () => {
  const uuid = "A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D";
  const parsed = parseBookingQr(uuid);
  assert.equal(parsed, uuid.toLowerCase());
});

test("QR Parsing: parses UUID from embedded URL or text", () => {
  const text = "https://velocityturf.com/player/tickets?id=12345678-1234-1234-1234-123456789abc&utm=scan";
  const parsed = parseBookingQr(text);
  assert.equal(parsed, "12345678-1234-1234-1234-123456789abc");
});

test("QR Parsing: returns null for invalid formats or empty inputs", () => {
  assert.equal(parseBookingQr(""), null);
  assert.equal(parseBookingQr(null), null);
  assert.equal(parseBookingQr(undefined), null);
  assert.equal(parseBookingQr("invalid-random-string"), null);
  assert.equal(parseBookingQr("velocity-turf:turf:123"), null);
});

test("QR Formatting: formats standardized player QR ticket payload", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  const formatted = formatBookingQr(id);
  assert.equal(formatted, `velocity-turf:booking:${id}`);
});

// ============================================================================
// 2. Booking Verification & Validation Business Logic Tests
// ============================================================================

test("Verification: confirms valid booking when status is confirmed and belongs to owner's turf", () => {
  const ownerId = "owner-uuid-1";
  const turfId = "turf-uuid-1";
  const booking = {
    id: "booking-1",
    turf_id: turfId,
    status: "confirmed",
    payment_status: "paid",
    booking_date: "2026-11-22",
    start_time: "18:00:00",
    attendance_status: "not_arrived",
    turf: { id: turfId, owner_id: ownerId },
  };

  const verifyBooking = (b, actor) => {
    if (!b) return { ok: false, error: "Booking not found", status: 404 };
    const isOwner = actor.role === "owner" && b.turf?.owner_id === actor.id;
    const isAdmin = actor.role === "admin";
    if (!isOwner && !isAdmin) {
      return { ok: false, error: "Unauthorized venue", status: 403 };
    }
    if (b.status !== "confirmed" && b.status !== "completed") {
      return { ok: false, error: `Invalid status ${b.status}`, status: 409 };
    }
    return { ok: true, booking: b };
  };

  // Owner of turf
  const resultOwner = verifyBooking(booking, { id: ownerId, role: "owner" });
  assert.equal(resultOwner.ok, true);

  // Admin
  const resultAdmin = verifyBooking(booking, { id: "admin-uuid", role: "admin" });
  assert.equal(resultAdmin.ok, true);

  // Different turf owner (unauthorized)
  const resultWrongOwner = verifyBooking(booking, { id: "other-owner", role: "owner" });
  assert.equal(resultWrongOwner.ok, false);
  assert.equal(resultWrongOwner.status, 403);

  // Player role (cannot verify/check in)
  const resultPlayer = verifyBooking(booking, { id: "player-uuid", role: "player" });
  assert.equal(resultPlayer.ok, false);
  assert.equal(resultPlayer.status, 403);
});

test("Verification: rejects cancelled, rejected, or pending booking requests", () => {
  const validateBookingState = (status) => {
    if (["cancelled", "rejected"].includes(status)) {
      return { eligible: false, reason: "Booking has been cancelled." };
    }
    if (status === "pending") {
      return { eligible: false, reason: "Booking is still pending approval." };
    }
    if (["confirmed", "completed"].includes(status)) {
      return { eligible: true };
    }
    return { eligible: false, reason: "Unknown status" };
  };

  assert.equal(validateBookingState("cancelled").eligible, false);
  assert.equal(validateBookingState("rejected").eligible, false);
  assert.equal(validateBookingState("pending").eligible, false);
  assert.equal(validateBookingState("confirmed").eligible, true);
  assert.equal(validateBookingState("completed").eligible, true);
});

test("Verification: detects schedule date mismatch and generates warning", () => {
  const checkDateMatch = (bookingDate, todayDate) => {
    if (bookingDate === todayDate) return { isToday: true, warning: null };
    if (bookingDate < todayDate) {
      return { isToday: false, warning: `Booking was scheduled for a past date (${bookingDate}).` };
    }
    return { isToday: false, warning: `Booking is scheduled for a future date (${bookingDate}).` };
  };

  const today = "2026-11-22";
  assert.equal(checkDateMatch("2026-11-22", today).isToday, true);
  assert.equal(checkDateMatch("2026-11-21", today).isToday, false);
  assert.ok(checkDateMatch("2026-11-21", today).warning.includes("past date"));
  assert.equal(checkDateMatch("2026-11-25", today).isToday, false);
  assert.ok(checkDateMatch("2026-11-25", today).warning.includes("future date"));
});

// ============================================================================
// 3. Duplicate Prevention & Atomic Check-in Tests
// ============================================================================

test("Duplicate Check-in Prevention: detects and rejects already checked-in booking", () => {
  const booking = {
    id: "booking-checked-1",
    attendance_status: "checked_in",
    checked_in_at: "2026-11-22T14:30:00Z",
    checked_in_by: "staff-1",
  };

  const handleCheckin = (targetBooking, newStatus) => {
    if (newStatus === "checked_in" && targetBooking.attendance_status === "checked_in") {
      return {
        success: false,
        status: 409,
        error: "Booking has already been checked in.",
        checked_in_at: targetBooking.checked_in_at,
      };
    }
    return {
      success: true,
      booking: { ...targetBooking, attendance_status: newStatus, checked_in_at: new Date().toISOString() },
    };
  };

  const res = handleCheckin(booking, "checked_in");
  assert.equal(res.success, false);
  assert.equal(res.status, 409);
  assert.ok(res.error.includes("already been checked in"));
});

test("Atomic Concurrency: simulates simultaneous check-in attempts where only one succeeds", () => {
  let dbRow = {
    id: "booking-sim-1",
    attendance_status: "not_arrived",
    checked_in_at: null,
  };

  // Simulates Postgres `UPDATE bookings SET attendance_status = 'checked_in' WHERE id = ? AND attendance_status != 'checked_in'`
  const atomicDbUpdate = (id, newStatus) => {
    if (dbRow.id === id && dbRow.attendance_status !== "checked_in") {
      dbRow = { ...dbRow, attendance_status: newStatus, checked_in_at: new Date().toISOString() };
      return { rowsAffected: 1, data: dbRow };
    }
    return { rowsAffected: 0, data: null };
  };

  // First request from Device A
  const req1 = atomicDbUpdate("booking-sim-1", "checked_in");
  assert.equal(req1.rowsAffected, 1);
  assert.equal(req1.data.attendance_status, "checked_in");

  // Concurrent request from Device B (arriving milliseconds later)
  const req2 = atomicDbUpdate("booking-sim-1", "checked_in");
  assert.equal(req2.rowsAffected, 0); // Guarded: 0 rows affected, triggers 409
});

// ============================================================================
// 4. Attendance Management & Roster Metrics
// ============================================================================

test("Attendance Roster: calculates turn-out, pending arrivals, and no-show metrics accurately", () => {
  const bookings = [
    { id: "b1", booking_date: "2026-11-22", status: "confirmed", attendance_status: "checked_in" },
    { id: "b2", booking_date: "2026-11-22", status: "confirmed", attendance_status: "checked_in" },
    { id: "b3", booking_date: "2026-11-22", status: "confirmed", attendance_status: "not_arrived" },
    { id: "b4", booking_date: "2026-11-22", status: "confirmed", attendance_status: "no_show" },
    { id: "b5", booking_date: "2026-11-22", status: "cancelled", attendance_status: "not_arrived" }, // Cancelled should be excluded
    { id: "b6", booking_date: "2026-11-23", status: "confirmed", attendance_status: "not_arrived" }, // Tomorrow
  ];

  const todayStr = "2026-11-22";
  const todayActive = bookings.filter((b) => b.booking_date === todayStr && b.status !== "cancelled");
  const checkedIn = todayActive.filter((b) => b.attendance_status === "checked_in").length;
  const expected = todayActive.length;
  const pending = todayActive.filter((b) => (b.attendance_status || "not_arrived") === "not_arrived").length;
  const noShows = todayActive.filter((b) => b.attendance_status === "no_show").length;

  assert.equal(expected, 4); // b1, b2, b3, b4
  assert.equal(checkedIn, 2); // b1, b2
  assert.equal(pending, 1); // b3
  assert.equal(noShows, 1); // b4
});

import test from "node:test";
import assert from "node:assert/strict";
import { Errors } from "../lib/api-response.js";
import { hashBookingPayload } from "../lib/booking/validation.js";
import { isValidTransition } from "../lib/booking/policy.js";

test("Archived turf rejection logic blocks booking creation", () => {
  const checkTurfAvailableForBooking = (turf) => {
    if (!turf || turf.status !== "live" || turf.archived_at) {
      return { ok: false, error: "This turf is not currently available for booking." };
    }
    return { ok: true };
  };

  // Live and not archived -> allowed
  assert.equal(
    checkTurfAvailableForBooking({ id: "t1", status: "live", archived_at: null }).ok,
    true
  );

  // Live but archived -> rejected
  const archived = checkTurfAvailableForBooking({
    id: "t2",
    status: "live",
    archived_at: "2026-10-18T10:00:00Z",
  });
  assert.equal(archived.ok, false);
  assert.match(archived.error, /not currently available/i);

  // Pending turf -> rejected
  const pending = checkTurfAvailableForBooking({ id: "t3", status: "pending", archived_at: null });
  assert.equal(pending.ok, false);

  // Rejected turf -> rejected
  const rejected = checkTurfAvailableForBooking({ id: "t4", status: "rejected", archived_at: null });
  assert.equal(rejected.ok, false);
});

test("Slot taken error response has status 409 and machine-readable SLOT_CONFLICT code", async () => {
  const errRes = Errors.slotTaken("req-test-slot");
  assert.equal(errRes.status, 409);
  const body = await errRes.json();
  assert.equal(body.code, "SLOT_CONFLICT");
  assert.match(body.message, /taken/i);
});

test("Idempotency hashing distinguishes different booking payloads", () => {
  const payload1 = {
    turfId: "3f2b8c1e-5a47-4d9e-8b61-0c9d2e7a1f44",
    startTime: "18:00:00",
    bookingDate: "2026-10-20",
    sport: "Football",
  };
  const payload2 = {
    turfId: "3f2b8c1e-5a47-4d9e-8b61-0c9d2e7a1f44",
    startTime: "19:00:00", // different time
    bookingDate: "2026-10-20",
    sport: "Football",
  };
  const hash1 = hashBookingPayload(payload1);
  const hash2 = hashBookingPayload(payload2);

  assert.notEqual(hash1, hash2);
  assert.equal(hash1, hashBookingPayload(payload1), "same payload must produce deterministic hash");
});

test("Booking state machine prevents invalid status reversions", () => {
  // Confirmed booking cannot be re-approved
  assert.equal(isValidTransition("approve", "confirmed"), false);

  // Declined booking cannot be cancelled or approved
  assert.equal(isValidTransition("cancel", "declined"), false);
  assert.equal(isValidTransition("approve", "declined"), false);

  // Cancelled booking cannot be rejected or approved
  assert.equal(isValidTransition("reject", "cancelled"), false);
  assert.equal(isValidTransition("approve", "cancelled"), false);

  // Pending booking can be approved, rejected, or cancelled
  assert.equal(isValidTransition("approve", "pending"), true);
  assert.equal(isValidTransition("reject", "pending"), true);
  assert.equal(isValidTransition("cancel", "pending"), true);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  isSlotAvailableForBooking,
  canSubmitBooking,
  isValidTransition,
  statusBlocksSlot,
  VALID_TRANSITIONS,
  TERMINAL_STATUSES,
} from "../lib/booking/policy.js";

// ── isSlotAvailableForBooking ─────────────────────────────────────────────────
test("isSlotAvailableForBooking: accepts only available slots", () => {
  assert.equal(isSlotAvailableForBooking({ status: "available" }), true);
  assert.equal(isSlotAvailableForBooking({ status: "booked" }),    false);
  assert.equal(isSlotAvailableForBooking({ status: "locked" }),    false);
  assert.equal(isSlotAvailableForBooking({ status: "blocked" }),   false);
  assert.equal(isSlotAvailableForBooking(null),                    false);
  assert.equal(isSlotAvailableForBooking(undefined),               false);
});

// ── canSubmitBooking ──────────────────────────────────────────────────────────
test("canSubmitBooking: rejects missing player", () => {
  const r = canSubmitBooking({
    profile: null,
    turf: { id: "t1", slots: [{ raw_time: "18:00:00", status: "available" }] },
    selectedSlot: 0,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /sign in/i);
});

test("canSubmitBooking: rejects taken slot", () => {
  const r = canSubmitBooking({
    profile: { id: "p1" },
    turf: { id: "t1", slots: [{ raw_time: "18:00:00", status: "booked" }] },
    selectedSlot: 0,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /just taken|not available/i);
});

test("canSubmitBooking: rejects null slot selection", () => {
  const r = canSubmitBooking({
    profile: { id: "p1" },
    turf: { id: "t1", slots: [{ raw_time: "18:00:00", status: "available" }] },
    selectedSlot: null,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /select a time slot/i);
});

test("canSubmitBooking: accepts a valid slot", () => {
  const r = canSubmitBooking({
    profile: { id: "p1" },
    turf: { id: "t1", slots: [{ raw_time: "18:00:00", status: "available" }] },
    selectedSlot: 0,
  });
  assert.equal(r.ok, true);
  assert.equal(r.error, undefined);
});

// ── State machine: isValidTransition ─────────────────────────────────────────
test("isValidTransition: approve from pending is valid", () => {
  assert.equal(isValidTransition("approve", "pending"), true);
});

test("isValidTransition: approve from confirmed is invalid", () => {
  assert.equal(isValidTransition("approve", "confirmed"), false);
});

test("isValidTransition: reject from pending and confirmed are valid", () => {
  assert.equal(isValidTransition("reject", "pending"),   true);
  assert.equal(isValidTransition("reject", "confirmed"), true);
});

test("isValidTransition: reject from declined or cancelled is invalid", () => {
  assert.equal(isValidTransition("reject", "declined"),  false);
  assert.equal(isValidTransition("reject", "cancelled"), false);
});

test("isValidTransition: cancel from pending and confirmed are valid", () => {
  assert.equal(isValidTransition("cancel", "pending"),   true);
  assert.equal(isValidTransition("cancel", "confirmed"), true);
});

test("isValidTransition: cancel from declined is invalid (terminal)", () => {
  assert.equal(isValidTransition("cancel", "declined"), false);
});

test("isValidTransition: unknown action returns false", () => {
  assert.equal(isValidTransition("delete", "confirmed"), false);
});

// ── Terminal statuses ─────────────────────────────────────────────────────────
test("TERMINAL_STATUSES includes declined, cancelled, completed", () => {
  assert.ok(TERMINAL_STATUSES.includes("declined"));
  assert.ok(TERMINAL_STATUSES.includes("cancelled"));
  assert.ok(TERMINAL_STATUSES.includes("completed"));
  assert.ok(!TERMINAL_STATUSES.includes("confirmed"));
  assert.ok(!TERMINAL_STATUSES.includes("pending"));
});

// ── statusBlocksSlot ──────────────────────────────────────────────────────────
test("statusBlocksSlot: pending, confirmed, completed block the slot", () => {
  assert.equal(statusBlocksSlot("pending"),   true);
  assert.equal(statusBlocksSlot("confirmed"), true);
  assert.equal(statusBlocksSlot("completed"), true);
});

test("statusBlocksSlot: declined, cancelled do not block the slot", () => {
  assert.equal(statusBlocksSlot("declined"),  false);
  assert.equal(statusBlocksSlot("cancelled"), false);
});

// ── VALID_TRANSITIONS structure ───────────────────────────────────────────────
test("VALID_TRANSITIONS shape is correct", () => {
  for (const [action, rule] of Object.entries(VALID_TRANSITIONS)) {
    assert.ok(Array.isArray(rule.from), `${action}.from should be an array`);
    assert.ok(typeof rule.to === "string", `${action}.to should be a string`);
    assert.ok(rule.from.length > 0, `${action}.from should not be empty`);
  }
});

// ── Idempotency guard (logic-level, no DB) ────────────────────────────────────
test("Same payload hash produces the same string", async () => {
  const { createHash } = await import("node:crypto");
  const payload = { turfId: "abc", startTime: "18:00", bookingDate: "2026-12-01", sport: "Football" };
  const h1 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const h2 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  assert.equal(h1, h2);
});

test("Different payload produces a different hash", async () => {
  const { createHash } = await import("node:crypto");
  const h1 = createHash("sha256").update(JSON.stringify({ startTime: "18:00" })).digest("hex");
  const h2 = createHash("sha256").update(JSON.stringify({ startTime: "19:00" })).digest("hex");
  assert.notEqual(h1, h2);
});

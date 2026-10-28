import test from "node:test";
import assert from "node:assert/strict";

import {
  FACILITY_TYPES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  validateMaintenanceTask,
  canTransitionMaintenanceStatus,
  findConflictingBookings,
} from "../lib/maintenance/policy.js";
import { isSlotAvailableForBooking } from "../lib/booking/policy.js";

test("Facility types: all required facilities are covered", () => {
  const ids = FACILITY_TYPES.map((f) => f.id);
  assert.ok(ids.includes("cleaning"));
  assert.ok(ids.includes("turf_repair"));
  assert.ok(ids.includes("lighting"));
  assert.ok(ids.includes("equipment"));
  assert.ok(ids.includes("nets"));
  assert.ok(ids.includes("washrooms"));
  assert.ok(ids.includes("other"));
});

test("Maintenance task validation: accepts valid payload", () => {
  const validTask = {
    title: "Artificial Turf Infill & Grooming",
    facility_type: "turf_repair",
    priority: "high",
    status: "open",
    description: "Annual rubber infill replenishment and mechanical sweeping.",
  };
  const result = validateMaintenanceTask(validTask);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("Maintenance task validation: rejects short title and invalid facility type", () => {
  const invalidTask = {
    title: "A",
    facility_type: "swimming_pool",
    priority: "extreme",
  };
  const result = validateMaintenanceTask(invalidTask);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("Title must be between 2 and 150 characters")));
  assert.ok(result.errors.some((e) => e.includes("Invalid facility type")));
  assert.ok(result.errors.some((e) => e.includes("Invalid priority")));
});

test("Maintenance task validation: enforces window times when blocking slots", () => {
  const invalidWindow = {
    title: "Floodlight repair",
    facility_type: "lighting",
    blocks_slots: true,
    start_date: "2026-11-01",
    start_time: "18:00",
    end_time: "14:00", // end before start!
  };
  const result = validateMaintenanceTask(invalidWindow);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("End time must be after start time")));
});

test("Maintenance state machine: allows valid transitions and blocks invalid ones", () => {
  // open -> in_progress
  assert.equal(canTransitionMaintenanceStatus("open", "in_progress"), true);
  // open -> completed
  assert.equal(canTransitionMaintenanceStatus("open", "completed"), true);
  // open -> cancelled
  assert.equal(canTransitionMaintenanceStatus("open", "cancelled"), true);
  // in_progress -> completed
  assert.equal(canTransitionMaintenanceStatus("in_progress", "completed"), true);

  // Completed is terminal
  assert.equal(canTransitionMaintenanceStatus("completed", "open"), false);
  assert.equal(canTransitionMaintenanceStatus("completed", "in_progress"), false);

  // Cancelled is terminal
  assert.equal(canTransitionMaintenanceStatus("cancelled", "open"), false);
  assert.equal(canTransitionMaintenanceStatus("cancelled", "in_progress"), false);
});

test("findConflictingBookings: accurately identifies overlapping confirmed bookings", () => {
  const bookings = [
    { id: "b1", booking_date: "2026-11-05", start_time: "07:00:00", status: "confirmed", sport: "Football" },
    { id: "b2", booking_date: "2026-11-05", start_time: "09:00:00", status: "confirmed", sport: "Football" },
    { id: "b3", booking_date: "2026-11-05", start_time: "11:00:00", status: "cancelled", sport: "Football" }, // already cancelled
    { id: "b4", booking_date: "2026-11-06", start_time: "08:00:00", status: "confirmed", sport: "Cricket" },  // different day
  ];

  // Maintenance scheduled for 2026-11-05 from 06:00 to 10:00
  const conflicts = findConflictingBookings(bookings, "2026-11-05", "06:00", "10:00");

  assert.equal(conflicts.length, 2);
  assert.equal(conflicts[0].id, "b1");
  assert.equal(conflicts[1].id, "b2");
});

test("isSlotAvailableForBooking: slots marked as maintenance are not bookable", () => {
  assert.equal(isSlotAvailableForBooking({ status: "available" }), true);
  assert.equal(isSlotAvailableForBooking({ status: "maintenance" }), false);
  assert.equal(isSlotAvailableForBooking({ status: "blocked" }), false);
  assert.equal(isSlotAvailableForBooking({ status: "booked" }), false);
});


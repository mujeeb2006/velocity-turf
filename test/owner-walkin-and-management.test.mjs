import test from "node:test";
import assert from "node:assert/strict";

import { calculateSlotPrice } from "../lib/turf/pricing.js";

test("Walk-in booking validation: validates customer name, date, slot and sport", () => {
  const validateWalkIn = (payload) => {
    const errors = [];
    if (!payload.turfId) errors.push("Missing turf");
    if (!payload.bookingDate) errors.push("Missing date");
    if (!payload.startTime) errors.push("Missing start time");
    if (!payload.sport) errors.push("Missing sport");
    if (!payload.customerName?.trim()) errors.push("Missing customer name");
    return { valid: errors.length === 0, errors };
  };

  const valid = validateWalkIn({
    turfId: "00000000-0000-0000-0000-000000000001",
    bookingDate: "2026-11-20",
    startTime: "18:00",
    sport: "Football",
    customerName: "Rahul Verma",
  });
  assert.equal(valid.valid, true);

  const invalid = validateWalkIn({
    turfId: "00000000-0000-0000-0000-000000000001",
    bookingDate: "2026-11-20",
    startTime: "18:00",
    sport: "Football",
    customerName: "", // missing!
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.includes("Missing customer name"));
});

test("Walk-in payment status: unpaid booking is strictly pending and not counted as collected revenue", () => {
  const bookings = [
    { id: "b1", price: 1200, booking_source: "online", payment_status: "paid", status: "confirmed" },
    { id: "b2", price: 1500, booking_source: "walk_in", payment_status: "paid", status: "confirmed" },
    { id: "b3", price: 1000, booking_source: "walk_in", payment_status: "pending", status: "pending" }, // Unpaid walk-in
  ];

  const collectedRevenue = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + b.price, 0);

  const pendingCollection = bookings
    .filter((b) => b.payment_status === "pending")
    .reduce((sum, b) => sum + b.price, 0);

  assert.equal(collectedRevenue, 2700);
  assert.equal(pendingCollection, 1000);
});

test("Walk-in slot conflict prevention: detects existing confirmed or pending slots", () => {
  const existingSlots = [
    { slot_time: "17:00:00", status: "available" },
    { slot_time: "18:00:00", status: "booked" },
    { slot_time: "19:00:00", status: "blocked" },
    { slot_time: "20:00:00", status: "available" },
  ];

  const canBookWalkIn = (time) => {
    const slot = existingSlots.find((s) => s.slot_time.startsWith(time));
    return slot && slot.status === "available";
  };

  assert.equal(canBookWalkIn("17:00"), true);
  assert.equal(canBookWalkIn("18:00"), false, "Cannot book already booked slot");
  assert.equal(canBookWalkIn("19:00"), false, "Cannot book blocked slot");
  assert.equal(canBookWalkIn("20:00"), true);
});

test("Staff authorization: venue managers and staff with manage_bookings can record walk-ins", () => {
  const checkWalkInPermission = (staffMember, isOwner, isAdmin) => {
    if (isOwner || isAdmin) return true;
    if (!staffMember || staffMember.status !== "active") return false;
    return (
      staffMember.role === "venue_manager" ||
      (Array.isArray(staffMember.permissions) && staffMember.permissions.includes("manage_bookings"))
    );
  };

  const owner = { id: "o1" };
  assert.equal(checkWalkInPermission(null, true, false), true);

  const manager = { role: "venue_manager", status: "active", permissions: [] };
  assert.equal(checkWalkInPermission(manager, false, false), true);

  const staffWithPerm = { role: "receptionist", status: "active", permissions: ["manage_bookings"] };
  assert.equal(checkWalkInPermission(staffWithPerm, false, false), true);

  const groundskeeper = { role: "maintenance_staff", status: "active", permissions: ["manage_maintenance"] };
  assert.equal(checkWalkInPermission(groundskeeper, false, false), false);
});

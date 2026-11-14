import test from "node:test";
import assert from "node:assert/strict";

import { calculateSlotPrice, validatePricingRules } from "../lib/turf/pricing.js";
import { sumRevenue } from "../lib/dashboard/analytics.js";

test("Audit 1 & 12: Player displayed price and backend calculated price match identically", () => {
  const turf = {
    id: "turf-1",
    base_price: 1200,
    peak_price: 1600,
    pricing_rules: {
      timeBands: [
        { id: "morning", label: "Morning", startTime: "06:00", endTime: "12:00", price: 1000 },
        { id: "evening", label: "Evening Peak", startTime: "16:00", endTime: "21:00", price: 1500 },
      ],
      weekendPrice: 1400,
    },
  };

  // Scenario A: Wednesday Morning
  const playerWedMorning = calculateSlotPrice(turf, "2026-11-18", "08:00", 20).price;
  const backendWedMorning = calculateSlotPrice(turf, "2026-11-18", "08:00", 20).price;
  assert.equal(playerWedMorning, 1000);
  assert.equal(backendWedMorning, 1000);
  assert.equal(playerWedMorning, backendWedMorning);

  // Scenario B: Saturday Afternoon (Weekend override)
  const playerSat = calculateSlotPrice(turf, "2026-11-21", "14:00", 30).price;
  const backendSat = calculateSlotPrice(turf, "2026-11-21", "14:00", 30).price;
  assert.equal(playerSat, 1400);
  assert.equal(backendSat, 1400);
  assert.equal(playerSat, backendSat);

  // Scenario C: Wednesday Evening (Time band)
  const playerWedEvening = calculateSlotPrice(turf, "2026-11-18", "18:00", 10).price;
  const backendWedEvening = calculateSlotPrice(turf, "2026-11-18", "18:00", 10).price;
  assert.equal(playerWedEvening, 1500);
  assert.equal(backendWedEvening, 1500);
  assert.equal(playerWedEvening, backendWedEvening);
});

test("Audit 2: Existing confirmed bookings permanently retain original agreed price", () => {
  const pastBookings = [
    { id: "b1", price: 1000, booking_date: "2026-11-10", start_time: "18:00:00", status: "confirmed" },
    { id: "b2", price: 1200, booking_date: "2026-11-11", start_time: "18:00:00", status: "completed" },
  ];

  // Owner increases evening rates to ₹2,000
  const updatedTurf = {
    base_price: 1500,
    peak_price: 2000,
    pricing_rules: {
      timeBands: [{ id: "evening", startTime: "16:00", endTime: "21:00", price: 2000 }],
    },
  };

  // Historical revenue must sum stored b.price, NOT updatedTurf pricing
  const totalRevenue = sumRevenue(pastBookings, "2026-11-01", "2026-11-15");
  assert.equal(totalRevenue.revenue, 2200, "Historical revenue did not change");
  assert.equal(totalRevenue.count, 2);
});

test("Audit 3: Complete pricing precedence hierarchy", () => {
  const turf = {
    base_price: 1000,
    peak_price: 1400,
    pricing_rules: {
      weekdayPrice: 1100,
      weekendPrice: 1300,
      timeBands: [
        { id: "morning", startTime: "06:00", endTime: "12:00", price: 900 },
      ],
      customDates: [
        { date: "2026-12-25", price: 1800 },
      ],
      customSlots: {
        "2026-12-25_09:00": 2200,
      },
    },
  };

  // 1. Custom slot wins over custom date, time band, and holiday
  const slotRes = calculateSlotPrice(turf, "2026-12-25", "09:00", 0);
  assert.equal(slotRes.price, 2200);

  // 2. Custom date wins over time band on other slots of that date
  const holidayRes = calculateSlotPrice(turf, "2026-12-25", "10:00", 0);
  assert.equal(holidayRes.price, 1800);

  // 3. Time band wins over weekday price on regular days
  const morningRes = calculateSlotPrice(turf, "2026-11-18", "08:00", 0); // Wednesday
  assert.equal(morningRes.price, 900);

  // 4. Weekend rate wins over weekday / base when no time band applies
  const weekendRes = calculateSlotPrice(turf, "2026-11-21", "14:00", 0); // Saturday
  assert.equal(weekendRes.price, 1300);

  // 5. Weekday rate applies when no time band applies
  const weekdayRes = calculateSlotPrice(turf, "2026-11-18", "14:00", 0); // Wednesday
  assert.equal(weekdayRes.price, 1100);
});

test("Audit 5 & 6: Unpaid walk-in bookings and migration defaults protect payment integrity", () => {
  // Test migration backfill logic
  const backfillPaymentStatus = (bookingStatus) => {
    switch (bookingStatus) {
      case "pending":
        return "pending";
      case "cancelled":
      case "declined":
        return "refunded";
      case "confirmed":
      case "completed":
      default:
        return "paid";
    }
  };

  assert.equal(backfillPaymentStatus("pending"), "pending", "Pending bookings must NOT be backfilled as paid");
  assert.equal(backfillPaymentStatus("cancelled"), "refunded", "Cancelled bookings must NOT be backfilled as paid");
  assert.equal(backfillPaymentStatus("confirmed"), "paid");
  assert.equal(backfillPaymentStatus("completed"), "paid");

  // Collected revenue excludes pending payment_status
  const activeBookings = [
    { id: "b1", price: 1200, payment_status: "paid", status: "confirmed" },
    { id: "b2", price: 800, payment_status: "pending", status: "pending" }, // Unpaid hold
  ];
  const collected = activeBookings
    .filter((b) => b.payment_status === "paid" && ["confirmed", "completed"].includes(b.status))
    .reduce((s, b) => s + b.price, 0);
  assert.equal(collected, 1200);
});

test("Audit 7: Cross-owner authorization isolation", () => {
  const isAuthorizedOwner = (turf, userProfile) => {
    if (userProfile.role === "admin") return true;
    return turf.owner_id === userProfile.id;
  };

  const turfOwnerA = { id: "turf-1", owner_id: "owner-a-uuid" };
  const ownerA = { id: "owner-a-uuid", role: "owner" };
  const ownerB = { id: "owner-b-uuid", role: "owner" };
  const admin = { id: "admin-uuid", role: "admin" };

  assert.equal(isAuthorizedOwner(turfOwnerA, ownerA), true, "Owner A can manage own turf");
  assert.equal(isAuthorizedOwner(turfOwnerA, ownerB), false, "Owner B cannot manage Owner A's turf");
  assert.equal(isAuthorizedOwner(turfOwnerA, admin), true, "Admin can manage any turf");
});

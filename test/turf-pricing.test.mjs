import test from "node:test";
import assert from "node:assert/strict";

import {
  isTimeInBand,
  calculateSlotPrice,
  validatePricingRules,
  generateDemandInsights,
} from "../lib/turf/pricing.js";

test("isTimeInBand: handles regular and midnight-crossing time bands", () => {
  assert.equal(isTimeInBand("07:00", "06:00", "12:00"), true);
  assert.equal(isTimeInBand("12:00", "06:00", "12:00"), false); // exclusive end
  assert.equal(isTimeInBand("18:30", "16:00", "21:00"), true);
  // Overnight: 21:00 to 06:00
  assert.equal(isTimeInBand("22:00", "21:00", "06:00"), true);
  assert.equal(isTimeInBand("02:00", "21:00", "06:00"), true);
  assert.equal(isTimeInBand("14:00", "21:00", "06:00"), false);
});

test("calculateSlotPrice: default fallback to base price", () => {
  const turf = { base_price: 1000, peak_price: 1500, pricing_rules: {} };
  const res = calculateSlotPrice(turf, "2026-11-18", "10:00", 20); // Wednesday
  assert.equal(res.price, 1000);
  assert.equal(res.originalPrice, 1000);
  assert.equal(res.ruleApplied, "Base Price");
});

test("calculateSlotPrice: dynamic occupancy surge when > 70%", () => {
  const turf = { base_price: 1000, peak_price: 1400, pricing_rules: {} };
  const res = calculateSlotPrice(turf, "2026-11-18", "10:00", 75);
  assert.equal(res.price, 1400);
  assert.equal(res.isPeak, true);
  assert.ok(res.ruleApplied.includes("High Demand Surge"));
});

test("calculateSlotPrice: time bands take precedence over base price", () => {
  const turf = {
    base_price: 1000,
    peak_price: 1600,
    pricing_rules: {
      timeBands: [
        { id: "morning", label: "Morning Play", startTime: "06:00", endTime: "12:00", price: 850 },
        { id: "evening", label: "Evening Lights", startTime: "16:00", endTime: "21:00", price: 1500 },
      ],
    },
  };
  const morning = calculateSlotPrice(turf, "2026-11-18", "08:00", 10);
  assert.equal(morning.price, 850);
  assert.equal(morning.ruleApplied, "Morning Play");

  const evening = calculateSlotPrice(turf, "2026-11-18", "18:00", 10);
  assert.equal(evening.price, 1500);
  assert.equal(evening.isPeak, true);
});

test("calculateSlotPrice: weekend rate applies on Saturday and Sunday", () => {
  const turf = {
    base_price: 1000,
    peak_price: 1600,
    pricing_rules: {
      weekendPrice: 1350,
    },
  };
  // 2026-11-21 is Saturday, 2026-11-22 is Sunday
  const sat = calculateSlotPrice(turf, "2026-11-21", "14:00", 0);
  assert.equal(sat.price, 1350);
  assert.equal(sat.isWeekend, true);
  assert.equal(sat.ruleApplied, "Weekend Rate");

  // 2026-11-20 is Friday (Weekday)
  const fri = calculateSlotPrice(turf, "2026-11-20", "14:00", 0);
  assert.equal(fri.price, 1000);
  assert.equal(fri.isWeekend, false);
});

test("calculateSlotPrice: custom holiday override takes precedence over time band", () => {
  const turf = {
    base_price: 1000,
    pricing_rules: {
      timeBands: [{ id: "morning", label: "Morning", startTime: "06:00", endTime: "12:00", price: 800 }],
      customDates: [{ date: "2026-12-25", label: "Christmas Day Tournament", price: 2000 }],
    },
  };
  const holiday = calculateSlotPrice(turf, "2026-12-25", "09:00", 10);
  assert.equal(holiday.price, 2000);
  assert.ok(holiday.ruleApplied.includes("Christmas Day Tournament"));
});

test("calculateSlotPrice: exact slot override has highest precedence", () => {
  const turf = {
    base_price: 1000,
    pricing_rules: {
      customDates: [{ date: "2026-12-25", label: "Christmas Day", price: 2000 }],
      customSlots: {
        "2026-12-25_20:00": 2500,
      },
    },
  };
  const exactSlot = calculateSlotPrice(turf, "2026-12-25", "20:00", 10);
  assert.equal(exactSlot.price, 2500);
  assert.ok(exactSlot.ruleApplied.includes("Custom Slot Override"));
});

test("calculateSlotPrice: promotional discount reduces price correctly", () => {
  const turf = {
    base_price: 1000,
    pricing_rules: {
      discountRules: [
        {
          id: "early_bird",
          label: "Early Bird Saver",
          discountPercent: 20,
          startTime: "06:00",
          endTime: "10:00",
          active: true,
        },
      ],
    },
  };
  const discounted = calculateSlotPrice(turf, "2026-11-18", "07:00", 0);
  assert.equal(discounted.originalPrice, 1000);
  assert.equal(discounted.discountAmount, 200);
  assert.equal(discounted.price, 800);
  assert.ok(discounted.discountLabel.includes("-20%"));
});

test("validatePricingRules: validates consistency and rejects peak below base", () => {
  const invalid = validatePricingRules({
    basePrice: 1500,
    peakPrice: 1200, // Peak below base!
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((e) => e.includes("Peak price cannot be lower")));

  const valid = validatePricingRules({
    basePrice: 1200,
    peakPrice: 1600,
    weekendPrice: 1500,
    timeBands: [
      { id: "morning", label: "Morning", startTime: "06:00", endTime: "12:00", price: 1000 },
    ],
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.rules.basePrice, 1200);
  assert.equal(valid.rules.peakPrice, 1600);
});

test("generateDemandInsights: provides actionable recommendations from bookings", () => {
  const bookings = [
    { start_time: "19:00:00", booking_date: "2026-11-21", status: "confirmed" },
    { start_time: "19:00:00", booking_date: "2026-11-22", status: "confirmed" },
    { start_time: "20:00:00", booking_date: "2026-11-21", status: "completed" },
  ];
  const insights = generateDemandInsights(bookings);
  assert.ok(insights.recommendations.length > 0);
  assert.ok(insights.peakHours);
  assert.ok(insights.slowHours);
});

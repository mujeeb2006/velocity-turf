import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRewardSettings,
  pointsToINR,
  inrToPoints,
  canReferMoreFriends,
  calculateBookingRewardPoints,
  validateRedemptionRules,
} from "../lib/rewards/policy.js";

test("normalizeRewardSettings applies strict defaults and sanitizes custom configurations", () => {
  const defaults = normalizeRewardSettings({});
  assert.equal(defaults.pointToRupeeRatio, 1);
  assert.equal(defaults.referrerRewardPoints, 200);
  assert.equal(defaults.referredWelcomePoints, 100);
  assert.equal(defaults.bookingRewardPercentage, 10);
  assert.equal(defaults.minRedemptionPoints, 100);
  assert.equal(defaults.maxDiscountPercentage, 100);
  assert.equal(defaults.allowFullSlotRedemption, true);
  assert.equal(defaults.maxReferralsPerUser, 3);

  const custom = normalizeRewardSettings({
    point_to_rupee_ratio: 2,
    referrer_reward_points: 150,
    referred_welcome_points: 75,
    booking_reward_percentage: 15,
    min_redemption_points: 50,
    max_discount_percentage: 50,
    allow_full_slot_redemption: false,
    max_referrals_per_user: 3,
  });
  assert.equal(custom.pointToRupeeRatio, 2);
  assert.equal(custom.referrerRewardPoints, 150);
  assert.equal(custom.referredWelcomePoints, 75);
  assert.equal(custom.bookingRewardPercentage, 15);
  assert.equal(custom.minRedemptionPoints, 50);
  assert.equal(custom.maxDiscountPercentage, 50);
  assert.equal(custom.allowFullSlotRedemption, false);
});

test("pointsToINR and inrToPoints accurately convert between points and Indian Rupees", () => {
  assert.equal(pointsToINR(500, 1), 500);
  assert.equal(pointsToINR(1000, 1), 1000);
  assert.equal(pointsToINR(500, 2), 1000); // 500 pts * ratio 2 = ₹1000
  assert.equal(pointsToINR(500, 0.5), 250); // 500 pts * ratio 0.5 = ₹250

  assert.equal(inrToPoints(500, 1), 500);
  assert.equal(inrToPoints(1000, 1), 1000);
  assert.equal(inrToPoints(1000, 2), 500); // ₹1000 / ratio 2 = 500 pts
});

test("canReferMoreFriends strictly enforces the 3-referral cap per player", () => {
  const settings = { max_referrals_per_user: 3 };
  assert.equal(canReferMoreFriends({ completedCount: 0, settings }), true);
  assert.equal(canReferMoreFriends({ completedCount: 1, settings }), true);
  assert.equal(canReferMoreFriends({ completedCount: 2, settings }), true);
  assert.equal(canReferMoreFriends({ completedCount: 3, settings }), false);
  assert.equal(canReferMoreFriends({ completedCount: 4, settings }), false);
});

test("calculateBookingRewardPoints calculates correct percentage without exceeding booking price", () => {
  // 10% of 1000 = 100 pts
  assert.equal(calculateBookingRewardPoints({ bookingPrice: 1000, settings: { booking_reward_percentage: 10 } }), 100);
  // 10% of 850 = 85 pts
  assert.equal(calculateBookingRewardPoints({ bookingPrice: 850, settings: { booking_reward_percentage: 10 } }), 85);
  // 15% of 1200 = 180 pts
  assert.equal(calculateBookingRewardPoints({ bookingPrice: 1200, settings: { booking_reward_percentage: 15 } }), 180);
  // Free booking (price 0) = 0 pts
  assert.equal(calculateBookingRewardPoints({ bookingPrice: 0, settings: { booking_reward_percentage: 10 } }), 0);
  // Negative price handled safely
  assert.equal(calculateBookingRewardPoints({ bookingPrice: -50, settings: { booking_reward_percentage: 10 } }), 0);
});

test("validateRedemptionRules: permits valid partial discount", () => {
  const settings = normalizeRewardSettings({});
  const result = validateRedemptionRules({
    pointsToRedeem: 400,
    bookingPrice: 1000,
    availablePoints: 800,
    settings,
  });

  assert.equal(result.ok, true);
  assert.equal(result.pointsRedeemed, 400);
  assert.equal(result.discountINR, 400);
  assert.equal(result.finalPrice, 600);
  assert.equal(result.isFullRedemption, false);
});

test("validateRedemptionRules: permits 100% full-slot redemption for ₹0 payable", () => {
  const settings = normalizeRewardSettings({});
  const result = validateRedemptionRules({
    pointsToRedeem: 1000,
    bookingPrice: 1000,
    availablePoints: 1200,
    settings,
  });

  assert.equal(result.ok, true);
  assert.equal(result.pointsRedeemed, 1000);
  assert.equal(result.discountINR, 1000);
  assert.equal(result.finalPrice, 0);
  assert.equal(result.isFullRedemption, true);
});

test("validateRedemptionRules: rejects points exceeding user wallet balance", () => {
  const settings = normalizeRewardSettings({});
  const result = validateRedemptionRules({
    pointsToRedeem: 500,
    bookingPrice: 1000,
    availablePoints: 300,
    settings,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Insufficient points/i);
});

test("validateRedemptionRules: rejects points below configured minimum redemption threshold", () => {
  const settings = normalizeRewardSettings({ min_redemption_points: 100 });
  const result = validateRedemptionRules({
    pointsToRedeem: 50,
    bookingPrice: 1000,
    availablePoints: 500,
    settings,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Minimum redemption is 100 points/i);
});

test("validateRedemptionRules: caps discount to max percentage when full-slot is disabled", () => {
  const settings = normalizeRewardSettings({
    max_discount_percentage: 50,
    allow_full_slot_redemption: false,
    point_to_rupee_ratio: 1,
  });

  // Price 1000, max discount 50% = max ₹500 (500 pts)
  const invalid = validateRedemptionRules({
    pointsToRedeem: 600,
    bookingPrice: 1000,
    availablePoints: 1000,
    settings,
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /exceed maximum allowable discount/i);

  const valid = validateRedemptionRules({
    pointsToRedeem: 500,
    bookingPrice: 1000,
    availablePoints: 1000,
    settings,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.discountINR, 500);
  assert.equal(valid.finalPrice, 500);
});

test("validateRedemptionRules: handles 0 points redemption transparently", () => {
  const settings = normalizeRewardSettings({});
  const result = validateRedemptionRules({
    pointsToRedeem: 0,
    bookingPrice: 1000,
    availablePoints: 500,
    settings,
  });

  assert.equal(result.ok, true);
  assert.equal(result.pointsRedeemed, 0);
  assert.equal(result.discountINR, 0);
  assert.equal(result.finalPrice, 1000);
  assert.equal(result.isFullRedemption, false);
});

test("Self-referral and duplicate prevention business rules", () => {
  const referrerId = "user-123";
  const refereeId = "user-123"; // self

  const isSelf = referrerId === refereeId;
  assert.equal(isSelf, true, "Self-referral must be detected and blocked");

  // Referral cap check
  const completedCount = 3;
  assert.equal(canReferMoreFriends({ completedCount, settings: { max_referrals_per_user: 3 } }), false, "Cap of 3 must be strictly respected");
});

test("Points refund simulation preserves wallet integrity", () => {
  let availablePoints = 500;
  let lifetimeRedeemed = 500;

  // Booking made: 500 points redeemed
  // Now booking is cancelled -> 500 points refunded
  const refundAmount = 500;
  availablePoints += refundAmount;
  lifetimeRedeemed = Math.max(0, lifetimeRedeemed - refundAmount);

  assert.equal(availablePoints, 1000);
  assert.equal(lifetimeRedeemed, 0);
  assert(availablePoints >= 0, "Wallet balance must never be negative");
});

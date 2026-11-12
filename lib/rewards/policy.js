// lib/rewards/policy.js
// Pure business logic and rules for the unified Referral & Rewards system.

export const DEFAULT_REWARD_SETTINGS = {
  referrerRewardPoints: 200,
  referredWelcomePoints: 100,
  bookingRewardPercentage: 10, // 10%
  pointToRupeeRatio: 1,        // 1 point = ₹1
  minRedemptionPoints: 100,
  maxDiscountPercentage: 100,  // 100% allows full slot redemption
  allowFullSlotRedemption: true,
  maxReferralsPerUser: 3,
};

/**
 * Normalizes DB column naming from snake_case to camelCase
 */
export function normalizeRewardSettings(raw = {}) {
  return {
    referrerRewardPoints: Number(raw.referrer_reward_points ?? raw.referrerRewardPoints ?? DEFAULT_REWARD_SETTINGS.referrerRewardPoints),
    referredWelcomePoints: Number(raw.referred_welcome_points ?? raw.referredWelcomePoints ?? DEFAULT_REWARD_SETTINGS.referredWelcomePoints),
    bookingRewardPercentage: Number(raw.booking_reward_percentage ?? raw.bookingRewardPercentage ?? DEFAULT_REWARD_SETTINGS.bookingRewardPercentage),
    pointToRupeeRatio: Number(raw.point_to_rupee_ratio ?? raw.pointToRupeeRatio ?? DEFAULT_REWARD_SETTINGS.pointToRupeeRatio),
    minRedemptionPoints: Number(raw.min_redemption_points ?? raw.minRedemptionPoints ?? DEFAULT_REWARD_SETTINGS.minRedemptionPoints),
    maxDiscountPercentage: Number(raw.max_discount_percentage ?? raw.maxDiscountPercentage ?? DEFAULT_REWARD_SETTINGS.maxDiscountPercentage),
    allowFullSlotRedemption: Boolean(raw.allow_full_slot_redemption ?? raw.allowFullSlotRedemption ?? DEFAULT_REWARD_SETTINGS.allowFullSlotRedemption),
    maxReferralsPerUser: Number(raw.max_referrals_per_user ?? raw.maxReferralsPerUser ?? DEFAULT_REWARD_SETTINGS.maxReferralsPerUser),
  };
}

/**
 * Calculates discount in INR from points based on the point-to-rupee ratio.
 */
export function pointsToINR(points, ratio = 1) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));
  const safeRatio = Math.max(0.01, Number(ratio) || 1);
  return Math.round(safePoints * safeRatio * 100) / 100;
}

/**
 * Calculates points required for a target INR amount.
 */
export function inrToPoints(amount, ratio = 1) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const safeRatio = Math.max(0.01, Number(ratio) || 1);
  return Math.ceil(safeAmount / safeRatio);
}

/**
 * Calculates booking reward points earned upon completed booking.
 */
export function calculateBookingRewardPoints({ bookingPrice, settings }) {
  const s = normalizeRewardSettings(settings);
  const price = Math.max(0, Number(bookingPrice) || 0);
  return Math.floor((price * s.bookingRewardPercentage) / 100);
}

/**
 * Determines whether a player has room to refer another friend (capped at maxReferralsPerUser, default 3).
 */
export function canReferMoreFriends({ completedCount = 0, registeredCount = 0, settings }) {
  const s = normalizeRewardSettings(settings);
  const total = Number(completedCount) || 0;
  return total < s.maxReferralsPerUser;
}

/**
 * Validates and calculates points redemption for a booking.
 */
export function validateRedemptionRules({ pointsToRedeem, bookingPrice, availablePoints, settings }) {
  const s = normalizeRewardSettings(settings);
  const price = Math.max(0, Number(bookingPrice) || 0);
  const balance = Math.max(0, Math.floor(Number(availablePoints) || 0));
  const points = Math.max(0, Math.floor(Number(pointsToRedeem) || 0));

  if (points === 0) {
    return { ok: true, pointsRedeemed: 0, discountINR: 0, finalPrice: price, isFullRedemption: false };
  }

  // 1. Balance check
  if (points > balance) {
    return { ok: false, error: `Insufficient points. You requested ${points} pts, but only ${balance} pts are available.` };
  }

  // 2. Minimum redemption threshold
  if (points < s.minRedemptionPoints) {
    return { ok: false, error: `Minimum redemption is ${s.minRedemptionPoints} points.` };
  }

  // 3. Calculate max allowable discount based on percentage cap
  const maxDiscountAllowedINR = s.allowFullSlotRedemption
    ? price
    : Math.floor((price * s.maxDiscountPercentage) / 100);

  const maxPointsAllowed = inrToPoints(maxDiscountAllowedINR, s.pointToRupeeRatio);

  if (points > maxPointsAllowed) {
    return {
      ok: false,
      error: `Points exceed maximum allowable discount of ₹${maxDiscountAllowedINR} (${maxPointsAllowed} pts).`,
    };
  }

  // 4. Calculate actual discount in INR
  const rawDiscount = pointsToINR(points, s.pointToRupeeRatio);
  const discountINR = Math.min(price, rawDiscount);
  const finalPrice = Math.max(0, price - discountINR);
  const isFullRedemption = finalPrice === 0 && price > 0;

  return {
    ok: true,
    pointsRedeemed: points,
    discountINR,
    finalPrice,
    isFullRedemption,
  };
}


// lib/package/policy.js
// Business rules, validations, and accounting policies for Subscription Passes & Sports Packages.

import { createHash } from "crypto";
import { SPORT_OPTIONS } from "../sports.js";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates package creation / configuration by admins.
 */
export function validatePackageConfig({
  name,
  description = "",
  price,
  totalSessions,
  validityDays,
  eligibleSports = [],
  eligibleTurfs = [],
  maxSessionsPerDay = null,
  restrictions = {},
}) {
  const cleanName = String(name || "").trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    return { ok: false, error: "Package name must be between 2 and 80 characters." };
  }

  const numPrice = Number(price);
  if (!Number.isFinite(numPrice) || numPrice < 0) {
    return { ok: false, error: "Price must be a non-negative number." };
  }

  const numSessions = Number(totalSessions);
  if (!Number.isInteger(numSessions) || numSessions <= 0 || numSessions > 100) {
    return { ok: false, error: "Total sessions must be an integer between 1 and 100." };
  }

  const numDays = Number(validityDays);
  if (!Number.isInteger(numDays) || numDays <= 0 || numDays > 365) {
    return { ok: false, error: "Validity must be an integer between 1 and 365 days." };
  }

  // Validate sports if provided
  const validSports = Array.isArray(eligibleSports)
    ? eligibleSports.filter((s) => SPORT_OPTIONS.includes(s))
    : [];

  const maxPerDay = maxSessionsPerDay ? Number(maxSessionsPerDay) : null;
  if (maxPerDay !== null && (!Number.isInteger(maxPerDay) || maxPerDay <= 0)) {
    return { ok: false, error: "Max sessions per day must be a positive integer if specified." };
  }

  return {
    ok: true,
    data: {
      name: cleanName,
      description: String(description || "").trim().slice(0, 500),
      price: numPrice,
      totalSessions: numSessions,
      validityDays: numDays,
      eligibleSports: validSports,
      eligibleTurfs: Array.isArray(eligibleTurfs) ? eligibleTurfs.filter((id) => UUID_PATTERN.test(id)) : [],
      maxSessionsPerDay: maxPerDay,
      restrictions: typeof restrictions === "object" && restrictions !== null ? restrictions : {},
      isActive: true,
    },
  };
}

/**
 * Builds authoritative payment order for a package pass purchase.
 */
export function buildPackagePaymentOrder({ pkg, user, idempotencyKey = null }) {
  if (!pkg || !pkg.id) {
    throw new Error("Invalid package record.");
  }
  if (!user || !user.id) {
    throw new Error("Invalid user record.");
  }

  const authoritativePrice = Number(pkg.price ?? 0);
  const hashSeed = `pkg:${pkg.id}:${user.id}:${idempotencyKey || Date.now()}`;
  const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
  const transactionReference = `VT-PKG-${refSuffix}`;

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    totalSessions: pkg.total_sessions,
    validityDays: pkg.validity_days,
    userId: user.id,
    userName: user.full_name || "Player",
    amount: authoritativePrice,
    totalPayable: authoritativePrice,
    transactionReference,
    paymentMethod: "demo_simulated",
    isSimulated: true,
    notice: "Demo Checkout: Sports packages recorded in simulated demo mode.",
  };
}

/**
 * Validates whether a user's package can be redeemed for a specific booking.
 */
export function validatePackageRedemption({
  userPackage,
  bookingDate,
  sport,
  turfId,
  isPeak = false,
  now = new Date(),
}) {
  if (!userPackage || !userPackage.id) {
    return { ok: false, error: "No active package found." };
  }

  if (userPackage.status !== "active") {
    return {
      ok: false,
      error: userPackage.status === "exhausted"
        ? "All sessions on this pass have been consumed."
        : "This pass is no longer active.",
    };
  }

  if (Number(userPackage.remaining_sessions) <= 0) {
    return { ok: false, error: "Zero sessions remaining on this pass." };
  }

  if (new Date(userPackage.expires_at) <= now) {
    return { ok: false, error: "This sports pass has expired." };
  }

  const pkg = userPackage.package || {};

  // Check sport eligibility
  if (Array.isArray(pkg.eligible_sports) && pkg.eligible_sports.length > 0 && sport) {
    if (!pkg.eligible_sports.includes(sport)) {
      return {
        ok: false,
        error: `This pass only applies to: ${pkg.eligible_sports.join(", ")}. It cannot be used for ${sport}.`,
      };
    }
  }

  // Check turf eligibility
  if (Array.isArray(pkg.eligible_turfs) && pkg.eligible_turfs.length > 0 && turfId) {
    if (!pkg.eligible_turfs.includes(turfId)) {
      return { ok: false, error: "This pass is not valid at the selected turf venue." };
    }
  }

  // Check off-peak restriction
  if (pkg.restrictions?.off_peak_only && isPeak) {
    return { ok: false, error: "This pass is restricted to off-peak hours only." };
  }

  return { ok: true };
}

/**
 * Calculates refund/credit restoration when a booking paid via pass is cancelled.
 */
export function calculatePackageRefundEligibility({
  userPackage,
  bookingDate,
  startTime,
  now = new Date(),
}) {
  if (!userPackage || !userPackage.id) {
    return { canRefund: false, reason: "No associated package found." };
  }

  // Check if session has already started or ended
  const sessionDateTime = new Date(`${bookingDate}T${startTime}`);
  if (now >= sessionDateTime) {
    return { canRefund: false, reason: "Cannot refund a session after the booked start time." };
  }

  // Check if user package has passed its overall expiration date
  if (new Date(userPackage.expires_at) < now) {
    return { canRefund: false, reason: "The pass used for this booking has expired." };
  }

  return { canRefund: true };
}

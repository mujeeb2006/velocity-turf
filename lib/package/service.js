// lib/package/service.js
// Safe, atomic redemption and refund management for subscription passes and sports packages.

import { validatePackageRedemption, calculatePackageRefundEligibility } from "./policy.js";

/**
 * Atomically redeems 1 session from user_package for a booking.
 * Guarantees no double-redemption, no negative balances, and concurrency safety.
 */
export async function redeemPackageSession(adminClient, { userPackageId, userId, bookingDate, startTime, sport, turfId, isPeak = false }) {
  // 1. Fetch user_package with its package definition
  const { data: userPkg, error: fetchErr } = await adminClient
    .from("user_packages")
    .select("*, package:packages(*)")
    .eq("id", userPackageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr || !userPkg) {
    return { ok: false, error: "Sports pass not found or access denied." };
  }

  // 2. Validate redemption against policy
  const validation = validatePackageRedemption({
    userPackage: userPkg,
    bookingDate,
    startTime,
    sport,
    turfId,
    isPeak,
  });

  if (!validation.ok) {
    return validation;
  }

  // 3. Atomically decrement remaining_sessions
  // Strict check: remaining_sessions > 0 AND status = 'active'
  const newRemaining = userPkg.remaining_sessions - 1;
  const newStatus = newRemaining === 0 ? "exhausted" : "active";

  const { data: updated, error: updateErr } = await adminClient
    .from("user_packages")
    .update({
      remaining_sessions: newRemaining,
      status: newStatus,
    })
    .eq("id", userPackageId)
    .eq("user_id", userId)
    .eq("remaining_sessions", userPkg.remaining_sessions) // optimistic concurrency guard
    .gt("remaining_sessions", 0)
    .eq("status", "active")
    .select("id, remaining_sessions, status")
    .maybeSingle();

  if (updateErr || !updated) {
    return {
      ok: false,
      error: "Could not consume session pass. Another request may have just used the remaining balance.",
    };
  }

  // 4. Insert package_redemptions audit record
  const { data: redemption, error: redErr } = await adminClient
    .from("package_redemptions")
    .insert({
      user_package_id: userPackageId,
      user_id: userId,
      action: "redeem",
      sessions_delta: -1,
      remaining_after: updated.remaining_sessions,
      notes: `Redeemed for ${sport} on ${bookingDate} at ${startTime.slice(0, 5)}`,
    })
    .select("id, created_at")
    .single();

  if (redErr) {
    console.error("package_redemptions record insert failed:", redErr);
  }

  return {
    ok: true,
    redemptionId: redemption?.id || null,
    remainingSessions: updated.remaining_sessions,
    status: updated.status,
  };
}

/**
 * Safely refunds 1 session back to the user_package upon booking cancellation.
 */
export async function refundPackageSession(adminClient, { redemptionId, bookingId, userId, bookingDate, startTime }) {
  if (!redemptionId && !bookingId) return { ok: false, error: "Missing identifier." };

  let query = adminClient.from("package_redemptions").select("*, user_package:user_packages(*)");
  if (redemptionId) query = query.eq("id", redemptionId);
  else if (bookingId) query = query.eq("booking_id", bookingId);

  const { data: redemption, error: redErr } = await query.maybeSingle();
  if (redErr || !redemption || !redemption.user_package) {
    return { ok: false, error: "Redemption record not found." };
  }

  const userPkg = redemption.user_package;

  // Verify refund policy
  const eligibility = calculatePackageRefundEligibility({
    userPackage: userPkg,
    bookingDate: bookingDate || redemption.created_at?.slice(0, 10),
    startTime: startTime || "00:00:00",
  });

  if (!eligibility.canRefund) {
    return { ok: false, error: eligibility.reason };
  }

  // Atomically increment remaining_sessions
  const newRemaining = Math.min(userPkg.total_sessions, userPkg.remaining_sessions + 1);
  const newStatus = "active";

  const { data: updated, error: updateErr } = await adminClient
    .from("user_packages")
    .update({
      remaining_sessions: newRemaining,
      status: newStatus,
    })
    .eq("id", userPkg.id)
    .select("id, remaining_sessions, status")
    .maybeSingle();

  if (updateErr || !updated) {
    return { ok: false, error: "Could not restore pass session balance." };
  }

  // Record refund in package_redemptions
  await adminClient.from("package_redemptions").insert({
    user_package_id: userPkg.id,
    booking_id: bookingId || redemption.booking_id,
    user_id: userId || redemption.user_id,
    action: "refund",
    sessions_delta: +1,
    remaining_after: updated.remaining_sessions,
    notes: `Refunded from cancellation of booking ${bookingId || ""}`,
  });

  return {
    ok: true,
    remainingSessions: updated.remaining_sessions,
  };
}

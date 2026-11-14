// lib/rewards/service.js
// Database service for unified Referral & Reward Points System.

import {
  DEFAULT_REWARD_SETTINGS,
  normalizeRewardSettings,
  validateRedemptionRules,
  calculateBookingRewardPoints,
} from "./policy.js";
import { logger } from "@/lib/logger";

/**
 * Fetch reward settings, fallback to defaults if not configured
 */
export async function getRewardSettings(admin) {
  try {
    const { data, error } = await admin
      .from("reward_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_REWARD_SETTINGS;
    }
    return normalizeRewardSettings(data);
  } catch (err) {
    logger.error("Failed to fetch reward settings", {}, err);
    return DEFAULT_REWARD_SETTINGS;
  }
}

/**
 * Update reward settings (Admin only)
 */
export async function updateRewardSettings(admin, updates, adminId) {
  const payload = {
    referrer_reward_points: Math.max(0, parseInt(updates.referrerRewardPoints ?? updates.referrer_reward_points, 10) || 0),
    referred_welcome_points: Math.max(0, parseInt(updates.referredWelcomePoints ?? updates.referred_welcome_points, 10) || 0),
    booking_reward_percentage: Math.min(100, Math.max(0, parseFloat(updates.bookingRewardPercentage ?? updates.booking_reward_percentage) || 0)),
    point_to_rupee_ratio: Math.max(0.01, parseFloat(updates.pointToRupeeRatio ?? updates.point_to_rupee_ratio) || 1),
    min_redemption_points: Math.max(0, parseInt(updates.minRedemptionPoints ?? updates.min_redemption_points, 10) || 0),
    max_discount_percentage: Math.min(100, Math.max(0, parseFloat(updates.maxDiscountPercentage ?? updates.max_discount_percentage) || 100)),
    allow_full_slot_redemption: Boolean(updates.allowFullSlotRedemption ?? updates.allow_full_slot_redemption),
    max_referrals_per_user: Math.max(1, parseInt(updates.maxReferralsPerUser ?? updates.max_referrals_per_user, 10) || 3),
    updated_at: new Date().toISOString(),
    updated_by: adminId || null,
  };

  const { data, error } = await admin
    .from("reward_settings")
    .upsert({ id: 1, ...payload })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to update reward settings");
  }
  return normalizeRewardSettings(data);
}

/**
 * Fetch or auto-create a user's reward wallet
 */
export async function getOrCreateWallet(admin, userId) {
  if (!userId) return null;

  const { data: existing } = await admin
    .from("reward_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await admin
    .from("reward_wallets")
    .insert({
      user_id: userId,
      available_points: 0,
      lifetime_earned: 0,
      lifetime_redeemed: 0,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();

  if (error && error.code === "23505") {
    // Concurrent insert race — re-fetch
    const { data: raced } = await admin
      .from("reward_wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return raced;
  }

  return created;
}

/**
 * Get full wallet status with transaction history for a player
 */
export async function getPlayerWalletSummary(admin, userId) {
  if (!userId) {
    return {
      wallet: {
        availablePoints: 0,
        available_points: 0,
        pendingPoints: 0,
        pending_points: 0,
        lifetimeEarned: 0,
        lifetime_earned: 0,
        lifetimeRedeemed: 0,
        lifetime_redeemed: 0,
        inrValue: 0,
        equivalent_inr: 0,
      },
      settings: DEFAULT_REWARD_SETTINGS,
      transactions: [],
    };
  }

  const [wallet, settings] = await Promise.all([
    getOrCreateWallet(admin, userId),
    getRewardSettings(admin),
  ]);

  const { data: rawTransactions } = await admin
    .from("reward_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const availablePoints = wallet?.available_points || 0;
  const ratio = Number(settings?.pointToRupeeRatio ?? settings?.point_to_rupee_ratio ?? 1);
  const inrValue = Math.round(availablePoints * ratio * 100) / 100;

  return {
    wallet: {
      availablePoints,
      available_points: availablePoints,
      pendingPoints: wallet?.pending_points || 0,
      pending_points: wallet?.pending_points || 0,
      lifetimeEarned: wallet?.lifetime_earned || 0,
      lifetime_earned: wallet?.lifetime_earned || 0,
      lifetimeRedeemed: wallet?.lifetime_redeemed || 0,
      lifetime_redeemed: wallet?.lifetime_redeemed || 0,
      inrValue,
      equivalent_inr: inrValue,
    },
    settings,
    transactions,
  };
}

/**
 * Get a player's referral state: code, link, slots, and stats
 */
export async function getPlayerReferralSummary(admin, userId, origin = "") {
  if (!userId) {
    return {
      referralCode: "",
      referralLink: "",
      maxReferrals: 3,
      maxAllowed: 3,
      completedCount: 0,
      totalCompleted: 0,
      totalCount: 0,
      isLimitReached: false,
      slots: [],
      settings: DEFAULT_REWARD_SETTINGS,
    };
  }

  // 1. Fetch profile to get unique referral_code
  let { data: profile } = await admin
    .from("profiles")
    .select("id, referral_code, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  let referralCode = profile?.referral_code || "";
  if (!referralCode) {
    try {
      const { data: newCode } = await admin.rpc("generate_unique_referral_code");
      referralCode = newCode || `VT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await admin.from("profiles").update({ referral_code: referralCode }).eq("id", userId);
    } catch {
      referralCode = referralCode || `VT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
  }

  const settings = await getRewardSettings(admin);
  const maxReferrals = settings.maxReferralsPerUser || 3;

  // 2. Fetch referrals where user is the referrer
  const { data: rawReferrals } = await admin
    .from("referrals")
    .select("id, status, created_at, completed_at, referrer_points_awarded, referred:referred_id(id, full_name, email)")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: true });

  const referralRows = Array.isArray(rawReferrals) ? rawReferrals : [];
  const completedCount = referralRows.filter((r) => r.status === "completed").length;
  const totalCount = referralRows.length;

  // Build the 3 referral slots
  const slots = [];
  for (let i = 0; i < maxReferrals; i++) {
    const ref = referralRows[i];
    if (!ref) {
      slots.push({
        slotNumber: i + 1,
        status: "empty", // 1. Friend invited
        friendName: null,
        pointsAwarded: 0,
        completedAt: null,
      });
    } else if (ref.status === "completed") {
      slots.push({
        slotNumber: i + 1,
        status: "completed", // 3. First booking completed / Reward credited
        friendName: ref.referred?.full_name || (ref.referred?.email ? ref.referred.email.split("@")[0] : null) || "Friend",
        pointsAwarded: ref.referrer_points_awarded || settings.referrerRewardPoints,
        completedAt: ref.completed_at,
      });
    } else {
      slots.push({
        slotNumber: i + 1,
        status: "registered", // 2. Friend registered (awaiting booking)
        friendName: ref.referred?.full_name || (ref.referred?.email ? ref.referred.email.split("@")[0] : null) || "Friend",
        pointsAwarded: 0,
        completedAt: null,
      });
    }
  }

  const referralLink = `${origin || ""}/signup?ref=${encodeURIComponent(referralCode)}`;

  return {
    referralCode,
    referralLink,
    maxReferrals,
    maxAllowed: maxReferrals,
    completedCount,
    totalCompleted: completedCount,
    totalCount,
    isLimitReached: completedCount >= maxReferrals,
    slots,
    settings,
  };
}

/**
 * Process referral code during new user registration
 */
export async function registerReferralOnSignup(admin, { newUserId, referralCode }) {
  if (!newUserId || !referralCode) return { success: false, reason: "missing_inputs" };

  const cleanCode = String(referralCode).trim().toUpperCase();

  // Find referring user
  const { data: referrer } = await admin
    .from("profiles")
    .select("id, referral_code, role")
    .eq("referral_code", cleanCode)
    .maybeSingle();

  if (!referrer) {
    return { success: false, reason: "invalid_code" };
  }

  if (referrer.id === newUserId) {
    return { success: false, reason: "self_referral_blocked" };
  }

  const settings = await getRewardSettings(admin);

  // Check how many completed or active referrals referrer has
  const { count: existingCount } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrer.id)
    .eq("status", "completed");

  if ((existingCount || 0) >= settings.maxReferralsPerUser) {
    return { success: false, reason: "referrer_limit_reached" };
  }

  // Update referred user's profile with referred_by
  await admin
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", newUserId);

  // Insert into referrals table
  const { data: referral, error: refError } = await admin
    .from("referrals")
    .insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      referral_code: cleanCode,
      status: "registered",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (refError) {
    logger.warn("Could not record referral attribution", { newUserId, referrerId: referrer.id, code: cleanCode }, refError);
    return { success: false, reason: "duplicate_or_error" };
  }

  return { success: true, referralId: referral?.id, referrerId: referrer.id };
}

/**
 * Deducts points atomically during booking creation
 */
export async function redeemPointsForBooking(admin, { userId, pointsToRedeem, bookingPrice }) {
  const points = Math.max(0, Math.floor(Number(pointsToRedeem) || 0));
  if (points === 0) {
    return { ok: true, pointsRedeemed: 0, discountINR: 0, finalPrice: bookingPrice };
  }

  const [wallet, settings] = await Promise.all([
    getOrCreateWallet(admin, userId),
    getRewardSettings(admin),
  ]);

  const validation = validateRedemptionRules({
    pointsToRedeem: points,
    bookingPrice,
    availablePoints: wallet?.available_points || 0,
    settings,
  });

  if (!validation.ok) {
    return validation;
  }

  // Optimistic atomic update on wallet
  const newBalance = wallet.available_points - validation.pointsRedeemed;
  const newLifetimeRedeemed = (wallet.lifetime_redeemed || 0) + validation.pointsRedeemed;

  const { data: updated, error: updateErr } = await admin
    .from("reward_wallets")
    .update({
      available_points: newBalance,
      lifetime_redeemed: newLifetimeRedeemed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("available_points", wallet.available_points) // concurrency check
    .gte("available_points", validation.pointsRedeemed)
    .select("available_points")
    .maybeSingle();

  if (updateErr || !updated) {
    return {
      ok: false,
      error: "Could not apply points discount. Points balance was modified by another transaction.",
    };
  }

  return {
    ok: true,
    pointsRedeemed: validation.pointsRedeemed,
    discountINR: validation.discountINR,
    finalPrice: validation.finalPrice,
    balanceAfter: updated.available_points,
  };
}

/**
 * Records the transaction log entry for booking redemption
 */
export async function logRedemptionTransaction(admin, { userId, bookingId, pointsRedeemed, discountINR, balanceAfter }) {
  if (!pointsRedeemed || pointsRedeemed <= 0) return;

  await admin.from("reward_transactions").insert({
    user_id: userId,
    points: -pointsRedeemed,
    balance_after: balanceAfter,
    type: "redemption",
    status: "completed",
    description: `Redeemed ${pointsRedeemed} pts for ₹${discountINR} booking discount`,
    reference_id: bookingId,
    metadata: { bookingId, discountINR },
    created_at: new Date().toISOString(),
  });
}

/**
 * Refunds redeemed points back to wallet if an eligible booking is cancelled or declined
 */
export async function refundBookingPoints(admin, { bookingId, userId }) {
  if (!bookingId || !userId) return { refunded: false };

  // 1. Fetch booking to see if points were redeemed
  const { data: booking } = await admin
    .from("bookings")
    .select("id, points_redeemed, discount_amount, player_id")
    .eq("id", bookingId)
    .maybeSingle();

  const pointsToRefund = booking?.points_redeemed || 0;
  if (pointsToRefund <= 0) return { refunded: false, points: 0 };

  // 2. Prevent duplicate refunds by checking if a refund transaction already exists for this booking
  const { data: existingRefund } = await admin
    .from("reward_transactions")
    .select("id")
    .eq("reference_id", bookingId)
    .eq("type", "refund")
    .maybeSingle();

  if (existingRefund) {
    return { refunded: false, alreadyRefunded: true };
  }

  // 3. Atomically credit points back
  const wallet = await getOrCreateWallet(admin, userId);
  const newBalance = wallet.available_points + pointsToRefund;
  const newLifetimeRedeemed = Math.max(0, (wallet.lifetime_redeemed || 0) - pointsToRefund);

  await admin
    .from("reward_wallets")
    .update({
      available_points: newBalance,
      lifetime_redeemed: newLifetimeRedeemed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // 4. Log refund transaction
  await admin.from("reward_transactions").insert({
    user_id: userId,
    points: pointsToRefund,
    balance_after: newBalance,
    type: "refund",
    status: "completed",
    description: `Refunded ${pointsToRefund} pts from cancelled booking`,
    reference_id: bookingId,
    metadata: { bookingId, discountINR: booking.discount_amount },
    created_at: new Date().toISOString(),
  });

  return { refunded: true, points: pointsToRefund };
}

/**
 * Post-booking rewards processor:
 * 1. Credits booking reward points to the player.
 * 2. If player was referred and this is their first completed booking, completes the referral
 *    and credits points to BOTH the referrer and the referred user.
 */
export async function processBookingRewardAndReferralCompletion(admin, { bookingId, userId, bookingPrice }) {
  try {
    const settings = await getRewardSettings(admin);

    // 1. Credit booking reward points
    const bookingPoints = calculateBookingRewardPoints({ bookingPrice, settings });
    if (bookingPoints > 0) {
      const wallet = await getOrCreateWallet(admin, userId);
      const newBalance = wallet.available_points + bookingPoints;
      const newLifetime = wallet.lifetime_earned + bookingPoints;

      await admin
        .from("reward_wallets")
        .update({
          available_points: newBalance,
          lifetime_earned: newLifetime,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await admin.from("reward_transactions").insert({
        user_id: userId,
        points: bookingPoints,
        balance_after: newBalance,
        type: "booking_reward",
        status: "completed",
        description: `Earned ${bookingPoints} reward points for booking`,
        reference_id: bookingId,
        metadata: { bookingId, bookingPrice },
        created_at: new Date().toISOString(),
      });
    }

    // 2. Check if this user has an open referral waiting for first booking completion
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id, referred_id, status")
      .eq("referred_id", userId)
      .eq("status", "registered")
      .maybeSingle();

    if (referral) {
      // Verify this is the user's first confirmed booking
      const { count: priorBookingsCount } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("player_id", userId)
        .in("status", ["confirmed", "completed"])
        .neq("id", bookingId);

      if ((priorBookingsCount || 0) === 0) {
        // Complete referral
        const referrerPoints = settings.referrerRewardPoints;
        const referredPoints = settings.referredWelcomePoints;

        // Atomically complete referral record
        await admin
          .from("referrals")
          .update({
            status: "completed",
            qualifying_booking_id: bookingId,
            referrer_points_awarded: referrerPoints,
            referred_points_awarded: referredPoints,
            completed_at: new Date().toISOString(),
          })
          .eq("id", referral.id);

        // Credit referrer
        if (referrerPoints > 0) {
          const referrerWallet = await getOrCreateWallet(admin, referral.referrer_id);
          const refNewBal = referrerWallet.available_points + referrerPoints;
          const refNewEarn = referrerWallet.lifetime_earned + referrerPoints;

          await admin
            .from("reward_wallets")
            .update({
              available_points: refNewBal,
              lifetime_earned: refNewEarn,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", referral.referrer_id);

          await admin.from("reward_transactions").insert({
            user_id: referral.referrer_id,
            points: referrerPoints,
            balance_after: refNewBal,
            type: "referral_bonus",
            status: "completed",
            description: `Referral bonus: Your friend completed their first booking!`,
            reference_id: referral.id,
            metadata: { referredUserId: userId, bookingId },
            created_at: new Date().toISOString(),
          });
        }

        // Credit referred user (welcome bonus)
        if (referredPoints > 0) {
          const userWallet = await getOrCreateWallet(admin, userId);
          const userNewBal = userWallet.available_points + referredPoints;
          const userNewEarn = userWallet.lifetime_earned + referredPoints;

          await admin
            .from("reward_wallets")
            .update({
              available_points: userNewBal,
              lifetime_earned: userNewEarn,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          await admin.from("reward_transactions").insert({
            user_id: userId,
            points: referredPoints,
            balance_after: userNewBal,
            type: "welcome_bonus",
            status: "completed",
            description: `Welcome bonus for joining via referral and booking your first match!`,
            reference_id: referral.id,
            metadata: { referrerId: referral.referrer_id, bookingId },
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    logger.error("Error processing booking rewards/referral", { bookingId, userId }, err);
  }
}

/**
 * Admin manual adjustment of a user's points balance with mandatory reason
 */
export async function adminAdjustPoints(admin, { userId, pointsDelta, reason, adminId }) {
  const delta = parseInt(pointsDelta, 10);
  if (!delta || delta === 0) throw new Error("Points adjustment cannot be zero");
  if (!reason || !reason.trim()) throw new Error("A reason is mandatory for manual adjustments");

  const wallet = await getOrCreateWallet(admin, userId);
  const newBalance = wallet.available_points + delta;
  if (newBalance < 0) {
    throw new Error(`Cannot deduct ${Math.abs(delta)} points. User only has ${wallet.available_points} available.`);
  }

  const newEarned = delta > 0 ? wallet.lifetime_earned + delta : wallet.lifetime_earned;

  await admin
    .from("reward_wallets")
    .update({
      available_points: newBalance,
      lifetime_earned: newEarned,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  const { data: tx } = await admin
    .from("reward_transactions")
    .insert({
      user_id: userId,
      points: delta,
      balance_after: newBalance,
      type: "admin_adjustment",
      status: "completed",
      description: `Manual adjustment by admin: ${reason.trim()}`,
      reference_id: adminId || "admin",
      metadata: { adminId, reason: reason.trim() },
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  return { success: true, balanceAfter: newBalance, transaction: tx };
}


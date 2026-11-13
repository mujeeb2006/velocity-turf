// lib/group/policy.js
// Pure business logic and mathematical rules for Group Booking and Bill Split.

export const SPLIT_MODES = {
  EQUAL: "equal",
  CUSTOM: "custom",
  LEADER_PAYS: "leader_pays",
};

export const PAYMENT_MODES = {
  ALL_OR_NOTHING: "all_or_nothing",
  LEADER_IMMEDIATE: "leader_immediate",
};

export const GROUP_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export const PARTICIPANT_STATUSES = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  REFUND_INITIATED: "refund_initiated",
};

// Default temporary hold deadline: 10 minutes
export const DEFAULT_PAYMENT_DEADLINE_MINUTES = 10;
export const DEFAULT_REMINDER_MINUTES_BEFORE_DEADLINE = 3;

/**
 * Normalizes parameters passed as either (arg1, arg2) or ({ key1, key2 })
 */
function normalizeSplitArgs(arg1, arg2) {
  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    return {
      totalPrice: Number(arg1.totalPrice),
      participantCount: Number(arg1.participantCount),
    };
  }
  return {
    totalPrice: Number(arg1),
    participantCount: Number(arg2),
  };
}

/**
 * Calculates equal split shares ensuring the sum exactly matches the total price.
 * Extra remainder units are distributed to the first R members.
 */
export function calculateEqualSplit(arg1, arg2) {
  const { totalPrice, participantCount } = normalizeSplitArgs(arg1, arg2);

  if (!totalPrice || totalPrice <= 0) {
    throw new Error("Total price must be greater than 0");
  }
  if (!participantCount || participantCount < 2) {
    throw new Error("Group booking requires at least 2 participants");
  }
  if (participantCount > 50) {
    throw new Error("Maximum 50 participants allowed per group booking");
  }

  const price = Math.round(totalPrice * 100) / 100;
  const count = Math.floor(participantCount);

  // In INR integers (paise)
  const totalCents = Math.round(price * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents % count;

  const shares = [];
  for (let i = 0; i < count; i++) {
    const shareCents = baseCents + (i < remainderCents ? 1 : 0);
    shares.push(shareCents / 100);
  }

  return shares;
}

/**
 * Validates custom split shares.
 * Returns { ok: boolean, valid: boolean, error?: string, totalShare: number, totalAssigned: number }
 */
export function validateCustomSplit(arg1, arg2) {
  let price = 0;
  let sharesList = [];

  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    price = Number(arg1.totalPrice);
    sharesList = arg1.shares || [];
  } else {
    price = Number(arg1);
    sharesList = arg2 || [];
  }

  price = Math.max(0, Math.round(price * 100) / 100);

  if (!Array.isArray(sharesList) || sharesList.length === 0) {
    return { ok: false, valid: false, error: "Participant shares list is required." };
  }

  let totalCents = 0;
  for (let i = 0; i < sharesList.length; i++) {
    const item = sharesList[i];
    const val = typeof item === "object" && item !== null ? Number(item.share) : Number(item);
    if (Number.isNaN(val) || val < 0) {
      return {
        ok: false,
        valid: false,
        error: `Share for participant #${i + 1} must be non-negative.`,
      };
    }
    totalCents += Math.round(val * 100);
  }

  const expectedCents = Math.round(price * 100);
  if (totalCents !== expectedCents) {
    const diff = (totalCents - expectedCents) / 100;
    return {
      ok: false,
      valid: false,
      error: `Total allocated shares (₹${totalCents / 100}) must equal booking total (₹${price}). Difference: ₹${Math.abs(diff)}.`,
      totalShare: totalCents / 100,
      totalAssigned: totalCents / 100,
    };
  }

  return { ok: true, valid: true, totalShare: price, totalAssigned: price };
}

/**
 * Calculates leader-pays shares (leader pays 100%, others pay 0).
 */
export function calculateLeaderPaysSplit(arg1, arg2) {
  const { totalPrice, participantCount } = normalizeSplitArgs(arg1, arg2);
  const price = Math.max(0, Math.round(totalPrice * 100) / 100);
  const count = Math.max(1, Math.floor(participantCount || 1));

  const shares = [price];
  for (let i = 1; i < count; i++) {
    shares.push(0);
  }
  return shares;
}

/**
 * Computes live group summary from participants and transactions.
 * Supports calculateGroupPaymentSummary({ groupBooking, participants })
 * or calculateGroupPaymentSummary(totalPriceOrGroup, participants, expiresAt)
 */
export function calculateGroupPaymentSummary(arg1, arg2 = [], arg3 = null) {
  let totalPrice = 0;
  let participants = [];
  let expiresAt = null;
  let status = GROUP_STATUSES.PENDING;

  if (typeof arg1 === "object" && arg1 !== null && "groupBooking" in arg1) {
    const groupBooking = arg1.groupBooking || {};
    totalPrice = Number(groupBooking.total_price || 0);
    participants = arg1.participants || [];
    expiresAt = groupBooking.expires_at || null;
    status = groupBooking.status || GROUP_STATUSES.PENDING;
  } else if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1) && "total_price" in arg1) {
    totalPrice = Number(arg1.total_price || 0);
    participants = Array.isArray(arg2) ? arg2 : [];
    expiresAt = arg1.expires_at || arg3 || null;
    status = arg1.status || GROUP_STATUSES.PENDING;
  } else {
    totalPrice = Number(arg1 || 0);
    participants = Array.isArray(arg2) ? arg2 : [];
    expiresAt = arg3;
    status = GROUP_STATUSES.PENDING;
  }

  let totalPaid = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const p of participants) {
    if (p.payment_status === PARTICIPANT_STATUSES.PAID) {
      totalPaid += Number(p.share_amount || 0);
      paidCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  totalPaid = Math.round(totalPaid * 100) / 100;
  const remainingBalance = Math.max(0, Math.round((totalPrice - totalPaid) * 100) / 100);
  const isFullyPaid = remainingBalance === 0 && (totalPaid >= totalPrice || totalPrice === 0);

  const expiresAtTs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const now = Date.now();
  const msRemaining = expiresAtTs > 0 ? Math.max(0, expiresAtTs - now) : 0;
  const secondsRemaining = Math.floor(msRemaining / 1000);
  const isExpired = expiresAtTs > 0 && now > expiresAtTs && !isFullyPaid && status === GROUP_STATUSES.PENDING;
  const isExpiringSoon = !isFullyPaid && !isExpired && status === GROUP_STATUSES.PENDING && secondsRemaining > 0 && secondsRemaining <= DEFAULT_REMINDER_MINUTES_BEFORE_DEADLINE * 60;

  // Reimbursements tracking for instant booking (leader pays upfront)
  let reimbursedAmount = 0;
  let reimbursedCount = 0;
  for (const p of participants) {
    if (p.role !== "leader" && p.payment_status === PARTICIPANT_STATUSES.PAID) {
      reimbursedAmount += Number(p.share_amount || 0);
      reimbursedCount += 1;
    }
  }

  return {
    totalPrice,
    totalPaid,
    remainingBalance,
    paidCount,
    pendingCount,
    totalCount: participants.length,
    isFullyPaid,
    isExpired,
    isExpiringSoon,
    secondsRemaining,
    msRemaining,
    reimbursedAmount: Math.round(reimbursedAmount * 100) / 100,
    reimbursedCount,
    progressPercentage: totalPrice > 0 ? Math.min(100, Math.round((totalPaid / totalPrice) * 100)) : 0,
  };
}

/**
 * Generates unique group invitation code.
 */
export function generateGroupInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GRP-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

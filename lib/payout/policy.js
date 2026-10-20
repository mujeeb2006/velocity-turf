// lib/payout/policy.js
// Business rules and canonical identifier resolution for payouts.

export const VALID_PAYOUT_TRANSITIONS = {
  pending: ["processing", "paid", "failed"],
  processing: ["paid", "failed", "pending"],
  failed: ["processing", "pending"],
  paid: [], // terminal: once settled, money has been transferred
};

export function isValidPayoutTransition(currentStatus, targetStatus) {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true; // idempotent
  const allowed = VALID_PAYOUT_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function canonicalPayoutIdentifier(payout) {
  if (!payout || typeof payout !== "object") return "—";
  return (
    payout.payout_number ||
    payout.payout_id ||
    (payout.id ? `PO-${String(payout.id).slice(0, 8)}` : "—")
  );
}

export function validatePayoutCreation({ ownerId, amount, periodStart, periodEnd, status }) {
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!ownerId || !UUID_PATTERN.test(ownerId)) {
    return { ok: false, error: "Valid owner UUID is required." };
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return { ok: false, error: "Payout amount must be greater than zero." };
  }
  if (!periodStart || !periodEnd) {
    return { ok: false, error: "Period start and end dates are required." };
  }
  if (periodStart > periodEnd) {
    return { ok: false, error: "Period start date cannot be after period end date." };
  }
  const VALID_CREATE_STATUSES = ["pending", "processing", "paid"];
  const normalizedStatus = VALID_CREATE_STATUSES.includes(status) ? status : "paid";
  return { ok: true, amount: numericAmount, status: normalizedStatus };
}

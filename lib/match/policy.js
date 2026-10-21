// lib/match/policy.js
// Business rules, validations, and status calculations for owner-created community games.

export const GAME_STATUSES = {
  PENDING: "pending_approval",
  OPEN: "open",
  FULL: "full",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  REJECTED: "rejected",
};

export const GAME_APPROVAL_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/**
 * Validates owner game creation payload.
 */
export function validateGameCreation({
  turf,
  sport,
  title,
  description,
  matchDate,
  startTime,
  endTime,
  maxPlayers,
  pricePerPlayer,
  currentDate = new Date().toISOString().slice(0, 10),
}) {
  if (!turf || typeof turf !== "object") {
    return { ok: false, error: "Please select a valid turf." };
  }

  if (turf.archived_at) {
    return { ok: false, error: "Cannot create games at an archived turf." };
  }

  if (turf.status !== "live") {
    return { ok: false, error: "Games can only be scheduled at active, approved turfs." };
  }

  const cleanSport = typeof sport === "string" ? sport.trim() : "";
  if (!cleanSport) {
    return { ok: false, error: "Please select a sport." };
  }

  const supportedSports = Array.isArray(turf.sports) ? turf.sports : [];
  if (supportedSports.length > 0 && !supportedSports.includes(cleanSport)) {
    return { ok: false, error: `Sport "${cleanSport}" is not supported by this turf.` };
  }

  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 100) {
    return { ok: false, error: "Game title must be between 3 and 100 characters." };
  }

  const cleanDesc = typeof description === "string" ? description.trim() : "";
  if (cleanDesc.length > 1000) {
    return { ok: false, error: "Game description must not exceed 1000 characters." };
  }

  if (!matchDate || !/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return { ok: false, error: "Please specify a valid game date (YYYY-MM-DD)." };
  }

  if (matchDate < currentDate) {
    return { ok: false, error: "Game date cannot be in the past." };
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!startTime || !timeRegex.test(startTime)) {
    return { ok: false, error: "Please provide a valid start time." };
  }

  // If endTime not provided, default to 1 hour after start
  let resolvedEndTime = endTime;
  if (!resolvedEndTime) {
    const [h, m] = startTime.slice(0, 5).split(":").map(Number);
    const endH = (h + 1) % 24;
    resolvedEndTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  } else if (!timeRegex.test(resolvedEndTime)) {
    return { ok: false, error: "Please provide a valid end time." };
  }

  const normStart = startTime.slice(0, 5);
  const normEnd = resolvedEndTime.slice(0, 5);
  if (normStart >= normEnd) {
    return { ok: false, error: "End time must be after start time." };
  }

  // Validate within turf operating hours if defined
  if (turf.open_time && turf.close_time) {
    const turfOpen = turf.open_time.slice(0, 5);
    const turfClose = turf.close_time.slice(0, 5);
    if (normStart < turfOpen || normEnd > turfClose) {
      return {
        ok: false,
        error: `Game must fit within turf operating hours (${turfOpen} – ${turfClose}).`,
      };
    }
  }

  const numMax = Number(maxPlayers);
  if (!Number.isInteger(numMax) || numMax < 2 || numMax > 50) {
    return { ok: false, error: "Maximum participants must be an integer between 2 and 50." };
  }

  const numFee = Number(pricePerPlayer);
  if (Number.isNaN(numFee) || !Number.isFinite(numFee) || numFee < 0) {
    return { ok: false, error: "Individual participation fee must be a non-negative number." };
  }

  const potentialCollection = Number((numMax * numFee).toFixed(2));

  return {
    ok: true,
    data: {
      turfId: turf.id,
      sport: cleanSport,
      title: cleanTitle,
      description: cleanDesc,
      matchDate,
      startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
      endTime: resolvedEndTime.length === 5 ? `${resolvedEndTime}:00` : resolvedEndTime,
      maxPlayers: numMax,
      pricePerPlayer: numFee,
      potentialCollection,
    },
  };
}

/**
 * Validates admin game decision payload.
 */
export function validateGameApproval({ game, decision, rejectionReason }) {
  if (!game || typeof game !== "object") {
    return { ok: false, error: "Game not found." };
  }

  if (game.approval_status !== "pending" && game.status !== "pending_approval") {
    return { ok: false, error: "This game has already been reviewed." };
  }

  if (decision !== "approve" && decision !== "reject") {
    return { ok: false, error: "Decision must be either 'approve' or 'reject'." };
  }

  if (decision === "reject") {
    const cleanReason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
    if (!cleanReason || cleanReason.length < 3) {
      return { ok: false, error: "Please provide a specific rejection reason for the turf owner." };
    }
    return { ok: true, decision: "reject", rejectionReason: cleanReason };
  }

  return { ok: true, decision: "approve", rejectionReason: null };
}

/**
 * Checks for conflicts with private bookings, maintenance blocks, and existing matches.
 */
export async function checkGameSchedulingConflict(
  adminClient,
  { turfId, matchDate, startTime, excludeMatchId = null }
) {
  const normStartTime = startTime.slice(0, 5);

  // 1. Check existing confirmed or pending bookings
  const { data: conflictingBookings, error: bookingErr } = await adminClient
    .from("bookings")
    .select("id, status")
    .eq("turf_id", turfId)
    .eq("booking_date", matchDate)
    .filter("status", "in", '("pending","confirmed","completed")');

  if (bookingErr) throw bookingErr;

  const hasBookingConflict = (conflictingBookings || []).some(
    (b) => (b.start_time || "").slice(0, 5) === normStartTime
  );
  if (hasBookingConflict) {
    return {
      conflict: true,
      reason: "This slot is already booked by a private player reservation.",
    };
  }

  // 2. Check maintenance blocks
  const { data: blockedSlots, error: blockErr } = await adminClient
    .from("blocked_slots")
    .select("id, start_time")
    .eq("turf_id", turfId)
    .eq("blocked_date", matchDate);

  if (blockErr) throw blockErr;

  const hasBlockConflict = (blockedSlots || []).some(
    (s) => (s.start_time || "").slice(0, 5) === normStartTime
  );
  if (hasBlockConflict) {
    return {
      conflict: true,
      reason: "This slot is blocked for maintenance or unavailable.",
    };
  }

  // 3. Check existing matches
  let matchQuery = adminClient
    .from("matches")
    .select("id, title, status, approval_status, start_time")
    .eq("turf_id", turfId)
    .eq("match_date", matchDate)
    .filter("status", "in", '("pending_approval","open","full")');

  if (excludeMatchId) {
    matchQuery = matchQuery.neq("id", excludeMatchId);
  }

  const { data: conflictingMatches, error: matchErr } = await matchQuery;
  if (matchErr) throw matchErr;

  const hasMatchConflict = (conflictingMatches || []).some(
    (m) => (m.start_time || "").slice(0, 5) === normStartTime
  );
  if (hasMatchConflict) {
    return {
      conflict: true,
      reason: "Another community game is already scheduled at this turf and time.",
    };
  }

  return { conflict: false };
}

/**
 * Resolves user-friendly status badge details.
 */
export function getGameDisplayStatus(game) {
  if (!game) return { label: "Unknown", color: "#888" };

  if (game.status === "cancelled") {
    return { label: "Cancelled", color: "#6b7280" };
  }
  if (game.status === "completed") {
    return { label: "Completed", color: "#10b981" };
  }
  if (game.status === "rejected" || game.approval_status === "rejected") {
    return { label: "Rejected", color: "#ef4444" };
  }
  if (game.status === "full") {
    return { label: "Full", color: "#0ea5e9" };
  }
  if (game.approval_status === "approved" || game.status === "open") {
    return { label: "Approved", color: "#22c55e" };
  }
  return { label: "Pending Approval", color: "#f59e0b" };
}

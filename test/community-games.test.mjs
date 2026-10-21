import test from "node:test";
import assert from "node:assert/strict";
import {
  validateGameCreation,
  validateGameApproval,
  checkGameSchedulingConflict,
  getGameDisplayStatus,
  GAME_STATUSES,
  GAME_APPROVAL_STATUSES,
} from "../lib/match/policy.js";
import {
  buildGamePaymentOrder,
  verifyAndConfirmParticipation,
  PAYMENT_MODE,
} from "../lib/match/payments.js";

const VALID_TURF_ID = "550e8400-e29b-41d4-a716-446655440000";
const OWNER_ID = "11111111-2222-3333-4444-555555555555";
const OTHER_OWNER_ID = "99999999-8888-7777-6666-555555555555";
const PLAYER_ID = "77777777-8888-9999-aaaa-bbbbbbbbbbbb";
const MATCH_ID = "33333333-4444-5555-6666-777777777777";

const MOCK_TURF = {
  id: VALID_TURF_ID,
  name: "Galaxy Arena",
  owner_id: OWNER_ID,
  status: "live",
  sports: ["Football", "Cricket"],
  open_time: "06:00:00",
  close_time: "23:00:00",
  archived_at: null,
};

// ── 1. Owner: Create and Manage Games ─────────────────────────

test("Owner game creation: validates valid input and calculates potential collection", () => {
  const result = validateGameCreation({
    turf: MOCK_TURF,
    sport: "Football",
    title: "Friday Night 5v5 Friendly",
    description: "Bibs and match ball provided.",
    matchDate: "2026-11-15",
    startTime: "18:00",
    endTime: "19:00",
    maxPlayers: 10,
    pricePerPlayer: 150,
    currentDate: "2026-10-21",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.title, "Friday Night 5v5 Friendly");
  assert.equal(result.data.sport, "Football");
  assert.equal(result.data.maxPlayers, 10);
  assert.equal(result.data.pricePerPlayer, 150);
  assert.equal(result.data.potentialCollection, 1500); // 10 * 150
});

test("Owner game creation: rejects past dates and invalid schedules", () => {
  // Past date
  const pastRes = validateGameCreation({
    turf: MOCK_TURF,
    sport: "Football",
    title: "Old Game",
    matchDate: "2026-09-01",
    startTime: "18:00",
    endTime: "19:00",
    maxPlayers: 10,
    pricePerPlayer: 100,
    currentDate: "2026-10-21",
  });
  assert.equal(pastRes.ok, false);
  assert.match(pastRes.error, /past/i);

  // End time before start time
  const timeRes = validateGameCreation({
    turf: MOCK_TURF,
    sport: "Football",
    title: "Inverted Time Game",
    matchDate: "2026-11-01",
    startTime: "20:00",
    endTime: "19:00",
    maxPlayers: 10,
    pricePerPlayer: 100,
    currentDate: "2026-10-21",
  });
  assert.equal(timeRes.ok, false);
  assert.match(timeRes.error, /End time must be after start time/i);
});

test("Owner game creation: rejects unsupported sports and invalid capacity/pricing", () => {
  // Unsupported sport
  const sportRes = validateGameCreation({
    turf: MOCK_TURF,
    sport: "Swimming", // Turf only has Football, Cricket
    title: "Swim Meet",
    matchDate: "2026-11-01",
    startTime: "10:00",
    endTime: "11:00",
    maxPlayers: 10,
    pricePerPlayer: 100,
    currentDate: "2026-10-21",
  });
  assert.equal(sportRes.ok, false);
  assert.match(sportRes.error, /not supported/i);

  // Capacity out of range (< 2 or > 50)
  const capRes = validateGameCreation({
    turf: MOCK_TURF,
    sport: "Football",
    title: "Solo Match",
    matchDate: "2026-11-01",
    startTime: "10:00",
    endTime: "11:00",
    maxPlayers: 1,
    pricePerPlayer: 100,
    currentDate: "2026-10-21",
  });
  assert.equal(capRes.ok, false);
  assert.match(capRes.error, /between 2 and 50/i);

  // Negative price
  const priceRes = validateGameCreation({
    turf: MOCK_TURF,
    sport: "Football",
    title: "Freebie with negative fee",
    matchDate: "2026-11-01",
    startTime: "10:00",
    endTime: "11:00",
    maxPlayers: 10,
    pricePerPlayer: -50,
    currentDate: "2026-10-21",
  });
  assert.equal(priceRes.ok, false);
  assert.match(priceRes.error, /non-negative/i);
});

test("Owner game creation: rejects archived or non-live turfs", () => {
  const archivedTurf = { ...MOCK_TURF, archived_at: "2026-10-01T00:00:00Z" };
  const resArchived = validateGameCreation({
    turf: archivedTurf,
    sport: "Football",
    title: "Game at Archived Turf",
    matchDate: "2026-11-01",
    startTime: "10:00",
    endTime: "11:00",
    maxPlayers: 10,
    pricePerPlayer: 100,
    currentDate: "2026-10-21",
  });
  assert.equal(resArchived.ok, false);
  assert.match(resArchived.error, /archived/i);

  const pendingTurf = { ...MOCK_TURF, status: "pending" };
  const resPending = validateGameCreation({
    turf: pendingTurf,
    sport: "Football",
    title: "Game at Pending Turf",
    matchDate: "2026-11-01",
    startTime: "10:00",
    endTime: "11:00",
    maxPlayers: 10,
    pricePerPlayer: 100,
    currentDate: "2026-10-21",
  });
  assert.equal(resPending.ok, false);
  assert.match(resPending.error, /active, approved/i);
});

// ── 2. Admin: Review and Approval Workflow ───────────────────

test("Admin approval: approves pending game with valid decision", () => {
  const pendingGame = {
    id: MATCH_ID,
    approval_status: "pending",
    status: "pending_approval",
    title: "Weekend Cricket Cup",
  };

  const approveRes = validateGameApproval({
    game: pendingGame,
    decision: "approve",
  });
  assert.equal(approveRes.ok, true);
  assert.equal(approveRes.decision, "approve");
});

test("Admin approval: rejects game and enforces rejection reason", () => {
  const pendingGame = {
    id: MATCH_ID,
    approval_status: "pending",
    status: "pending_approval",
    title: "Overpriced Game",
  };

  // Missing reason
  const failRes = validateGameApproval({
    game: pendingGame,
    decision: "reject",
    rejectionReason: "",
  });
  assert.equal(failRes.ok, false);
  assert.match(failRes.error, /rejection reason/i);

  // Valid reason
  const successRes = validateGameApproval({
    game: pendingGame,
    decision: "reject",
    rejectionReason: "Individual participation fee exceeds standard turf rates.",
  });
  assert.equal(successRes.ok, true);
  assert.equal(successRes.decision, "reject");
  assert.equal(successRes.rejectionReason, "Individual participation fee exceeds standard turf rates.");
});

test("Admin approval: cannot re-review games already approved or rejected", () => {
  const alreadyApproved = {
    id: MATCH_ID,
    approval_status: "approved",
    status: "open",
  };
  const res = validateGameApproval({
    game: alreadyApproved,
    decision: "approve",
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /already been reviewed/i);
});

// ── 3. Player: Authoritative Payment Order & Fee Security ────

test("Payment order generation: generates authoritative price from DB and creates unique transaction reference", () => {
  const game = {
    id: MATCH_ID,
    title: "Friday 5v5",
    sport: "Football",
    turf_id: VALID_TURF_ID,
    turf: { name: "Galaxy Arena" },
    price_per_player: 175.50,
  };
  const player = {
    id: PLAYER_ID,
    full_name: "Aman Sharma",
  };

  const order = buildGamePaymentOrder({ game, player, idempotencyKey: "test-key-123" });

  assert.equal(order.amount, 175.50);
  assert.equal(order.fee, 0);
  assert.equal(order.totalPayable, 175.50);
  assert.equal(order.isSimulated, true);
  assert.match(order.transactionReference, /^VT-PAY-[A-F0-9]{8}$/);
});

test("Payment security: client price tampering is detected and rejected", async () => {
  const authoritativeFee = 150.00;
  const tamperedFee = 1.00; // Player tries to pay ₹1 instead of ₹150

  const mockAdminClient = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: MATCH_ID,
              approval_status: "approved",
              status: "open",
              price_per_player: authoritativeFee,
              participant_count: 5,
              max_players: 10,
              turf: { id: VALID_TURF_ID, owner_id: OWNER_ID, status: "live" },
            },
            error: null,
          }),
        }),
      }),
    }),
  };

  const result = await verifyAndConfirmParticipation(mockAdminClient, {
    matchId: MATCH_ID,
    playerId: PLAYER_ID,
    transactionReference: "VT-PAY-FAKE123",
    clientReportedAmount: tamperedFee,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /fee mismatch/i);
});

test("Payment security: unapproved or non-open games cannot be joined", async () => {
  const mockAdminClientPending = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: MATCH_ID,
              approval_status: "pending",
              status: "pending_approval",
              price_per_player: 100,
              participant_count: 0,
              max_players: 10,
            },
            error: null,
          }),
        }),
      }),
    }),
  };

  const resPending = await verifyAndConfirmParticipation(mockAdminClientPending, {
    matchId: MATCH_ID,
    playerId: PLAYER_ID,
    transactionReference: "VT-PAY-123",
  });
  assert.equal(resPending.ok, false);
  assert.equal(resPending.status, 400);

  const mockAdminClientFull = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: MATCH_ID,
              approval_status: "approved",
              status: "full",
              price_per_player: 100,
              participant_count: 10,
              max_players: 10,
            },
            error: null,
          }),
        }),
      }),
    }),
  };

  const resFull = await verifyAndConfirmParticipation(mockAdminClientFull, {
    matchId: MATCH_ID,
    playerId: PLAYER_ID,
    transactionReference: "VT-PAY-123",
  });
  assert.equal(resFull.ok, false);
  assert.match(resFull.error, /maximum capacity/i);
});

test("Duplicate join protection: returns conflict if player already joined", async () => {
  const mockAdminClient = {
    from: (table) => {
      if (table === "matches") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: MATCH_ID,
                  approval_status: "approved",
                  status: "open",
                  price_per_player: 100,
                  participant_count: 3,
                  max_players: 10,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "match_participants") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "participant-existing-123" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  };

  const result = await verifyAndConfirmParticipation(mockAdminClient, {
    matchId: MATCH_ID,
    playerId: PLAYER_ID,
    transactionReference: "VT-PAY-123",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.match(result.error, /already joined/i);
});

// ── 4. Scheduling Conflict Prevention ─────────────────────────

test("Scheduling conflict prevention: detects conflict with confirmed bookings, blocked slots, or scheduled games", async () => {
  const mockAdminClientConflictBooking = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                filter: async () => ({
                  data: [{ id: "booking-1", start_time: "18:00:00", status: "confirmed" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
    },
  };

  const conflictBooking = await checkGameSchedulingConflict(mockAdminClientConflictBooking, {
    turfId: VALID_TURF_ID,
    matchDate: "2026-11-15",
    startTime: "18:00",
  });
  assert.equal(conflictBooking.conflict, true);
  assert.match(conflictBooking.reason, /private player reservation/i);

  // Blocked slot conflict
  const mockAdminClientConflictBlocked = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                filter: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "blocked_slots") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [{ id: "block-1", start_time: "18:00:00" }],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
    },
  };

  const conflictBlocked = await checkGameSchedulingConflict(mockAdminClientConflictBlocked, {
    turfId: VALID_TURF_ID,
    matchDate: "2026-11-15",
    startTime: "18:00",
  });
  assert.equal(conflictBlocked.conflict, true);
  assert.match(conflictBlocked.reason, /maintenance/i);
});

// ── 5. Status Badge & UI Formatting ───────────────────────────

test("Display status: resolves correct labels for all lifecycle statuses", () => {
  assert.equal(getGameDisplayStatus({ status: "cancelled" }).label, "Cancelled");
  assert.equal(getGameDisplayStatus({ status: "completed" }).label, "Completed");
  assert.equal(getGameDisplayStatus({ status: "rejected", approval_status: "rejected" }).label, "Rejected");
  assert.equal(getGameDisplayStatus({ status: "full", approval_status: "approved" }).label, "Full");
  assert.equal(getGameDisplayStatus({ status: "open", approval_status: "approved" }).label, "Approved");
  assert.equal(getGameDisplayStatus({ status: "pending_approval", approval_status: "pending" }).label, "Pending Approval");
});

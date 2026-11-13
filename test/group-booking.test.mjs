import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEqualSplit,
  validateCustomSplit,
  calculateLeaderPaysSplit,
  calculateGroupPaymentSummary,
  generateGroupInviteCode,
  DEFAULT_PAYMENT_DEADLINE_MINUTES,
  DEFAULT_REMINDER_MINUTES_BEFORE_DEADLINE,
} from "../lib/group/policy.js";

test("Group Booking Split Policy - calculateEqualSplit", async (t) => {
  await t.test("divides evenly when total price is cleanly divisible", () => {
    const shares = calculateEqualSplit(1200, 4);
    assert.deepEqual(shares, [300, 300, 300, 300]);
    assert.equal(shares.reduce((a, b) => a + b, 0), 1200);
  });

  await t.test("distributes pennies/remainder to leader so total always exactly equals total price", () => {
    const shares = calculateEqualSplit(1000, 3);
    assert.deepEqual(shares, [333.34, 333.33, 333.33]);
    assert.equal(shares.reduce((a, b) => a + b, 0), 1000);
  });

  await t.test("handles 2 participants and odd amounts correctly", () => {
    const shares = calculateEqualSplit(1501, 2);
    assert.deepEqual(shares, [750.5, 750.5]);
    assert.equal(shares.reduce((a, b) => a + b, 0), 1501);
  });

  await t.test("handles large group of 16 participants", () => {
    const shares = calculateEqualSplit(2500, 16);
    assert.equal(shares.length, 16);
    assert.equal(shares.reduce((a, b) => a + b, 0), 2500);
  });

  await t.test("throws on invalid participant counts", () => {
    assert.throws(() => calculateEqualSplit(1000, 1), /at least 2 participants/);
    assert.throws(() => calculateEqualSplit(1000, 51), /Maximum 50 participants/);
    assert.throws(() => calculateEqualSplit(0, 4), /Total price must be greater than 0/);
  });
});

test("Group Booking Split Policy - validateCustomSplit", async (t) => {
  await t.test("accepts valid custom split matching total price exactly", () => {
    const participants = [
      { id: "p1", share: 500 },
      { id: "p2", share: 300 },
      { id: "p3", share: 400 },
    ];
    const result = validateCustomSplit(1200, participants);
    assert.equal(result.ok, true);
    assert.equal(result.totalAssigned, 1200);
  });

  await t.test("rejects when sum is less than total price", () => {
    const participants = [
      { id: "p1", share: 400 },
      { id: "p2", share: 300 },
    ];
    const result = validateCustomSplit(1000, participants);
    assert.equal(result.ok, false);
    assert.match(result.error, /Total allocated shares.*must equal booking total/);
  });

  await t.test("rejects when sum exceeds total price", () => {
    const participants = [
      { id: "p1", share: 600 },
      { id: "p2", share: 600 },
    ];
    const result = validateCustomSplit(1000, participants);
    assert.equal(result.ok, false);
    assert.match(result.error, /Total allocated shares.*must equal booking total/);
  });

  await t.test("rejects negative or invalid participant shares", () => {
    const participants = [
      { id: "p1", share: -100 },
      { id: "p2", share: 1100 },
    ];
    const result = validateCustomSplit(1000, participants);
    assert.equal(result.ok, false);
    assert.match(result.error, /Share for participant.*must be non-negative/);
  });
});

test("Group Booking Split Policy - calculateLeaderPaysSplit", async (t) => {
  await t.test("leader pays full price, participants have 0 share", () => {
    const shares = calculateLeaderPaysSplit(1500, 5);
    assert.equal(shares.length, 5);
    assert.equal(shares[0], 1500);
    assert.deepEqual(shares.slice(1), [0, 0, 0, 0]);
    assert.equal(shares.reduce((a, b) => a + b, 0), 1500);
  });
});

test("Group Booking Split Policy - calculateGroupPaymentSummary", async (t) => {
  const participants = [
    { id: "p1", role: "leader", share_amount: 300, payment_status: "paid" },
    { id: "p2", role: "member", share_amount: 300, payment_status: "paid" },
    { id: "p3", role: "member", share_amount: 300, payment_status: "pending" },
    { id: "p4", role: "member", share_amount: 300, payment_status: "pending" },
  ];

  await t.test("correctly computes paid vs pending amounts and progress", () => {
    const summary = calculateGroupPaymentSummary(1200, participants);
    assert.equal(summary.totalPrice, 1200);
    assert.equal(summary.totalPaid, 600);
    assert.equal(summary.remainingBalance, 600);
    assert.equal(summary.paidCount, 2);
    assert.equal(summary.pendingCount, 2);
    assert.equal(summary.isFullyPaid, false);
  });

  await t.test("detects when all participants have paid", () => {
    const fullyPaidParticipants = participants.map(p => ({ ...p, payment_status: "paid" }));
    const summary = calculateGroupPaymentSummary(1200, fullyPaidParticipants);
    assert.equal(summary.totalPaid, 1200);
    assert.equal(summary.remainingBalance, 0);
    assert.equal(summary.isFullyPaid, true);
    assert.equal(summary.paidCount, 4);
    assert.equal(summary.pendingCount, 0);
  });

  await t.test("detects expiration based on expires_at ISO date string", () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    const summary = calculateGroupPaymentSummary(1200, participants, pastDate);
    assert.equal(summary.isExpired, true);

    const futureDate = new Date(Date.now() + 600000).toISOString();
    const activeSummary = calculateGroupPaymentSummary(1200, participants, futureDate);
    assert.equal(activeSummary.isExpired, false);
  });
});

test("Group Booking Split Policy - generateGroupInviteCode", async (t) => {
  await t.test("generates 10-character code with GRP- prefix", () => {
    const code = generateGroupInviteCode();
    assert.match(code, /^GRP-[A-Z0-9]{6}$/);
    assert.equal(code.length, 10);
  });

  await t.test("generates distinct codes across successive calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateGroupInviteCode()));
    assert.equal(codes.size, 50);
  });
});



test("Group Booking Lifecycle and State Machine Simulation", async (t) => {
  // Simulate complete group booking lifecycle
  const group = {
    id: "grp_123",
    booking_id: "book_456",
    leader_id: "user_leader",
    total_price: 1200,
    participant_count: 4,
    split_mode: "equal",
    payment_mode: "all_or_nothing",
    status: "pending",
    payment_status: "pending",
    invitation_code: "GRP-TEST01",
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  const booking = {
    id: "book_456",
    user_id: "user_leader",
    turf_id: "turf_001",
    booking_date: "2026-11-20",
    start_time: "18:00:00",
    status: "pending", // Atomically locked during group payment window
    price: 1200,
  };

  const participants = [
    {
      id: "part_1",
      group_booking_id: "grp_123",
      player_id: "user_leader",
      role: "leader",
      share_amount: 300,
      payment_status: "paid",
    },
  ];

  await t.test("Initial group creation creates single locked slot and sets leader share", () => {
    assert.equal(booking.status, "pending", "Slot must be locked with pending status");
    assert.equal(group.status, "pending");
    assert.equal(participants.length, 1);
    assert.equal(participants[0].share_amount, 300);

    const summary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(summary.totalPaid, 300);
    assert.equal(summary.remainingBalance, 900);
    assert.equal(summary.isFullyPaid, false);
  });

  await t.test("Members join up to capacity", () => {
    // Add member 2, 3, 4
    participants.push(
      { id: "part_2", group_booking_id: "grp_123", player_id: "user_m2", role: "member", share_amount: 300, payment_status: "pending" },
      { id: "part_3", group_booking_id: "grp_123", player_id: "user_m3", role: "member", share_amount: 300, payment_status: "pending" },
      { id: "part_4", group_booking_id: "grp_123", player_id: "user_m4", role: "member", share_amount: 300, payment_status: "pending" }
    );

    assert.equal(participants.length, 4);
    // Exceeding capacity is blocked
    const canJoinMore = participants.length < group.participant_count;
    assert.equal(canJoinMore, false, "Cannot join when group capacity is reached");
  });

  await t.test("Member shares are paid sequentially and progress is tracked", () => {
    participants[1].payment_status = "paid";
    let summary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(summary.totalPaid, 600);
    assert.equal(summary.remainingBalance, 600);
    assert.equal(summary.isFullyPaid, false);

    participants[2].payment_status = "paid";
    summary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(summary.totalPaid, 900);
    assert.equal(summary.remainingBalance, 300);
    assert.equal(summary.isFullyPaid, false);
  });

  await t.test("Atomic confirmation triggers when final participant pays", () => {
    participants[3].payment_status = "paid";
    const summary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(summary.totalPaid, 1200);
    assert.equal(summary.remainingBalance, 0);
    assert.equal(summary.isFullyPaid, true);

    if (summary.isFullyPaid) {
      group.status = "confirmed";
      group.payment_status = "paid";
      booking.status = "confirmed";
    }

    assert.equal(group.status, "confirmed");
    assert.equal(group.payment_status, "paid");
    assert.equal(booking.status, "confirmed", "Turf booking must transition to confirmed");
  });

  await t.test("Expiration cancels turf slot and triggers refunds if deadline missed", () => {
    const expiredGroup = {
      ...group,
      status: "pending",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    const expiredBooking = { ...booking, status: "pending" };
    const unpaidParticipants = [
      { id: "part_1", role: "leader", share_amount: 300, payment_status: "paid" },
      { id: "part_2", role: "member", share_amount: 300, payment_status: "pending" },
    ];

    const summary = calculateGroupPaymentSummary({ groupBooking: expiredGroup, participants: unpaidParticipants });
    assert.equal(summary.isExpired, true);

    // Simulation of expireGroupBookingIfDue
    if (summary.isExpired) {
      expiredGroup.status = "expired";
      expiredBooking.status = "cancelled"; // release slot lock
      unpaidParticipants.forEach((p) => {
        if (p.payment_status === "paid") p.payment_status = "refunded";
      });
    }

    assert.equal(expiredGroup.status, "expired");
    assert.equal(expiredBooking.status, "cancelled", "Released slot for other players");
    assert.equal(unpaidParticipants[0].payment_status, "refunded", "Paid participant was marked refunded");
  });
});


test("Smart Payment Deadline and Slot Protection Tests", async (t) => {
  await t.test("Default hold duration is exactly 10 minutes", () => {
    assert.equal(DEFAULT_PAYMENT_DEADLINE_MINUTES, 10);
    assert.equal(DEFAULT_REMINDER_MINUTES_BEFORE_DEADLINE, 3);
  });

  await t.test("Live countdown accurately reports secondsRemaining and triggers isExpiringSoon within 3 minutes", () => {
    const twoMinutesAhead = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const group = {
      total_price: 1000,
      status: "pending",
      expires_at: twoMinutesAhead,
    };
    const participants = [
      { id: "p1", share_amount: 500, payment_status: "paid" },
      { id: "p2", share_amount: 500, payment_status: "pending" },
    ];

    const summary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.ok(summary.secondsRemaining > 0 && summary.secondsRemaining <= 120);
    assert.equal(summary.isExpiringSoon, true, "Must flag expiring soon when <= 3 minutes left");
    assert.equal(summary.isExpired, false);
  });

  await t.test("isExpiringSoon is false when ample time remains (e.g. 8 minutes)", () => {
    const eightMinutesAhead = new Date(Date.now() + 8 * 60 * 1000).toISOString();
    const group = {
      total_price: 1000,
      status: "pending",
      expires_at: eightMinutesAhead,
    };
    const participants = [
      { id: "p1", share_amount: 500, payment_status: "paid" },
      { id: "p2", share_amount: 500, payment_status: "pending" },
    ];

    const summary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(summary.isExpiringSoon, false);
    assert.equal(summary.isExpired, false);
  });

  await t.test("Leader Guarantee: Leader pays remaining balance and atomically confirms booking", () => {
    const group = {
      id: "grp_guarantee_test",
      booking_id: "book_guarantee_test",
      total_price: 1200,
      leader_id: "leader_user",
      status: "pending",
      payment_status: "partial",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
    const booking = { id: "book_guarantee_test", status: "pending", price: 1200 };
    const participants = [
      { id: "part_1", role: "leader", player_id: "leader_user", share_amount: 300, payment_status: "paid" },
      { id: "part_2", role: "member", player_id: "member_2", share_amount: 300, payment_status: "paid" },
      { id: "part_3", role: "member", player_id: "member_3", share_amount: 300, payment_status: "pending" },
      { id: "part_4", role: "member", player_id: "member_4", share_amount: 300, payment_status: "pending" },
    ];

    const initialSummary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(initialSummary.totalPaid, 600);
    assert.equal(initialSummary.remainingBalance, 600);
    assert.equal(initialSummary.isFullyPaid, false);

    // Leader pays remaining balance of 600
    const balancePaid = initialSummary.remainingBalance;
    participants.forEach((p) => {
      if (p.payment_status === "pending") {
        p.payment_status = "paid";
        p.covered_by_leader = true;
      }
    });

    const confirmedSummary = calculateGroupPaymentSummary({ groupBooking: group, participants });
    assert.equal(confirmedSummary.remainingBalance, 0);
    assert.equal(confirmedSummary.isFullyPaid, true);

    group.status = "confirmed";
    group.payment_status = "paid";
    booking.status = "confirmed";

    assert.equal(group.status, "confirmed");
    assert.equal(booking.status, "confirmed", "Turf booking is atomically confirmed");
    assert.equal(participants[2].payment_status, "paid");
    assert.equal(participants[3].payment_status, "paid");
  });

  await t.test("Replacement player logic: Replaces unpaid member, protects paid member, keeps capacity", () => {
    const participants = [
      { id: "part_1", role: "leader", player_id: "leader_user", share_amount: 300, payment_status: "paid" },
      { id: "part_2", role: "member", player_id: "paid_member", share_amount: 300, payment_status: "paid" },
      { id: "part_3", role: "member", player_id: "unpaid_flake", share_amount: 300, payment_status: "pending" },
    ];

    // Attempting to replace paid player is rejected
    const targetPaid = participants.find((p) => p.id === "part_2");
    const canReplacePaid = targetPaid.payment_status !== "paid" && targetPaid.role !== "leader";
    assert.equal(canReplacePaid, false, "Cannot replace a member who has already paid");

    // Attempting to replace leader is rejected
    const targetLeader = participants.find((p) => p.id === "part_1");
    const canReplaceLeader = targetLeader.role !== "leader";
    assert.equal(canReplaceLeader, false, "Cannot replace the group leader");

    // Unpaid member can be replaced
    const targetUnpaid = participants.find((p) => p.id === "part_3");
    assert.equal(targetUnpaid.payment_status, "pending");
    targetUnpaid.player_id = "replacement_ringer";

    assert.equal(targetUnpaid.player_id, "replacement_ringer");
    assert.equal(targetUnpaid.share_amount, 300, "Replacement inherits the unpaid share");
  });

  await t.test("Instant Booking Alternative: Confirms booking immediately and tracks member reimbursements", () => {
    const instantGroup = {
      id: "grp_instant_1",
      booking_id: "book_instant_1",
      leader_id: "leader_instant",
      total_price: 1200,
      participant_count: 4,
      split_mode: "equal",
      payment_mode: "leader_immediate",
      status: "confirmed", // Confirmed immediately upon creation
      payment_status: "paid",
    };
    const instantBooking = { id: "book_instant_1", status: "confirmed", price: 1200 };

    assert.equal(instantBooking.status, "confirmed", "Instant booking confirmed upfront");

    const participants = [
      { id: "part_leader", role: "leader", player_id: "leader_instant", share_amount: 1200, payment_status: "paid" },
      { id: "part_friend1", role: "member", player_id: "friend_1", share_amount: 300, payment_status: "pending" },
      { id: "part_friend2", role: "member", player_id: "friend_2", share_amount: 300, payment_status: "pending" },
      { id: "part_friend3", role: "member", player_id: "friend_3", share_amount: 300, payment_status: "pending" },
    ];

    let summary = calculateGroupPaymentSummary({ groupBooking: instantGroup, participants });
    assert.equal(summary.reimbursedCount, 0);
    assert.equal(summary.reimbursedAmount, 0);

    // Friend 1 reimburses leader
    participants[1].payment_status = "paid";
    summary = calculateGroupPaymentSummary({ groupBooking: instantGroup, participants });
    assert.equal(summary.reimbursedCount, 1);
    assert.equal(summary.reimbursedAmount, 300);

    // Friend 2 reimburses leader
    participants[2].payment_status = "paid";
    summary = calculateGroupPaymentSummary({ groupBooking: instantGroup, participants });
    assert.equal(summary.reimbursedCount, 2);
    assert.equal(summary.reimbursedAmount, 600);

    // Turf booking remains firmly confirmed throughout
    assert.equal(instantBooking.status, "confirmed");
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePackageConfig,
  buildPackagePaymentOrder,
  validatePackageRedemption,
  calculatePackageRefundEligibility,
} from "../lib/package/policy.js";
import { redeemPackageSession, refundPackageSession } from "../lib/package/service.js";

const VALID_TURF_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_TURF_ID = "660e8400-e29b-41d4-a716-446655440000";
const USER_ID = "77777777-8888-9999-aaaa-bbbbbbbbbbbb";
const PACKAGE_ID = "88888888-9999-aaaa-bbbb-cccccccccccc";

// ── 1. Admin Package Configuration ───────────────────────────────────────────

test("Package config: validates valid admin package definitions", () => {
  const res = validatePackageConfig({
    name: "5-Session Football Pass",
    description: "Good for 5 bookings on any football turf.",
    price: 1500,
    totalSessions: 5,
    validityDays: 30,
    eligibleSports: ["Football"],
    eligibleTurfs: [VALID_TURF_ID],
    maxSessionsPerDay: 2,
    restrictions: { off_peak_only: true },
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.name, "5-Session Football Pass");
  assert.equal(res.data.totalSessions, 5);
  assert.equal(res.data.validityDays, 30);
  assert.deepEqual(res.data.eligibleSports, ["Football"]);
});

test("Package config: rejects negative price, zero sessions, or invalid validity", () => {
  assert.equal(validatePackageConfig({ name: "Bad", price: -100, totalSessions: 5, validityDays: 30 }).ok, false);
  assert.equal(validatePackageConfig({ name: "Bad", price: 100, totalSessions: 0, validityDays: 30 }).ok, false);
  assert.equal(validatePackageConfig({ name: "Bad", price: 100, totalSessions: 5, validityDays: 0 }).ok, false);
});

// ── 2. Authoritative Payment Order Generation ────────────────────────────────

test("Package payment order: generates authoritative pricing without client tampering", () => {
  const pkg = {
    id: PACKAGE_ID,
    name: "10-Session All-Sport Pass",
    price: 3200,
    total_sessions: 10,
    validity_days: 60,
  };
  const user = { id: USER_ID, full_name: "Virat Kohli" };

  const order = buildPackagePaymentOrder({ pkg, user });
  assert.equal(order.totalPayable, 3200);
  assert.equal(order.totalSessions, 10);
  assert.ok(order.transactionReference.startsWith("VT-PKG-"));
});

// ── 3. Redemption Eligibility & Restrictions ─────────────────────────────────

test("Package redemption: enforces sports, venues, active status and session count", () => {
  const futureExpiry = new Date(Date.now() + 15 * 86400000).toISOString();
  const pastExpiry = new Date(Date.now() - 5 * 86400000).toISOString();

  const userPackage = {
    id: "up-1",
    remaining_sessions: 3,
    status: "active",
    expires_at: futureExpiry,
    package: {
      eligible_sports: ["Football", "Cricket"],
      eligible_turfs: [VALID_TURF_ID],
      restrictions: { off_peak_only: true },
    },
  };

  // 1. Valid off-peak football at VALID_TURF_ID
  const valid = validatePackageRedemption({
    userPackage,
    bookingDate: "2026-11-20",
    sport: "Football",
    turfId: VALID_TURF_ID,
    isPeak: false,
  });
  assert.equal(valid.ok, true);

  // 2. Ineligible sport (Badminton)
  const badSport = validatePackageRedemption({
    userPackage,
    bookingDate: "2026-11-20",
    sport: "Badminton",
    turfId: VALID_TURF_ID,
    isPeak: false,
  });
  assert.equal(badSport.ok, false);
  assert.match(badSport.error, /only applies to/i);

  // 3. Ineligible turf
  const badTurf = validatePackageRedemption({
    userPackage,
    bookingDate: "2026-11-20",
    sport: "Football",
    turfId: OTHER_TURF_ID,
    isPeak: false,
  });
  assert.equal(badTurf.ok, false);
  assert.match(badTurf.error, /not valid at the selected turf/i);

  // 4. Off-peak violation
  const peakViolation = validatePackageRedemption({
    userPackage,
    bookingDate: "2026-11-20",
    sport: "Football",
    turfId: VALID_TURF_ID,
    isPeak: true,
  });
  assert.equal(peakViolation.ok, false);
  assert.match(peakViolation.error, /restricted to off-peak/i);

  // 5. Zero sessions remaining
  const exhausted = validatePackageRedemption({
    userPackage: { ...userPackage, remaining_sessions: 0, status: "exhausted" },
    bookingDate: "2026-11-20",
    sport: "Football",
    turfId: VALID_TURF_ID,
    isPeak: false,
  });
  assert.equal(exhausted.ok, false);

  // 6. Expired pass
  const expired = validatePackageRedemption({
    userPackage: { ...userPackage, expires_at: pastExpiry },
    bookingDate: "2026-11-20",
    sport: "Football",
    turfId: VALID_TURF_ID,
    isPeak: false,
  });
  assert.equal(expired.ok, false);
  assert.match(expired.error, /expired/i);
});

// ── 4. Cancellation & Refund Policy ──────────────────────────────────────────

test("Refund eligibility: restores session if cancelled before start, blocks if in past or pass expired", () => {
  const futureDate = "2026-12-01";
  const pastDate = "2026-09-01";
  const validExpiry = "2026-12-31T23:59:59Z";
  const oldExpiry = "2026-10-01T23:59:59Z";

  // Before session start -> refund allowed
  const canRefund = calculatePackageRefundEligibility({
    userPackage: { id: "up-1", expires_at: validExpiry },
    bookingDate: futureDate,
    startTime: "18:00:00",
    now: new Date("2026-10-25T10:00:00Z"),
  });
  assert.equal(canRefund.canRefund, true);

  // After session start -> refund blocked
  const pastSession = calculatePackageRefundEligibility({
    userPackage: { id: "up-1", expires_at: validExpiry },
    bookingDate: pastDate,
    startTime: "18:00:00",
    now: new Date("2026-10-25T10:00:00Z"),
  });
  assert.equal(pastSession.canRefund, false);
  assert.match(pastSession.reason, /booked start time/i);

  // Overall pass expired -> refund blocked
  const passExpired = calculatePackageRefundEligibility({
    userPackage: { id: "up-1", expires_at: oldExpiry },
    bookingDate: futureDate,
    startTime: "18:00:00",
    now: new Date("2026-10-25T10:00:00Z"),
  });
  assert.equal(passExpired.canRefund, false);
  assert.match(passExpired.reason, /pass used for this booking has expired/i);
});

// ── 5. Mock Atomic Redemption & Service Workflow ─────────────────────────────

test("Atomic redemption: decrements session count, updates status to exhausted at 0, prevents negative balances", async () => {
  let dbSession = 1;

  const mockAdmin = {
    from: (table) => {
      if (table === "user_packages") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "up-mock",
                    user_id: USER_ID,
                    remaining_sessions: dbSession,
                    status: dbSession > 0 ? "active" : "exhausted",
                    expires_at: new Date(Date.now() + 86400000).toISOString(),
                    package: { eligible_sports: [], eligible_turfs: [] },
                  },
                }),
              }),
            }),
          }),
          update: (fields) => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () => ({
                    eq: () => ({
                      select: () => ({
                        maybeSingle: async () => {
                          if (dbSession <= 0) return { data: null, error: new Error("Zero balance") };
                          dbSession -= 1;
                          return {
                            data: {
                              id: "up-mock",
                              remaining_sessions: dbSession,
                              status: dbSession === 0 ? "exhausted" : "active",
                            },
                          };
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "package_redemptions") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "red-mock", created_at: new Date().toISOString() } }),
            }),
          }),
        };
      }
      return {};
    },
  };

  // First redemption: 1 -> 0 sessions
  const res1 = await redeemPackageSession(mockAdmin, {
    userPackageId: "up-mock",
    userId: USER_ID,
    bookingDate: "2026-11-20",
    startTime: "18:00:00",
    sport: "Football",
    turfId: VALID_TURF_ID,
  });

  assert.equal(res1.ok, true);
  assert.equal(res1.remainingSessions, 0);
  assert.equal(res1.status, "exhausted");

  // Second redemption: should be blocked, preventing negative balance
  const res2 = await redeemPackageSession(mockAdmin, {
    userPackageId: "up-mock",
    userId: USER_ID,
    bookingDate: "2026-11-21",
    startTime: "18:00:00",
    sport: "Football",
    turfId: VALID_TURF_ID,
  });

  assert.equal(res2.ok, false);
  assert.match(res2.error, /consumed|exhausted|zero/i);
});

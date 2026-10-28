import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTeamCreation,
  generateInviteToken,
  validateTeamInvite,
  validateInviteRedemption,
  canManageRoster,
  validateTeamBooking,
} from "../lib/team/policy.js";

const CAPTAIN_ID = "11111111-2222-3333-4444-555555555555";
const MEMBER_ID = "22222222-3333-4444-5555-666666666666";
const STRANGER_ID = "33333333-4444-5555-6666-777777777777";
const TEAM_ID = "44444444-5555-6666-7777-888888888888";

const MOCK_TEAM = {
  id: TEAM_ID,
  captain_id: CAPTAIN_ID,
  name: "Velocity Strikers FC",
  sport: "Football",
  description: "Weekend competitive 7v7 squad",
};

// ── 1. Team Creation Validation ──────────────────────────────────────────────

test("Team creation: validates valid inputs", () => {
  const res = validateTeamCreation({
    name: "Thunderbolts CC",
    sport: "Cricket",
    description: "T20 division team",
    captainId: CAPTAIN_ID,
    logoUrl: "https://example.com/logo.png",
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.name, "Thunderbolts CC");
  assert.equal(res.data.sport, "Cricket");
  assert.equal(res.data.captainId, CAPTAIN_ID);
});

test("Team creation: rejects invalid names and unsupported sports", () => {
  // Too short
  assert.equal(validateTeamCreation({ name: "A", sport: "Football", captainId: CAPTAIN_ID }).ok, false);
  // Unsupported sport
  assert.equal(validateTeamCreation({ name: "Runners", sport: "Skiing", captainId: CAPTAIN_ID }).ok, false);
  // Missing captain ID
  assert.equal(validateTeamCreation({ name: "Runners", sport: "Football", captainId: "" }).ok, false);
});

// ── 2. Team Invitation & Tokens ──────────────────────────────────────────────

test("Team invite: generates secure URL-safe token with valid expiry", () => {
  const token = generateInviteToken(TEAM_ID);
  assert.ok(typeof token === "string" && token.length >= 20);
  assert.match(token, /^[A-Za-z0-9_-]+$/);

  const res = validateTeamInvite({
    team: MOCK_TEAM,
    captainId: CAPTAIN_ID,
    maxUses: 15,
    expiryHours: 48,
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.maxUses, 15);
  assert.ok(new Date(res.data.expiresAt) > new Date());
});

test("Team invite: rejects non-captain invite generation", () => {
  const res = validateTeamInvite({
    team: MOCK_TEAM,
    captainId: MEMBER_ID, // not the captain
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /Only the team captain/i);
});

test("Invite redemption: allows valid player and blocks duplicate/expired/revoked", () => {
  const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const validInvite = {
    id: "inv-1",
    team_id: TEAM_ID,
    expires_at: futureExpiry,
    max_uses: 5,
    uses: 1,
    revoked: false,
  };

  // Valid redemption
  assert.equal(validateInviteRedemption({ invite: validInvite, playerId: STRANGER_ID, existingMember: null }).ok, true);

  // Expired
  const expiredInvite = { ...validInvite, expires_at: pastExpiry };
  assert.equal(validateInviteRedemption({ invite: expiredInvite, playerId: STRANGER_ID, existingMember: null }).ok, false);

  // Revoked
  const revokedInvite = { ...validInvite, revoked: true };
  assert.equal(validateInviteRedemption({ invite: revokedInvite, playerId: STRANGER_ID, existingMember: null }).ok, false);

  // Max uses reached
  const fullInvite = { ...validInvite, uses: 5, max_uses: 5 };
  assert.equal(validateInviteRedemption({ invite: fullInvite, playerId: STRANGER_ID, existingMember: null }).ok, false);

  // Duplicate membership blocked
  assert.equal(
    validateInviteRedemption({ invite: validInvite, playerId: MEMBER_ID, existingMember: { id: "m-1" } }).ok,
    false
  );
});

// ── 3. Roster Management Authorization ────────────────────────────────────────

test("Roster authorization: captain can manage, members can leave, strangers cannot remove", () => {
  const member = { player_id: MEMBER_ID, role: "member" };
  const captainMember = { player_id: CAPTAIN_ID, role: "captain" };

  // Captain removing a member -> allowed
  assert.equal(canManageRoster({ team: MOCK_TEAM, memberToManage: member, requestingUserId: CAPTAIN_ID, action: "remove_member" }), true);

  // Member leaving on their own -> allowed
  assert.equal(canManageRoster({ team: MOCK_TEAM, memberToManage: member, requestingUserId: MEMBER_ID, action: "remove_member" }), true);

  // Stranger removing a member -> blocked
  assert.equal(canManageRoster({ team: MOCK_TEAM, memberToManage: member, requestingUserId: STRANGER_ID, action: "remove_member" }), false);

  // Removing the captain -> strictly blocked
  assert.equal(canManageRoster({ team: MOCK_TEAM, memberToManage: captainMember, requestingUserId: CAPTAIN_ID, action: "remove_member" }), false);
});

// ── 4. Team-Based Booking & Conflict Prevention ──────────────────────────────

test("Team booking: prevents conflicting bookings for the same team on the same slot", () => {
  const activeBookings = [
    {
      team_id: TEAM_ID,
      booking_date: "2026-11-20",
      start_time: "19:00:00",
      status: "confirmed",
    },
  ];

  // Conflicting booking
  const conflictRes = validateTeamBooking({
    team: MOCK_TEAM,
    bookingDate: "2026-11-20",
    startTime: "19:00:00",
    activeBookings,
  });
  assert.equal(conflictRes.ok, false);
  assert.match(conflictRes.error, /already has an active booking/i);

  // Different slot -> allowed
  const nonConflictRes = validateTeamBooking({
    team: MOCK_TEAM,
    bookingDate: "2026-11-20",
    startTime: "21:00:00",
    activeBookings,
  });
  assert.equal(nonConflictRes.ok, true);
});

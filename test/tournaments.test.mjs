import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTournamentCreation,
  calculateTournamentFinancials,
  validateTournamentRegistration,
  buildTournamentPaymentOrder,
  generateTournamentFixtures,
  validateScoreSubmission,
  calculateStandings,
} from "../lib/tournament/policy.js";

const VALID_TURF_ID = "550e8400-e29b-41d4-a716-446655440000";
const OWNER_ID = "11111111-2222-3333-4444-555555555555";
const ORGANIZER_ID = "22222222-3333-4444-5555-666666666666";
const PLAYER_ID = "33333333-4444-5555-6666-777777777777";

const MOCK_TURF = {
  id: VALID_TURF_ID,
  name: "Apex Arena",
  owner_id: OWNER_ID,
  status: "live",
  sports: ["Football", "Cricket", "Badminton"],
  archived_at: null,
};

// ── 1. Tournament Creation & Rules ───────────────────────────────────────────

test("Tournament creation: validates valid input and assigns proper approval status", () => {
  // Organizer is player -> turf approval is pending
  const res = validateTournamentCreation({
    turf: MOCK_TURF,
    title: "Bangalore Champions Cup 2026",
    sport: "Football",
    format: "knockout",
    teamSize: 7,
    maxTeams: 8,
    entryFee: 1500,
    prizePool: 8000,
    registrationDeadline: "2026-11-10T18:00:00Z",
    startDate: "2026-11-15",
    endDate: "2026-11-16",
    organizerId: ORGANIZER_ID,
    organizerRole: "player",
    currentDate: "2026-10-25",
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.title, "Bangalore Champions Cup 2026");
  assert.equal(res.data.turfApprovalStatus, "pending");
  assert.equal(res.data.status, "pending_approval");

  // Turf owner creating tournament -> auto-approved
  const ownerRes = validateTournamentCreation({
    turf: MOCK_TURF,
    title: "Apex Arena Winter League",
    sport: "Cricket",
    format: "league",
    teamSize: 11,
    maxTeams: 6,
    entryFee: 2000,
    prizePool: 10000,
    registrationDeadline: "2026-11-10T18:00:00Z",
    startDate: "2026-11-15",
    endDate: "2026-11-20",
    organizerId: OWNER_ID,
    organizerRole: "owner",
    currentDate: "2026-10-25",
  });

  assert.equal(ownerRes.ok, true);
  assert.equal(ownerRes.data.turfApprovalStatus, "approved");
  assert.equal(ownerRes.data.status, "open");
});

test("Tournament creation: enforces unfunded prize policy", () => {
  // max allowable = entryFee (500) * maxTeams (4) = 2000
  // prizePool = 5000 -> must be rejected
  const res = validateTournamentCreation({
    turf: MOCK_TURF,
    title: "Fantasy High Roller Cup",
    sport: "Football",
    teamSize: 5,
    maxTeams: 4,
    entryFee: 500,
    prizePool: 5000,
    registrationDeadline: "2026-11-10T18:00:00Z",
    startDate: "2026-11-15",
    endDate: "2026-11-16",
    organizerId: ORGANIZER_ID,
    currentDate: "2026-10-25",
  });

  assert.equal(res.ok, false);
  assert.match(res.error, /Unfunded prizes are not permitted/i);
});

// ── 2. Transparent Financials ────────────────────────────────────────────────

test("Financial calculations: computes platform fees and transparent prize pools", () => {
  const fin = calculateTournamentFinancials({
    entryFee: 1000,
    registeredTeamsCount: 6,
    maxTeams: 8,
    platformFeeRate: 0.05,
  });

  assert.equal(fin.currentCollection, 6000);
  assert.equal(fin.potentialCollection, 8000);
  assert.equal(fin.currentPlatformFee, 300); // 5% of 6000
  assert.equal(fin.currentNetPrizePool, 5700);
});

// ── 3. Registration & Payments ───────────────────────────────────────────────

test("Registration: prevents duplicate registrations and overcapacity", () => {
  const tour = {
    id: "tour-1",
    turf_approval_status: "approved",
    admin_approval_status: "approved",
    status: "open",
    max_teams: 4,
    entry_fee: 1000,
    registration_deadline: new Date(Date.now() + 86400000).toISOString(),
  };

  // Valid registration
  const valid = validateTournamentRegistration({
    tournament: tour,
    user: { id: PLAYER_ID },
    teamName: "Koramangala Knights",
    existingRegistration: null,
    registeredCount: 2,
  });
  assert.equal(valid.ok, true);

  // Duplicate registration blocked
  const dup = validateTournamentRegistration({
    tournament: tour,
    user: { id: PLAYER_ID },
    teamName: "Koramangala Knights",
    existingRegistration: { id: "reg-1" },
    registeredCount: 2,
  });
  assert.equal(dup.ok, false);
  assert.match(dup.error, /already registered/i);

  // Over capacity blocked
  const full = validateTournamentRegistration({
    tournament: tour,
    user: { id: PLAYER_ID },
    teamName: "Koramangala Knights",
    existingRegistration: null,
    registeredCount: 4,
  });
  assert.equal(full.ok, false);
  assert.match(full.error, /maximum team capacity/i);
});

test("Payment order generation: builds authoritative transaction reference", () => {
  const tour = {
    id: "tour-1",
    title: "Super 8",
    turf_id: VALID_TURF_ID,
    entry_fee: 1200,
  };
  const user = { id: PLAYER_ID, full_name: "Rahul Dravid" };

  const order = buildTournamentPaymentOrder({
    tournament: tour,
    teamName: "Indiranagar Strikers",
    user,
  });

  assert.equal(order.totalPayable, 1200);
  assert.ok(order.transactionReference.startsWith("VT-TRN-"));
});

// ── 4. Fixtures & Score Submission ───────────────────────────────────────────

test("Fixture generation: pairs registered teams into round 1 fixtures", () => {
  const registrations = [
    { id: "reg-1", team_name: "Team A" },
    { id: "reg-2", team_name: "Team B" },
    { id: "reg-3", team_name: "Team C" },
    { id: "reg-4", team_name: "Team D" },
  ];

  const fixtures = generateTournamentFixtures({
    tournamentId: "tour-1",
    registrations,
  });

  assert.equal(fixtures.length, 2);
  assert.equal(fixtures[0].home_registration_id, "reg-1");
  assert.equal(fixtures[0].away_registration_id, "reg-2");
  assert.equal(fixtures[1].home_registration_id, "reg-3");
  assert.equal(fixtures[1].away_registration_id, "reg-4");
});

test("Score submission: validates scores and prevents unauthorized changes", () => {
  const tour = { id: "tour-1", organizer_id: ORGANIZER_ID, status: "ongoing", format: "knockout" };
  const fixture = { id: "fix-1", home_registration_id: "reg-1", away_registration_id: "reg-2" };

  // Organizer submitting valid score
  const res = validateScoreSubmission({
    fixture,
    tournament: tour,
    homeScore: 3,
    awayScore: 1,
    requestingUserId: ORGANIZER_ID,
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.winnerRegistrationId, "reg-1");

  // Knockout draw without penalty is rejected
  const drawRes = validateScoreSubmission({
    fixture,
    tournament: tour,
    homeScore: 2,
    awayScore: 2,
    requestingUserId: ORGANIZER_ID,
  });
  assert.equal(drawRes.ok, false);
  assert.match(drawRes.error, /draw/i);

  // Stranger cannot submit score
  const strangerRes = validateScoreSubmission({
    fixture,
    tournament: tour,
    homeScore: 3,
    awayScore: 1,
    requestingUserId: PLAYER_ID,
    userRole: "player",
  });
  assert.equal(strangerRes.ok, false);
});

// ── 5. Standings Table Calculation ───────────────────────────────────────────

test("Standings: calculates wins, losses, goals, and points correctly", () => {
  const registrations = [
    { id: "reg-1", team_name: "Titans" },
    { id: "reg-2", team_name: "Spartans" },
  ];

  const fixtures = [
    {
      home_registration_id: "reg-1",
      away_registration_id: "reg-2",
      home_score: 4,
      away_score: 2,
      status: "completed",
    },
  ];

  const standings = calculateStandings({ registrations, fixtures });

  assert.equal(standings[0].teamName, "Titans");
  assert.equal(standings[0].won, 1);
  assert.equal(standings[0].points, 3);
  assert.equal(standings[0].goalDifference, 2);

  assert.equal(standings[1].teamName, "Spartans");
  assert.equal(standings[1].lost, 1);
  assert.equal(standings[1].points, 0);
  assert.equal(standings[1].goalDifference, -2);
});

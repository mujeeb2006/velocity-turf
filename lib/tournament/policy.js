// lib/tournament/policy.js
// Business rules, financial calculations, fixtures, standings, and validations for Tournaments & Leagues.

import { createHash } from "crypto";
import { SPORT_OPTIONS } from "../sports.js";

export const TOURNAMENT_FORMATS = ["knockout", "round_robin", "league"];
export const TOURNAMENT_STATUSES = ["draft", "pending_approval", "open", "registration_closed", "ongoing", "completed", "cancelled"];
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates tournament creation request.
 */
export function validateTournamentCreation({
  turf,
  title,
  description = "",
  sport,
  format = "knockout",
  teamSize = 5,
  maxTeams = 8,
  entryFee = 0,
  platformFee = 0,
  prizePool = 0,
  prizeDescription = "",
  rules = "",
  registrationDeadline,
  startDate,
  endDate,
  organizerId,
  organizerRole = "player",
  currentDate = new Date().toISOString().slice(0, 10),
}) {
  if (!turf || !turf.id || turf.status !== "live" || turf.archived_at) {
    return { ok: false, error: "A valid, active turf is required for hosting a tournament." };
  }

  const cleanTitle = String(title || "").trim();
  if (cleanTitle.length < 3 || cleanTitle.length > 100) {
    return { ok: false, error: "Tournament title must be between 3 and 100 characters." };
  }

  const cleanSport = String(sport || "").trim();
  if (!SPORT_OPTIONS.includes(cleanSport)) {
    return { ok: false, error: `Invalid sport. Supported sports: ${SPORT_OPTIONS.join(", ")}.` };
  }
  if (turf.sports?.length > 0 && !turf.sports.includes(cleanSport)) {
    return { ok: false, error: `The selected venue does not support ${cleanSport}.` };
  }

  if (!TOURNAMENT_FORMATS.includes(format)) {
    return { ok: false, error: `Invalid format. Must be one of: ${TOURNAMENT_FORMATS.join(", ")}.` };
  }

  const numTeamSize = Number(teamSize);
  if (!Number.isInteger(numTeamSize) || numTeamSize < 1 || numTeamSize > 30) {
    return { ok: false, error: "Team size must be between 1 and 30 players." };
  }

  const numMaxTeams = Number(maxTeams);
  if (!Number.isInteger(numMaxTeams) || numMaxTeams < 2 || numMaxTeams > 64) {
    return { ok: false, error: "Max teams must be between 2 and 64." };
  }

  const numEntryFee = Math.max(0, Number(entryFee || 0));
  const numPlatformFee = Math.max(0, Number(platformFee || 0));
  const numPrizePool = Math.max(0, Number(prizePool || 0));

  // Policy: "Do not promise prizes or payouts that have not been funded or approved."
  // Total potential collection = numEntryFee * numMaxTeams
  const maxAllowablePrize = numEntryFee * numMaxTeams;
  if (numPrizePool > maxAllowablePrize && numEntryFee > 0) {
    return {
      ok: false,
      error: `Promised prize pool (₹${numPrizePool}) exceeds maximum funded collection (₹${maxAllowablePrize}). Unfunded prizes are not permitted.`,
    };
  }

  if (!startDate || !endDate || !registrationDeadline) {
    return { ok: false, error: "Start date, end date, and registration deadline are required." };
  }

  if (startDate < currentDate) {
    return { ok: false, error: "Tournament start date cannot be in the past." };
  }

  if (endDate < startDate) {
    return { ok: false, error: "Tournament end date cannot be before start date." };
  }

  const deadlineDate = new Date(registrationDeadline);
  const startDateTime = new Date(`${startDate}T23:59:59`);
  if (deadlineDate > startDateTime) {
    return { ok: false, error: "Registration deadline must be before tournament start date." };
  }

  // Turf owner approval requirement:
  // If creator is the turf owner or admin, turf approval is immediate.
  // Otherwise, turf approval starts as 'pending'.
  const isTurfOwner = turf.owner_id === organizerId;
  const isAdmin = organizerRole === "admin";
  const turfApprovalStatus = isTurfOwner || isAdmin ? "approved" : "pending";
  const adminApprovalStatus = "approved"; // platform policy auto-approved unless flagged

  const initialStatus = turfApprovalStatus === "approved" ? "open" : "pending_approval";

  return {
    ok: true,
    data: {
      turfId: turf.id,
      organizerId,
      title: cleanTitle,
      description: String(description || "").trim().slice(0, 2000),
      sport: cleanSport,
      format,
      teamSize: numTeamSize,
      maxTeams: numMaxTeams,
      entryFee: numEntryFee,
      platformFee: numPlatformFee,
      prizePool: numPrizePool,
      prizeDescription: String(prizeDescription || "").trim().slice(0, 500),
      rules: String(rules || "").trim().slice(0, 3000),
      registrationDeadline: deadlineDate.toISOString(),
      startDate,
      endDate,
      turfApprovalStatus,
      adminApprovalStatus,
      status: initialStatus,
    },
  };
}

/**
 * Calculates transparent fees and prize breakdowns.
 */
export function calculateTournamentFinancials({ entryFee, registeredTeamsCount, maxTeams, platformFeeRate = 0.05 }) {
  const fee = Math.max(0, Number(entryFee || 0));
  const currentTeams = Number(registeredTeamsCount || 0);
  const potentialTeams = Number(maxTeams || 0);

  const currentGross = fee * currentTeams;
  const potentialGross = fee * potentialTeams;

  const currentPlatformCut = Math.round(currentGross * platformFeeRate);
  const potentialPlatformCut = Math.round(potentialGross * platformFeeRate);

  const currentNetPool = currentGross - currentPlatformCut;
  const potentialNetPool = potentialGross - potentialPlatformCut;

  return {
    entryFeePerTeam: fee,
    registeredTeams: currentTeams,
    maxTeams: potentialTeams,
    currentCollection: currentGross,
    potentialCollection: potentialGross,
    platformFeeRate,
    currentPlatformFee: currentPlatformCut,
    potentialPlatformFee: potentialPlatformCut,
    currentNetPrizePool: currentNetPool,
    potentialNetPrizePool: potentialNetPool,
  };
}

/**
 * Validates registration for a tournament.
 */
export function validateTournamentRegistration({
  tournament,
  user,
  team,
  teamName,
  existingRegistration,
  registeredCount = 0,
  now = new Date(),
}) {
  if (!tournament || !tournament.id) {
    return { ok: false, error: "Tournament not found." };
  }

  if (tournament.turf_approval_status !== "approved" || tournament.admin_approval_status !== "approved") {
    return { ok: false, error: "This tournament is awaiting venue or admin approval." };
  }

  if (tournament.status !== "open") {
    return {
      ok: false,
      error: tournament.status === "registration_closed"
        ? "Registration for this tournament has closed."
        : "This tournament is not currently open for registration.",
    };
  }

  if (new Date(tournament.registration_deadline) <= now) {
    return { ok: false, error: "Registration deadline has passed." };
  }

  if (registeredCount >= tournament.max_teams) {
    return { ok: false, error: "This tournament has reached maximum team capacity." };
  }

  if (existingRegistration) {
    return { ok: false, error: "You or your team are already registered for this tournament." };
  }

  const cleanTeamName = String(teamName || team?.name || "").trim();
  if (cleanTeamName.length < 2 || cleanTeamName.length > 60) {
    return { ok: false, error: "Team name must be between 2 and 60 characters." };
  }

  return {
    ok: true,
    data: {
      tournamentId: tournament.id,
      registeredBy: user.id,
      teamId: team?.id || null,
      teamName: cleanTeamName,
      entryFee: Number(tournament.entry_fee || 0),
    },
  };
}

/**
 * Builds authoritative payment order for tournament registration.
 */
export function buildTournamentPaymentOrder({ tournament, teamName, user, idempotencyKey = null }) {
  const entryFee = Number(tournament.entry_fee || 0);
  const platformFee = 0; // Demo mode: 0 platform surcharge
  const totalPayable = entryFee + platformFee;

  const hashSeed = `tournament:${tournament.id}:${user.id}:${idempotencyKey || Date.now()}`;
  const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
  const transactionReference = `VT-TRN-${refSuffix}`;

  return {
    tournamentId: tournament.id,
    tournamentTitle: tournament.title,
    turfId: tournament.turf_id,
    teamName,
    userId: user.id,
    userName: user.full_name || "Captain",
    entryFee,
    platformFee,
    totalPayable,
    transactionReference,
    paymentMethod: "demo_simulated",
    isSimulated: true,
  };
}

/**
 * Generates initial round 1 fixtures for registered teams.
 */
export function generateTournamentFixtures({ tournamentId, registrations = [] }) {
  if (!tournamentId || registrations.length < 2) {
    return [];
  }

  const fixtures = [];
  // Shuffle registrations deterministically or sequentially
  const teams = [...registrations];

  let matchNumber = 1;
  for (let i = 0; i < teams.length; i += 2) {
    const home = teams[i];
    const away = teams[i + 1] || null; // Bye if odd count

    fixtures.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: matchNumber++,
      home_registration_id: home.id,
      away_registration_id: away ? away.id : null,
      winner_registration_id: away ? null : home.id, // Auto-advance on bye
      status: away ? "scheduled" : "completed",
    });
  }

  return fixtures;
}

/**
 * Validates score submission for a fixture.
 */
export function validateScoreSubmission({
  fixture,
  tournament,
  homeScore,
  awayScore,
  requestingUserId,
  userRole = "player",
}) {
  if (!fixture || !fixture.id) {
    return { ok: false, error: "Fixture not found." };
  }

  const isOrganizer = tournament?.organizer_id === requestingUserId;
  const isAdmin = userRole === "admin";
  if (!isOrganizer && !isAdmin) {
    return { ok: false, error: "Only the tournament organizer or admin can submit match scores." };
  }

  if (tournament.status === "completed" && !isAdmin) {
    return { ok: false, error: "Tournament is already completed. Scores are finalized." };
  }

  const numHome = Number(homeScore);
  const numAway = Number(awayScore);

  if (!Number.isInteger(numHome) || numHome < 0 || !Number.isInteger(numAway) || numAway < 0) {
    return { ok: false, error: "Scores must be non-negative integers." };
  }

  // In knockout matches, draws cannot advance a winner without extra rules
  let winnerId = null;
  if (tournament.format === "knockout") {
    if (numHome === numAway) {
      return { ok: false, error: "Knockout matches cannot end in a draw. Please include penalty/overtime scores." };
    }
    winnerId = numHome > numAway ? fixture.home_registration_id : fixture.away_registration_id;
  } else {
    if (numHome > numAway) winnerId = fixture.home_registration_id;
    else if (numAway > numHome) winnerId = fixture.away_registration_id;
  }

  return {
    ok: true,
    data: {
      homeScore: numHome,
      awayScore: numAway,
      winnerRegistrationId: winnerId,
      status: "completed",
    },
  };
}

/**
 * Computes league/round-robin standings table.
 */
export function calculateStandings({ registrations = [], fixtures = [] }) {
  const standingsMap = new Map();

  registrations.forEach((reg) => {
    standingsMap.set(reg.id, {
      id: reg.id,
      teamName: reg.team_name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  fixtures.forEach((f) => {
    if (f.status !== "completed" || f.home_score === null || f.away_score === null) return;

    const home = standingsMap.get(f.home_registration_id);
    const away = standingsMap.get(f.away_registration_id);

    if (home) {
      home.played += 1;
      home.goalsFor += f.home_score;
      home.goalsAgainst += f.away_score;
      if (f.home_score > f.away_score) {
        home.won += 1;
        home.points += 3;
      } else if (f.home_score === f.away_score) {
        home.drawn += 1;
        home.points += 1;
      } else {
        home.lost += 1;
      }
    }

    if (away) {
      away.played += 1;
      away.goalsFor += f.away_score;
      away.goalsAgainst += f.home_score;
      if (f.away_score > f.home_score) {
        away.won += 1;
        away.points += 3;
      } else if (f.home_score === f.away_score) {
        away.drawn += 1;
        away.points += 1;
      } else {
        away.lost += 1;
      }
    }
  });

  const table = Array.from(standingsMap.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  // Sort by Points DESC, Goal Diff DESC, Goals For DESC
  table.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

  return table;
}

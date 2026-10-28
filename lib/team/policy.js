// lib/team/policy.js
// Business rules, validations, and security policies for Team Management.

import { createHash, randomBytes } from "crypto";
import { SPORT_OPTIONS } from "../sports.js";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates team creation request.
 */
export function validateTeamCreation({ name, sport, description = "", captainId, logoUrl = "" }) {
  if (!captainId || !UUID_PATTERN.test(captainId)) {
    return { ok: false, error: "Valid captain profile is required." };
  }

  const cleanName = String(name || "").trim();
  if (cleanName.length < 2 || cleanName.length > 60) {
    return { ok: false, error: "Team name must be between 2 and 60 characters." };
  }

  const cleanSport = String(sport || "").trim();
  if (!cleanSport || !SPORT_OPTIONS.includes(cleanSport)) {
    return { ok: false, error: `Invalid sport. Supported sports: ${SPORT_OPTIONS.join(", ")}.` };
  }

  const cleanDesc = String(description || "").trim();
  if (cleanDesc.length > 500) {
    return { ok: false, error: "Description must not exceed 500 characters." };
  }

  const cleanLogo = String(logoUrl || "").trim();
  if (cleanLogo && cleanLogo.length > 1000) {
    return { ok: false, error: "Logo URL is too long." };
  }

  return {
    ok: true,
    data: {
      name: cleanName,
      sport: cleanSport,
      description: cleanDesc,
      captainId,
      logoUrl: cleanLogo,
    },
  };
}

/**
 * Generates a secure, URL-safe invitation token with expiry.
 */
export function generateInviteToken(teamId) {
  const seed = `${teamId}:${Date.now()}:${randomBytes(16).toString("hex")}`;
  return createHash("sha256").update(seed).digest("base64url").slice(0, 32);
}

/**
 * Validates team invitation generation parameters.
 */
export function validateTeamInvite({ team, captainId, maxUses = 10, expiryHours = 72 }) {
  if (!team || !team.id) {
    return { ok: false, error: "Invalid team record." };
  }
  if (team.captain_id !== captainId) {
    return { ok: false, error: "Only the team captain can create invite links." };
  }

  const parsedUses = Number(maxUses);
  if (!Number.isInteger(parsedUses) || parsedUses < 1 || parsedUses > 100) {
    return { ok: false, error: "Max uses must be an integer between 1 and 100." };
  }

  const parsedHours = Number(expiryHours);
  if (!Number.isFinite(parsedHours) || parsedHours < 1 || parsedHours > 720) {
    return { ok: false, error: "Expiry must be between 1 hour and 30 days (720 hours)." };
  }

  const expiresAt = new Date(Date.now() + parsedHours * 60 * 60 * 1000).toISOString();
  const token = generateInviteToken(team.id);

  return {
    ok: true,
    data: {
      teamId: team.id,
      createdBy: captainId,
      token,
      expiresAt,
      maxUses: parsedUses,
    },
  };
}

/**
 * Validates joining a team via invite token.
 */
export function validateInviteRedemption({ invite, playerId, existingMember }) {
  if (!playerId || !UUID_PATTERN.test(playerId)) {
    return { ok: false, error: "Invalid player ID." };
  }
  if (!invite) {
    return { ok: false, error: "Invitation not found or link is invalid." };
  }
  if (invite.revoked) {
    return { ok: false, error: "This invitation link has been revoked by the captain." };
  }
  if (new Date(invite.expires_at) <= new Date()) {
    return { ok: false, error: "This invitation link has expired." };
  }
  if (invite.uses >= invite.max_uses) {
    return { ok: false, error: "This invitation link has reached its maximum number of uses." };
  }
  if (existingMember) {
    return { ok: false, error: "You are already a member of this team." };
  }

  return { ok: true };
}

/**
 * Authorization guard for roster management actions.
 */
export function canManageRoster({ team, memberToManage, requestingUserId, action }) {
  if (!team || !requestingUserId) return false;
  const isCaptain = team.captain_id === requestingUserId;

  switch (action) {
    case "invite":
    case "revoke_invite":
    case "change_role":
      return isCaptain;

    case "remove_member":
      if (!memberToManage) return false;
      // Captain cannot be removed; captain can remove any member; members can remove themselves (leave)
      if (memberToManage.player_id === team.captain_id) return false;
      return isCaptain || memberToManage.player_id === requestingUserId;

    case "view_private_details":
      return isCaptain || memberToManage?.player_id === requestingUserId;

    default:
      return false;
  }
}

/**
 * Validates team booking request to prevent conflicts.
 */
export function validateTeamBooking({ team, bookingDate, startTime, activeBookings = [] }) {
  if (!team || !team.id) {
    return { ok: false, error: "Invalid team." };
  }

  // Prevent conflicting concurrent booking for the same team at the same date & time
  const hasConflict = activeBookings.some((b) =>
    b.team_id === team.id &&
    b.booking_date === bookingDate &&
    b.start_time.slice(0, 5) === startTime.slice(0, 5) &&
    ["pending", "confirmed"].includes(b.status)
  );

  if (hasConflict) {
    return {
      ok: false,
      error: `Team "${team.name}" already has an active booking on ${bookingDate} at ${startTime.slice(0, 5)}.`,
    };
  }

  return { ok: true };
}

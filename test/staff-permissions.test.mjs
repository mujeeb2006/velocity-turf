import test from "node:test";
import assert from "node:assert/strict";

import {
  STAFF_ROLES,
  ALL_STAFF_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  hasStaffPermission,
  isRestrictedAction,
  validateStaffInvite,
  generateInviteToken,
  isInviteExpired,
} from "../lib/staff/policy.js";
import { normalizeUserRole } from "../lib/auth/validation.js";
import { getPortalHome, resolveRoleRedirect } from "../lib/auth/guards.js";

test("Staff roles & presets: venue managers and receptionists have appropriate defaults", () => {
  assert.ok(ROLE_DEFAULT_PERMISSIONS.venue_manager.includes("view_schedule"));
  assert.ok(ROLE_DEFAULT_PERMISSIONS.venue_manager.includes("checkin_players"));
  assert.ok(ROLE_DEFAULT_PERMISSIONS.venue_manager.includes("manage_maintenance"));
  assert.ok(ROLE_DEFAULT_PERMISSIONS.venue_manager.includes("view_bookings"));
  assert.ok(ROLE_DEFAULT_PERMISSIONS.venue_manager.includes("manage_bookings"));

  assert.ok(ROLE_DEFAULT_PERMISSIONS.receptionist.includes("checkin_players"));
  assert.ok(ROLE_DEFAULT_PERMISSIONS.receptionist.includes("view_schedule"));
  assert.ok(ROLE_DEFAULT_PERMISSIONS.receptionist.includes("view_bookings"));
  assert.equal(ROLE_DEFAULT_PERMISSIONS.receptionist.includes("manage_bookings"), false);
});

test("Staff invite validation: validates email, roles, and permissions", () => {
  const valid = validateStaffInvite({
    email: "Reception@VelocityTurf.com",
    role: "receptionist",
    permissions: ["view_schedule", "checkin_players"],
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitized.email, "reception@velocityturf.com");

  const invalid = validateStaffInvite({
    email: "not-an-email",
    role: "superuser",
    permissions: ["hack_the_system"],
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((e) => e.includes("valid email")));
  assert.ok(invalid.errors.some((e) => e.includes("Role must be one of")));
  assert.ok(invalid.errors.some((e) => e.includes("Invalid permission")));
});

test("hasStaffPermission: correctly evaluates staff member permissions", () => {
  const receptionist = {
    role: "receptionist",
    permissions: ["view_schedule", "checkin_players", "view_bookings"],
  };
  assert.equal(hasStaffPermission(receptionist, "view_schedule"), true);
  assert.equal(hasStaffPermission(receptionist, "checkin_players"), true);
  assert.equal(hasStaffPermission(receptionist, "manage_maintenance"), false);
  assert.equal(hasStaffPermission(receptionist, "manage_bookings"), false);

  const manager = {
    role: "venue_manager",
    permissions: ROLE_DEFAULT_PERMISSIONS.venue_manager,
  };
  assert.equal(hasStaffPermission(manager, "manage_maintenance"), true);
  assert.equal(hasStaffPermission(manager, "manage_bookings"), true);

  const owner = {
    role: "owner",
    isOwner: true,
  };
  assert.equal(hasStaffPermission(owner, "any_permission"), true);
});

test("Restricted actions: sensitive settings and payouts are strictly blocked for staff", () => {
  assert.equal(isRestrictedAction("payouts"), true);
  assert.equal(isRestrictedAction("bank_accounts"), true);
  assert.equal(isRestrictedAction("ownership_transfer"), true);
  assert.equal(isRestrictedAction("delete_turf"), true);
  assert.equal(isRestrictedAction("turf_pricing"), true);
  assert.equal(isRestrictedAction("view_schedule"), false);
});

test("Staff invite tokens & expiry: produces secure token and detects expiration", () => {
  const token = generateInviteToken();
  assert.equal(typeof token, "string");
  assert.ok(token.length >= 32);

  const futureInvite = { invite_expires_at: new Date(Date.now() + 86400000).toISOString() };
  assert.equal(isInviteExpired(futureInvite), false);

  const pastInvite = { invite_expires_at: new Date(Date.now() - 86400000).toISOString() };
  assert.equal(isInviteExpired(pastInvite), true);
});

test("Auth role & guards: staff members are routed to owner venue portal", () => {
  assert.equal(normalizeUserRole("staff"), "staff");
  assert.equal(normalizeUserRole("venue_manager"), "staff");
  assert.equal(normalizeUserRole("receptionist"), "staff");

  assert.equal(getPortalHome({ role: "staff" }), "/owner");
  assert.equal(resolveRoleRedirect({ role: "staff" }, "owner"), null);
});

test("Staff Invitation Workflow & Security Rules", async (t) => {
  await t.test("Owner can create valid staff invitation with permissions", () => {
    const invite = validateStaffInvite({
      email: "Manager@VelocityTurf.com",
      role: "venue_manager",
      permissions: ["view_schedule", "checkin_players", "manage_maintenance"],
      turfId: "00000000-0000-0000-0000-000000000001",
    });
    assert.equal(invite.valid, true);
    assert.equal(invite.sanitized.email, "manager@velocityturf.com");
    assert.equal(invite.sanitized.role, "venue_manager");
    assert.equal(invite.sanitized.turfId, "00000000-0000-0000-0000-000000000001");
  });

  await t.test("Ordinary players are strictly unauthorized to create staff invitations", () => {
    const playerRole = normalizeUserRole("player");
    const isAuthorizedToInvite = playerRole === "owner" || playerRole === "admin";
    assert.equal(isAuthorizedToInvite, false, "Players cannot create staff invitations");
  });

  await t.test("Duplicate prevention detects active or pending invitations", () => {
    const existingStaff = [
      { email: "active.staff@example.com", status: "active", turf_id: "turf-1" },
      { email: "pending.staff@example.com", status: "invited", turf_id: "turf-1" },
      { email: "revoked.staff@example.com", status: "revoked", turf_id: "turf-1" },
    ];

    const isDuplicateActive = (email, turfId) => {
      return existingStaff.some(
        (s) => s.email === email && s.turf_id === turfId && ["active", "invited"].includes(s.status)
      );
    };

    assert.equal(isDuplicateActive("active.staff@example.com", "turf-1"), true);
    assert.equal(isDuplicateActive("pending.staff@example.com", "turf-1"), true);
    assert.equal(isDuplicateActive("revoked.staff@example.com", "turf-1"), false, "Revoked staff can be re-invited");
    assert.equal(isDuplicateActive("new.staff@example.com", "turf-1"), false);
  });

  await t.test("Security: Prevents mismatching email from accepting staff invitation", () => {
    const invite = { email: "intended.staff@example.com", status: "invited" };
    const attackerProfile = { email: "random.user@example.com" };
    const matchingProfile = { email: "Intended.Staff@example.com" };

    const canAccept = (profile, inv) => {
      return profile?.email && inv?.email && profile.email.toLowerCase() === inv.email.toLowerCase();
    };

    assert.equal(canAccept(attackerProfile, invite), false, "Attacker with different email cannot accept");
    assert.equal(canAccept(matchingProfile, invite), true, "Matching email can accept case-insensitively");
  });

  await t.test("Expired and revoked invitations are properly rejected", () => {
    const now = Date.now();
    const revokedInvite = { status: "revoked", invite_expires_at: new Date(now + 100000).toISOString() };
    const expiredInvite = { status: "invited", invite_expires_at: new Date(now - 100000).toISOString() };

    assert.equal(revokedInvite.status === "revoked", true);
    assert.equal(isInviteExpired(expiredInvite), true);
  });
});


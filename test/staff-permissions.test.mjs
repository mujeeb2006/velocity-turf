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


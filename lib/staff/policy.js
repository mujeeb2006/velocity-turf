// lib/staff/policy.js
// Business rules and permission definitions for venue staff management.

import { randomBytes } from "crypto";
import { isValidEmail, normalizeEmail } from "../auth/validation.js";

export const STAFF_ROLES = [
  { id: "venue_manager", label: "Venue Manager", description: "Full day-to-day operations: schedule, check-ins, bookings & maintenance." },
  { id: "receptionist", label: "Receptionist", description: "Front-desk operations: view schedule, check in arriving players & view bookings." },
  { id: "maintenance_staff", label: "Maintenance Crew", description: "Facility management: view schedule & update maintenance tasks." },
  { id: "custom", label: "Custom Role", description: "Granularly select individual permissions for this staff member." },
];

export const ALL_STAFF_PERMISSIONS = [
  { id: "view_schedule", label: "View Schedule", description: "View calendar, court slots, and day timeline." },
  { id: "checkin_players", label: "Check-in & Attendance", description: "Check in players and mark booking attendance." },
  { id: "view_bookings", label: "View Bookings", description: "View customer booking history and details." },
  { id: "manage_bookings", label: "Manage Bookings", description: "Confirm or cancel customer bookings." },
  { id: "manage_maintenance", label: "Manage Maintenance", description: "Create, assign, and resolve facility maintenance tasks." },
  { id: "manage_staff", label: "Manage Staff", description: "View staff list and invite teammates (venue managers only)." },
];

export const ROLE_DEFAULT_PERMISSIONS = {
  venue_manager: ["view_schedule", "checkin_players", "view_bookings", "manage_bookings", "manage_maintenance"],
  receptionist: ["view_schedule", "checkin_players", "view_bookings"],
  maintenance_staff: ["view_schedule", "manage_maintenance"],
  custom: ["view_schedule"],
};

// Actions that are strictly reserved for the owner (and super-admin)
export const RESTRICTED_ACTIONS = [
  "payouts",
  "bank_accounts",
  "ownership_transfer",
  "delete_turf",
  "turf_pricing",
  "sensitive_settings",
];

export function isRestrictedAction(action) {
  return RESTRICTED_ACTIONS.includes(action);
}

export function hasStaffPermission(staffMember, permission) {
  if (!staffMember) return false;
  // If the user is the owner, they have all permissions
  if (staffMember.role === "owner" || staffMember.isOwner) return true;
  // Venue manager gets all operational permissions by default
  if (staffMember.role === "venue_manager") {
    if (ROLE_DEFAULT_PERMISSIONS.venue_manager.includes(permission)) return true;
  }
  const perms = Array.isArray(staffMember.permissions) ? staffMember.permissions : [];
  return perms.includes(permission);
}

export function generateInviteToken() {
  return randomBytes(24).toString("hex");
}

export function calculateInviteExpiry(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isInviteExpired(invite) {
  if (!invite?.invite_expires_at) return false;
  return new Date(invite.invite_expires_at).getTime() < Date.now();
}

export function validateStaffInvite({ email, role, permissions = [], turfId = null }) {
  const errors = [];
  const normalized = normalizeEmail(email);

  if (!isValidEmail(normalized)) {
    errors.push("A valid email address is required.");
  }

  const validRoleIds = STAFF_ROLES.map((r) => r.id);
  if (!validRoleIds.includes(role)) {
    errors.push(`Role must be one of: ${validRoleIds.join(", ")}`);
  }

  const validPermIds = ALL_STAFF_PERMISSIONS.map((p) => p.id);
  for (const perm of permissions) {
    if (!validPermIds.includes(perm)) {
      errors.push(`Invalid permission: ${perm}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      email: normalized,
      role,
      permissions: permissions.length > 0 ? permissions : (ROLE_DEFAULT_PERMISSIONS[role] || []),
      turfId: turfId || null,
    },
  };
}


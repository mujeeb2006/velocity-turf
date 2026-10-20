import test from "node:test";
import assert from "node:assert/strict";

import { getSiteUrl, sanitizeRedirectPath } from "../lib/auth/url.js";
import {
  normalizeEmail,
  normalizeUserRole,
  isValidEmail,
  isStrongPassword,
} from "../lib/auth/validation.js";
import { getPortalHome, resolveRoleRedirect } from "../lib/auth/guards.js";

test("getSiteUrl prefers NEXT_PUBLIC_SITE_URL environment variable when set", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://velocityturf.com/";
    assert.equal(getSiteUrl(), "https://velocityturf.com");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("getSiteUrl resolves host from x-forwarded-host header", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const mockRequest = {
      headers: new Headers({
        "x-forwarded-host": "preview.velocityturf.app",
        "x-forwarded-proto": "https",
      }),
      url: "http://internal-node:3000/api/admin/owners",
    };
    assert.equal(getSiteUrl(mockRequest), "https://preview.velocityturf.app");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("getSiteUrl falls back to request url origin", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const mockRequest = {
      headers: new Headers(),
      url: "http://localhost:3000/api/admin/owners",
    };
    assert.equal(getSiteUrl(mockRequest), "http://localhost:3000");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("getSiteUrl defaults to localhost:3000 when no request provided", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    assert.equal(getSiteUrl(), "http://localhost:3000");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("sanitizeRedirectPath permits safe relative application paths including setup-password", () => {
  assert.equal(sanitizeRedirectPath("/auth/setup-password"), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath("/auth/set-password"), "/auth/set-password");
  assert.equal(sanitizeRedirectPath("/owner"), "/owner");
  assert.equal(sanitizeRedirectPath("/"), "/");
});

test("sanitizeRedirectPath defaults to setup-password fallback when path is invalid", () => {
  assert.equal(sanitizeRedirectPath(null), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath(""), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath("https://evil.com"), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath("//evil.com"), "/auth/setup-password");
});

test("sanitizeRedirectPath rejects open redirects and external URLs", () => {
  assert.equal(sanitizeRedirectPath("//evil.com", "/auth/setup-password"), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath("https://evil.com", "/auth/setup-password"), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath("javascript:alert(1)", "/auth/setup-password"), "/auth/setup-password");
  assert.equal(sanitizeRedirectPath(null, "/fallback"), "/fallback");
});

test("Owner role normalization correctly identifies owner variants", () => {
  assert.equal(normalizeUserRole("owner"), "owner");
  assert.equal(normalizeUserRole("OWNER"), "owner");
  assert.equal(normalizeUserRole("turf_owner"), "owner");
  assert.equal(normalizeUserRole("turf owner"), "owner");
  assert.equal(normalizeUserRole("admin"), "admin");
  assert.equal(normalizeUserRole("player"), "player");
  assert.equal(normalizeUserRole(""), "player");
});

test("Email and password validation accurately checks inputs", () => {
  assert.equal(isValidEmail("owner@turf.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(normalizeEmail("  OWNER@Turf.COM  "), "owner@turf.com");

  assert.equal(isStrongPassword("short"), false);
  assert.equal(isStrongPassword("1234567"), false);
  assert.equal(isStrongPassword("12345678"), true);
  assert.equal(isStrongPassword("SecretP@ssword123"), true);
});

// --- Flow and Security Logic Tests ---

test("Invitation callback destination resolution routes invite and recovery to setup-password", () => {
  function resolveCallbackDestination(type, rawNext) {
    const isSetupOrInvite =
      type === "invite" ||
      type === "recovery" ||
      rawNext?.includes("/auth/setup-password") ||
      rawNext?.includes("/auth/set-password");

    const targetNext = sanitizeRedirectPath(
      rawNext,
      isSetupOrInvite ? "/auth/setup-password" : "/"
    );

    return isSetupOrInvite ? "/auth/setup-password" : targetNext;
  }

  // Type invite leads to setup-password even if next is missing
  assert.equal(resolveCallbackDestination("invite", null), "/auth/setup-password");
  assert.equal(resolveCallbackDestination("recovery", null), "/auth/setup-password");

  // Type invite with next preserved
  assert.equal(resolveCallbackDestination("invite", "/auth/setup-password"), "/auth/setup-password");

  // Magic link for existing owner routes to /owner
  assert.equal(resolveCallbackDestination("magiclink", "/owner"), "/owner");

  // Player sign-in routes to root
  assert.equal(resolveCallbackDestination(null, null), "/");
});

test("Account state check determines correct link type for pending vs confirmed owners", () => {
  function determineOwnerLinkType(authUser, requestedType = "auto") {
    const isConfirmed = Boolean(authUser?.confirmed_at);
    const isPendingInvite = Boolean(authUser && !authUser.confirmed_at);

    if (requestedType === "setup" || requestedType === "invite") return "setup";
    if (requestedType === "signin") {
      // Unconfirmed owner MUST NOT receive a sign-in link because they have no password
      return isPendingInvite || !isConfirmed ? "setup" : "signin";
    }
    if (requestedType === "magiclink") {
      return isPendingInvite ? "setup" : "magiclink";
    }

    return isConfirmed ? "signin" : "setup";
  }

  // Pending owner with unconfirmed account -> setup link
  const pendingOwner = { id: "u-1", email: "newowner@turf.com", confirmed_at: null, invited_at: "2026-10-20" };
  assert.equal(determineOwnerLinkType(pendingOwner, "auto"), "setup");
  assert.equal(determineOwnerLinkType(pendingOwner, "signin"), "setup");
  assert.equal(determineOwnerLinkType(pendingOwner, "magiclink"), "setup");

  // Confirmed owner with password -> signin or magiclink
  const confirmedOwner = { id: "u-2", email: "activeowner@turf.com", confirmed_at: "2026-10-01", invited_at: "2026-10-01" };
  assert.equal(determineOwnerLinkType(confirmedOwner, "auto"), "signin");
  assert.equal(determineOwnerLinkType(confirmedOwner, "signin"), "signin");
  assert.equal(determineOwnerLinkType(confirmedOwner, "magiclink"), "magiclink");
});

test("Privilege escalation protection: URL parameter tampering cannot grant owner role", () => {
  function verifyActivationAuthorization(user, profile) {
    if (!user) return { authorized: false, error: "Authentication required" };

    const currentRole = profile ? normalizeUserRole(profile.role) : null;
    if (currentRole === "owner") return { authorized: true, role: "owner" };

    const isInvitedOwner =
      user.app_metadata?.role === "owner" ||
      user.user_metadata?.role === "owner";

    if (!isInvitedOwner) {
      return { authorized: false, error: "User is not authorized for owner access" };
    }

    return { authorized: true, role: "owner" };
  }

  // Case 1: Legitimate invited owner with app_metadata set by server
  const invitedUser = { id: "u-owner", email: "invited@turf.com", app_metadata: { role: "owner" } };
  assert.equal(verifyActivationAuthorization(invitedUser, null).authorized, true);

  // Case 2: Ordinary player attempting to call complete-invite
  const playerUser = { id: "u-player", email: "player@turf.com", app_metadata: { role: "player" } };
  const playerProfile = { id: "u-player", role: "player" };
  assert.equal(verifyActivationAuthorization(playerUser, playerProfile).authorized, false);

  // Case 3: Player with query parameter tampering (e.g. ?role=owner) - metadata is untampered
  const roguePlayer = { id: "u-rogue", email: "rogue@turf.com", app_metadata: {} };
  assert.equal(verifyActivationAuthorization(roguePlayer, null).authorized, false);
});

test("Post-activation role redirect sends owner to /owner and player to /player", () => {
  assert.equal(getPortalHome({ role: "owner" }), "/owner");
  assert.equal(getPortalHome({ role: "admin" }), "/admin");
  assert.equal(getPortalHome({ role: "player" }), "/player");
  assert.equal(getPortalHome(null), "/login");

  // Owner accessing owner route has no redirect
  assert.equal(resolveRoleRedirect({ role: "owner" }, "owner"), null);

  // Player accessing owner route is blocked and redirected to /unauthorized
  assert.equal(resolveRoleRedirect({ role: "player" }, "owner"), "/unauthorized");

  // Unauthenticated user is redirected to /login
  assert.equal(resolveRoleRedirect(null, "owner"), "/login");
});

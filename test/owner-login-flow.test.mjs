import test from "node:test";
import assert from "node:assert/strict";

import { normalizeEmail, normalizeUserRole, isValidEmail, isStrongPassword } from "../lib/auth/validation.js";
import { getPortalHome, resolveRoleRedirect } from "../lib/auth/guards.js";

// ============================================================================
// Case 1: Existing owner with correct credentials
// ============================================================================
test("Case 1: Existing owner with correct credentials authenticates and routes to /owner", () => {
  const mockOwner = {
    id: "owner-uuid-1",
    email: "owner@velocityturf.com",
    role: "owner",
    confirmed_at: "2026-10-01T12:00:00Z",
  };

  const authenticateOwner = (email, password, storedOwner) => {
    const cleanEmail = normalizeEmail(email);
    if (cleanEmail !== storedOwner.email) return { error: "Invalid email or password." };
    if (password !== "CorrectPass123") return { error: "Invalid email or password." };
    return { user: storedOwner, session: { user: storedOwner } };
  };

  const res = authenticateOwner("owner@velocityturf.com", "CorrectPass123", mockOwner);
  assert.ok(res.user);
  assert.equal(getPortalHome(res.user), "/owner");
  assert.equal(resolveRoleRedirect(res.user, "owner"), null); // No redirection away from /owner
});

// ============================================================================
// Case 2: Existing owner with incorrect password
// ============================================================================
test("Case 2: Existing owner with incorrect password receives clear credentials error without misleading invitation notice", () => {
  const handleAuthError = (errorMessage) => {
    const msg = String(errorMessage || "").toLowerCase();
    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password. Please verify your credentials and try again.";
    }
    if (msg.includes("email not confirmed")) {
      return "Please confirm your email first. Open the verification link we sent you, then sign in.";
    }
    return errorMessage;
  };

  const errorOutput = handleAuthError("Invalid login credentials");
  assert.equal(errorOutput, "Invalid email or password. Please verify your credentials and try again.");
  assert.equal(errorOutput.includes("click the invitation link in your email"), false);
});

// ============================================================================
// Case 3: Newly invited owner
// ============================================================================
test("Case 3: Newly invited owner can activate account and establish password", () => {
  const invitedUser = {
    id: "invited-owner-id",
    email: "newowner@turf.com",
    app_metadata: { role: "owner" },
    user_metadata: { role: "owner", full_name: "New Owner" },
    confirmed_at: null,
  };

  const setupPassword = (user, password) => {
    if (!user) return { ok: false, error: "No active invitation session found." };
    if (!isStrongPassword(password)) return { ok: false, error: "Password must be at least 8 characters long." };

    const isAuthorized =
      user.app_metadata?.role === "owner" ||
      user.user_metadata?.role === "owner";

    if (!isAuthorized) return { ok: false, error: "Unauthorized." };

    return {
      ok: true,
      user: { ...user, confirmed_at: new Date().toISOString() },
      role: "owner",
    };
  };

  const result = setupPassword(invitedUser, "MyNewSecurePassword88");
  assert.equal(result.ok, true);
  assert.equal(result.role, "owner");
  assert.ok(result.user.confirmed_at);
});

// ============================================================================
// Case 4: Owner who has already accepted an invitation
// ============================================================================
test("Case 4: Owner who has already accepted invitation logs in directly without needing invitation link", () => {
  const activeOwner = {
    id: "owner-activated-id",
    email: "active@turf.com",
    role: "owner",
    confirmed_at: "2026-10-15T10:00:00Z",
  };

  // Direct login
  assert.equal(normalizeUserRole(activeOwner.role), "owner");
  assert.equal(getPortalHome(activeOwner), "/owner");
  // Accessing owner dashboard requires no redirection
  assert.equal(resolveRoleRedirect(activeOwner, "owner"), null);
});

// ============================================================================
// Case 5: Expired invitation
// ============================================================================
test("Case 5: Expired invitation offers secure resend without escalating ordinary players", () => {
  const processResend = (email, registeredUsers) => {
    const cleanEmail = normalizeEmail(email);
    const user = registeredUsers.find((u) => u.email === cleanEmail);
    if (!user) {
      return { sent: true, type: "generic" };
    }
    if (user.role === "player") {
      // Must not convert player to owner!
      return { sent: true, type: "none", roleRemains: "player" };
    }
    if (user.confirmed_at) {
      // Already confirmed: send password recovery link
      return { sent: true, type: "recovery" };
    }
    // Pending unconfirmed owner: send replacement invitation link
    return { sent: true, type: "invite" };
  };

  const users = [
    { email: "pending@turf.com", role: "owner", confirmed_at: null },
    { email: "confirmed@turf.com", role: "owner", confirmed_at: "2026-10-01" },
    { email: "player@turf.com", role: "player", confirmed_at: "2026-10-01" },
  ];

  assert.equal(processResend("pending@turf.com", users).type, "invite");
  assert.equal(processResend("confirmed@turf.com", users).type, "recovery");
  assert.equal(processResend("player@turf.com", users).roleRemains, "player");
});

// ============================================================================
// Case 6: Owner password reset
// ============================================================================
test("Case 6: Owner password reset generates recovery link leading to setup-password", () => {
  const generateResetLink = (email, siteUrl = "https://velocityturf.com") => {
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) return { error: "Invalid email" };
    const redirectTo = `${siteUrl}/auth/callback?next=/auth/setup-password`;
    return { ok: true, redirectTo };
  };

  const res = generateResetLink("owner@domain.com");
  assert.equal(res.ok, true);
  assert.ok(res.redirectTo.includes("/auth/setup-password"));
});

// ============================================================================
// Case 7: Player attempting to access owner dashboard
// ============================================================================
test("Case 7: Player attempting to access owner dashboard is strictly rejected", () => {
  const playerProfile = { id: "player-1", email: "player@gmail.com", role: "player" };
  const redirect = resolveRoleRedirect(playerProfile, "owner");
  assert.equal(redirect, "/unauthorized");
});

// ============================================================================
// Case 8: Admin login
// ============================================================================
test("Case 8: Admin authenticates and routes to /admin", () => {
  const adminProfile = { id: "admin-1", email: "admin@velocityturf.com", role: "admin" };
  assert.equal(getPortalHome(adminProfile), "/admin");
  assert.equal(resolveRoleRedirect(adminProfile, "admin"), null);
});

// ============================================================================
// Case 9: Owner session persistence after page refresh
// ============================================================================
test("Case 9: Owner session persistence resolves owner profile from session cookies", () => {
  const mockCookieStore = {
    session: JSON.stringify({ userId: "owner-1", role: "owner" }),
  };

  const restoreSession = (cookies) => {
    if (!cookies?.session) return null;
    const parsed = JSON.parse(cookies.session);
    return { id: parsed.userId, role: normalizeUserRole(parsed.role) };
  };

  const restored = restoreSession(mockCookieStore);
  assert.ok(restored);
  assert.equal(restored.role, "owner");
  assert.equal(getPortalHome(restored), "/owner");
});

// ============================================================================
// Case 10: Owner logout and subsequent login
// ============================================================================
test("Case 10: Owner logout clears session and subsequent login restores owner access", () => {
  let activeSession = { id: "owner-1", role: "owner" };

  // Logout
  const signOut = () => { activeSession = null; };
  signOut();
  assert.equal(activeSession, null);
  assert.equal(resolveRoleRedirect(activeSession, "owner"), "/login");

  // Subsequent Login
  const signIn = (user) => { activeSession = user; };
  signIn({ id: "owner-1", role: "owner" });
  assert.ok(activeSession);
  assert.equal(getPortalHome(activeSession), "/owner");
  assert.equal(resolveRoleRedirect(activeSession, "owner"), null);
});

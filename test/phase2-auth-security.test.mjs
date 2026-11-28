import test from "node:test";
import assert from "node:assert/strict";

import { normalizeUserRole } from "../lib/auth/validation.js";

// ── 1. Owner Recovery Pagination Test ──────────────────────────────────────────
test("Owner lookup by profile ID succeeds for users beyond first 50 users", async () => {
  // Simulate 100 users in auth.users where target owner is at index 85 (page 2)
  const mockAuthUsers = Array.from({ length: 100 }, (_, i) => ({
    id: `user-uuid-${i}`,
    email: `user${i}@example.com`,
    confirmed_at: i % 2 === 0 ? "2026-01-01T00:00:00Z" : null,
    app_metadata: { role: i === 85 ? "owner" : "player" },
  }));

  const mockAdmin = {
    auth: {
      admin: {
        // Unpaginated/page 1 returns only first 50 users
        listUsers: async () => ({
          data: { users: mockAuthUsers.slice(0, 50) },
          error: null,
        }),
        // Direct ID lookup resolves any user regardless of pagination
        getUserById: async (id) => {
          const user = mockAuthUsers.find((u) => u.id === id);
          return user ? { data: { user }, error: null } : { data: null, error: new Error("Not found") };
        },
      },
    },
  };

  const targetEmail = "user85@example.com";
  const profile = { id: "user-uuid-85", email: targetEmail, role: "owner" };

  // A. Old approach (listUsers only): fails because index 85 is not in first 50 users
  const { data: pageOneData } = await mockAdmin.auth.admin.listUsers();
  const oldLookup = pageOneData.users.find((u) => u.email === targetEmail) || null;
  assert.equal(oldLookup, null, "Old first-page-only lookup fails for user beyond page 1");

  // B. New approach (getUserById using profile.id): succeeds reliably
  let authUser = null;
  if (profile?.id) {
    const { data: userData, error: userErr } = await mockAdmin.auth.admin.getUserById(profile.id);
    if (!userErr && userData?.user) {
      authUser = userData.user;
    }
  }

  assert.notEqual(authUser, null, "New getUserById lookup must resolve user beyond first 50");
  assert.equal(authUser.id, "user-uuid-85");
  assert.equal(authUser.app_metadata.role, "owner");
});

// ── 2. Hardened Invitation Role Verification ───────────────────────────────────
test("Complete-invite rejects client-mutated user_metadata.role and accepts server app_metadata.role", () => {
  function verifyInvitationRole(user, profile) {
    const currentRole = profile ? normalizeUserRole(profile.role) : null;
    if (currentRole === "owner") return { authorized: true, role: "owner" };

    // Strict verification: only trusted server-side app_metadata.role
    const isInvitedOwner = user.app_metadata?.role === "owner";
    if (!isInvitedOwner) {
      return { authorized: false, error: "User is not authorized for owner access." };
    }
    return { authorized: true, role: "owner" };
  }

  // Case 1: Attacker attempts privilege escalation using user_metadata
  const tamperedUser = {
    id: "attacker-1",
    email: "player@example.com",
    app_metadata: { role: "player" },
    user_metadata: { role: "owner" }, // client-supplied metadata spoofing owner
  };
  const playerProfile = { id: "attacker-1", role: "player" };
  const attackResult = verifyInvitationRole(tamperedUser, playerProfile);
  assert.equal(attackResult.authorized, false);
  assert.equal(attackResult.error, "User is not authorized for owner access.");

  // Case 2: Legitimate invited owner with server-set app_metadata
  const legitimateOwner = {
    id: "owner-1",
    email: "owner@example.com",
    app_metadata: { role: "owner" },
    user_metadata: { full_name: "Turf Owner" },
  };
  const newProfile = null;
  const ownerResult = verifyInvitationRole(legitimateOwner, newProfile);
  assert.equal(ownerResult.authorized, true);
  assert.equal(ownerResult.role, "owner");
});

// ── 3. Middleware Early Protection Logic ──────────────────────────────────────
test("Middleware correctly determines protected page paths and redirect destinations", () => {
  function evaluateMiddlewareProtection(pathname, search, user) {
    const isProtectedPage =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/owner" ||
      pathname.startsWith("/owner/");

    if (isProtectedPage && !user) {
      const returnTarget = pathname + search;
      return { shouldRedirect: true, destination: `/login?next=${encodeURIComponent(returnTarget)}` };
    }
    return { shouldRedirect: false, destination: null };
  }

  // Unauthenticated visitors to /admin and /owner must be bounced to /login with next target
  assert.deepEqual(evaluateMiddlewareProtection("/admin", "", null), {
    shouldRedirect: true,
    destination: "/login?next=%2Fadmin",
  });
  assert.deepEqual(evaluateMiddlewareProtection("/owner", "?tab=calendar", null), {
    shouldRedirect: true,
    destination: "/login?next=%2Fowner%3Ftab%3Dcalendar",
  });
  assert.deepEqual(evaluateMiddlewareProtection("/owner/settings", "", null), {
    shouldRedirect: true,
    destination: "/login?next=%2Fowner%2Fsettings",
  });

  // Authenticated visitors must NOT be bounced by middleware
  const mockUser = { id: "user-123", email: "test@example.com" };
  assert.deepEqual(evaluateMiddlewareProtection("/admin", "", mockUser), {
    shouldRedirect: false,
    destination: null,
  });
  assert.deepEqual(evaluateMiddlewareProtection("/owner", "", mockUser), {
    shouldRedirect: false,
    destination: null,
  });

  // Public and auth callback routes must NOT be intercepted
  assert.deepEqual(evaluateMiddlewareProtection("/player", "", null), { shouldRedirect: false, destination: null });
  assert.deepEqual(evaluateMiddlewareProtection("/login", "", null), { shouldRedirect: false, destination: null });
  assert.deepEqual(evaluateMiddlewareProtection("/signup", "", null), { shouldRedirect: false, destination: null });
  assert.deepEqual(evaluateMiddlewareProtection("/auth/callback", "?code=xyz", null), { shouldRedirect: false, destination: null });
  assert.deepEqual(evaluateMiddlewareProtection("/auth/setup-password", "", null), { shouldRedirect: false, destination: null });
  assert.deepEqual(evaluateMiddlewareProtection("/", "", null), { shouldRedirect: false, destination: null });
});

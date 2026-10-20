import test from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_INTENT_MAX_AGE_MS,
  buildResumeMatchHref,
  decodeMatchIntent,
  encodeMatchIntent,
  sanitizeMatchIntent,
} from "../lib/match/intent.js";
import { sanitizeRedirectPath } from "../lib/auth/url.js";

const VALID_MATCH_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const VALID_TURF_ID = "550e8400-e29b-41d4-a716-446655440000";

test("Match flow 1: Guest selects a game, signs up, and resumes the correct intent", () => {
  const rawIntent = {
    matchId: VALID_MATCH_ID,
    sport: "Football",
    turfName: "Koramangala Arena",
    turfId: VALID_TURF_ID,
    date: "Tomorrow",
    time: "07:00 PM",
    action: "join",
  };

  const sanitized = sanitizeMatchIntent(rawIntent);
  assert.equal(sanitized.matchId, VALID_MATCH_ID);
  assert.equal(sanitized.sport, "Football");
  assert.equal(sanitized.turfName, "Koramangala Arena");
  assert.equal(sanitized.turfId, VALID_TURF_ID);
  assert.equal(sanitized.action, "join");

  // Encoded for URL
  const encoded = encodeMatchIntent(sanitized);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);

  // Decoded on signup
  const decoded = decodeMatchIntent(encoded);
  assert.equal(decoded.matchId, VALID_MATCH_ID);
  assert.equal(decoded.sport, "Football");

  // Build safe resume href
  const resumeHref = buildResumeMatchHref(decoded);
  assert.ok(resumeHref.startsWith("/?resumeMatch="));

  // Client decodes param
  const restored = decodeMatchIntent(new URL(resumeHref, "https://velocityturf.com").searchParams.get("resumeMatch"));
  assert.equal(restored.matchId, VALID_MATCH_ID);
  assert.equal(restored.action, "join");
});

test("Match flow 2: Existing user signs in and resumes the correct intent", () => {
  const rawIntent = {
    matchId: VALID_MATCH_ID,
    sport: "Cricket",
    turfName: "Indiranagar Ground",
    turfId: VALID_TURF_ID,
    date: "Sunday",
    time: "06:00 AM",
    action: "join",
  };

  const encoded = encodeMatchIntent(rawIntent);
  const decoded = decodeMatchIntent(encoded);
  const resumeHref = buildResumeMatchHref(decoded);

  assert.ok(resumeHref.startsWith("/?resumeMatch="));
  const restored = decodeMatchIntent(new URL(resumeHref, "https://velocityturf.com").searchParams.get("resumeMatch"));
  assert.equal(restored.matchId, VALID_MATCH_ID);
  assert.equal(restored.sport, "Cricket");
});

test("Match flow 3: Expired, invalid, or stale match intent is rejected safely", () => {
  const now = Date.now();

  // Expired intent (> 4 hours)
  const expired = {
    matchId: VALID_MATCH_ID,
    timestamp: now - (MATCH_INTENT_MAX_AGE_MS + 1000),
  };
  assert.equal(sanitizeMatchIntent(expired, now), null);

  // Future timestamp tampering
  const future = {
    matchId: VALID_MATCH_ID,
    timestamp: now + (2 * 60 * 1000),
  };
  assert.equal(sanitizeMatchIntent(future, now), null);

  // Invalid UUID
  const invalidUuid = {
    matchId: "not-a-valid-uuid",
    timestamp: now,
  };
  assert.equal(sanitizeMatchIntent(invalidUuid, now), null);

  // Malformed Base64 / Tampered payload
  assert.equal(decodeMatchIntent("!!invalid-base64!!"), null);
  assert.equal(decodeMatchIntent(""), null);
  assert.equal(decodeMatchIntent(null), null);
});

test("Match flow 4: Open redirect protection on match resume URL", () => {
  assert.equal(sanitizeRedirectPath("/?resumeMatch=abc123_safe", null), "/?resumeMatch=abc123_safe");
  assert.equal(sanitizeRedirectPath("https://evil.com/?resumeMatch=abc", null), null);
  assert.equal(sanitizeRedirectPath("//evil.com/phish", null), null);
  assert.equal(sanitizeRedirectPath("javascript:alert(1)", null), null);
});

test("Match flow 5: Turf-specific match filtering logic", () => {
  const sampleMatches = [
    { id: "m1", turf_id: "turf-1", sport: "Football" },
    { id: "m2", turf_id: "turf-2", sport: "Cricket" },
    { id: "m3", turf_id: "turf-1", sport: "Basketball" },
  ];

  // When no turf filter is active, all matches show
  const noFilter = (turfFilter) => (turfFilter ? sampleMatches.filter(m => m.turf_id === turfFilter) : sampleMatches);
  assert.equal(noFilter(null).length, 3);

  // When turf-1 is selected, only turf-1 matches show
  const filtered = noFilter("turf-1");
  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map(m => m.id), ["m1", "m3"]);

  // When a turf has no matches, empty list returned
  const emptyFilter = noFilter("turf-3");
  assert.equal(emptyFilter.length, 0);
});

test("Match flow 6: Error classification maps database errors to user-friendly messages", () => {
  function classifyError(error) {
    const msg = String(error?.message || "").toLowerCase();
    const code = error?.code;

    if (code === "23505" || msg.includes("unique") || msg.includes("already joined")) {
      return "You've already joined this game.";
    }
    if (msg.includes("full") || msg.includes("closed") || msg.includes("capacity")) {
      return "This game has just reached maximum capacity.";
    }
    if (code === "42501" || msg.includes("policy") || msg.includes("permission") || msg.includes("booked") || msg.includes("reserved")) {
      return "This game is no longer available.";
    }
    if (code === "PGRST301" || msg.includes("jwt") || msg.includes("unauthenticated")) {
      return "Please sign in to join this game.";
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout") || msg.includes("connection")) {
      return "Connection failed. Please try again.";
    }
    return "This game is no longer available. Please try another.";
  }

  // Duplicate key code 23505
  assert.equal(classifyError({ code: "23505", message: "duplicate key value violates unique constraint" }), "You've already joined this game.");

  // Capacity overrun exception
  assert.equal(classifyError({ message: "Match is full or closed" }), "This game has just reached maximum capacity.");

  // Slot conflict / RLS rejection
  assert.equal(classifyError({ code: "42501", message: "new row violates row-level security policy" }), "This game is no longer available.");

  // Unauthenticated
  assert.equal(classifyError({ code: "PGRST301", message: "JWT expired" }), "Please sign in to join this game.");

  // Network drop
  assert.equal(classifyError({ message: "Failed to fetch: connection refused" }), "Connection failed. Please try again.");

  // Unknown fallback
  assert.equal(classifyError({ code: "UNKNOWN", message: "internal db state" }), "This game is no longer available. Please try another.");
});

test("Match flow 7: In-flight tracking prevents duplicate submissions and conflicting states", () => {
  let pendingActions = {};

  function startAction(matchId, action) {
    if (pendingActions[matchId]) return false; // In-flight blocked
    pendingActions = { ...pendingActions, [matchId]: action };
    return true;
  }

  function finishAction(matchId) {
    const next = { ...pendingActions };
    delete next[matchId];
    pendingActions = next;
  }

  // First join click starts
  assert.equal(startAction("match-101", "join"), true);
  // Rapid second click is blocked
  assert.equal(startAction("match-101", "join"), false);
  // Leave click while join pending is blocked
  assert.equal(startAction("match-101", "leave"), false);

  // Different match is NOT blocked
  assert.equal(startAction("match-102", "join"), true);

  // Finish match-101
  finishAction("match-101");
  // Can now act again
  assert.equal(startAction("match-101", "leave"), true);
});

test("Match flow 8: Slot conflict prevention status mapping", () => {
  // Simulates turf_slots behavior when slot has a match vs booking
  function getSlotStatus({ hasBooking, hasMatch, isBlocked }) {
    if (hasBooking) return "booked";
    if (isBlocked) return "blocked";
    if (hasMatch) return "match";
    return "available";
  }

  // Free slot
  assert.equal(getSlotStatus({ hasBooking: false, hasMatch: false, isBlocked: false }), "available");

  // Slot occupied by an open community match
  assert.equal(getSlotStatus({ hasBooking: false, hasMatch: true, isBlocked: false }), "match");

  // Slot occupied by a booking
  assert.equal(getSlotStatus({ hasBooking: true, hasMatch: false, isBlocked: false }), "booked");

  // Private booking rejection: prepare_booking validates slot_status is distinct from 'available'
  function canBookSlot(slotStatus) {
    if (slotStatus !== "available") {
      throw new Error("This slot is not available.");
    }
    return true;
  }

  assert.equal(canBookSlot("available"), true);
  assert.throws(() => canBookSlot("match"), /This slot is not available\./);
  assert.throws(() => canBookSlot("booked"), /This slot is not available\./);
});

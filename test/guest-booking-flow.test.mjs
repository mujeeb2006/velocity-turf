import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_INTENT_MAX_AGE_MS,
  buildResumeHref,
  decodeBookingIntent,
  encodeBookingIntent,
  sanitizeBookingIntent,
} from "../lib/booking/intent.js";
import { sanitizeRedirectPath } from "../lib/auth/url.js";

const VALID_TURF_ID = "550e8400-e29b-41d4-a716-446655440000";

test("Guest flow 1: Guest selects a turf only (before picking slot), signs in, and resumes", () => {
  // 1. Guest clicks "Book now" on Discover / TurfCard
  const rawIntent = {
    turfId: VALID_TURF_ID,
    turfName: "Koramangala Football Arena",
    sport: "Football",
  };

  const sanitized = sanitizeBookingIntent(rawIntent);
  assert.equal(sanitized.turfId, VALID_TURF_ID);
  assert.equal(sanitized.turfName, "Koramangala Football Arena");
  assert.equal(sanitized.bookingDate, "");
  assert.equal(sanitized.startTime, "");

  // 2. Encoded for login/signup query param
  const encoded = encodeBookingIntent(sanitized);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);

  // 3. Decoded on Login / Signup page
  const decodedOnAuth = decodeBookingIntent(encoded);
  assert.equal(decodedOnAuth.turfId, VALID_TURF_ID);

  // 4. Successful login builds resume href
  const resumeHref = buildResumeHref(decodedOnAuth);
  assert.ok(resumeHref.startsWith("/?resumeBooking="));

  // 5. PlayerAppClient restores the intent
  const finalIntent = decodeBookingIntent(new URL(resumeHref, "https://velocityturf.com").searchParams.get("resumeBooking"));
  assert.equal(finalIntent.turfId, VALID_TURF_ID);
});

test("Guest flow 2: Guest selects a date and slot, signs up, and resumes with pre-selected slot", () => {
  const futureDate = "2026-10-25";
  const slotTime = "18:00:00";

  const rawIntent = {
    turfId: VALID_TURF_ID,
    turfName: "Indiranagar Turf Ground",
    bookingDate: futureDate,
    startTime: slotTime,
    sport: "Cricket",
  };

  const encoded = encodeBookingIntent(rawIntent);
  const decoded = decodeBookingIntent(encoded);

  assert.equal(decoded.turfId, VALID_TURF_ID);
  assert.equal(decoded.bookingDate, futureDate);
  assert.equal(decoded.startTime, slotTime);
  assert.equal(decoded.sport, "Cricket");
});

test("Guest flow 3: Expired intent (>4 hours) or future timestamp is rejected", () => {
  const now = Date.now();
  // 5 hours ago
  const expiredRaw = {
    turfId: VALID_TURF_ID,
    timestamp: now - (5 * 60 * 60 * 1000),
  };
  assert.equal(sanitizeBookingIntent(expiredRaw, now), null);

  // Future timestamp
  const futureRaw = {
    turfId: VALID_TURF_ID,
    timestamp: now + (2 * 60 * 60 * 1000),
  };
  assert.equal(sanitizeBookingIntent(futureRaw, now), null);
});

test("Guest flow 4: Redirect manipulation and open redirects are blocked", () => {
  // External domains
  assert.equal(sanitizeRedirectPath("https://evil.com/phish", "/"), "/");
  assert.equal(sanitizeRedirectPath("//evil.com", "/"), "/");
  assert.equal(sanitizeRedirectPath("///evil.com", "/"), "/");
  assert.equal(sanitizeRedirectPath("\\\\evil.com", "/"), "/");
  assert.equal(sanitizeRedirectPath("javascript:alert(document.cookie)", "/"), "/");

  // Legitimate internal paths
  assert.equal(sanitizeRedirectPath("/player", "/"), "/player");
  assert.equal(sanitizeRedirectPath("/owner", "/"), "/owner");
  assert.equal(sanitizeRedirectPath("/?resumeBooking=abc", "/"), "/?resumeBooking=abc");
});

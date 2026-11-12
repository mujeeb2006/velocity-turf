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
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const pad = (n) => String(n).padStart(2, "0");
  const futureDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

test("Guest flow 5: Guest clicks Book Confirmation on review step — preserves complete details, step 2, and players", () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const pad = (n) => String(n).padStart(2, "0");
  const bookingDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const intent = {
    turfId: VALID_TURF_ID,
    turfName: "Apex Turf Arena",
    sport: "Football",
    bookingDate,
    startTime: "20:00:00",
    players: 12,
    teamId: "e29b41d4-a716-4466-5544-0000550e8400",
    step: 2,
  };

  const encoded = encodeBookingIntent(intent);
  assert.ok(encoded);

  const decoded = decodeBookingIntent(encoded);
  assert.equal(decoded.turfId, VALID_TURF_ID);
  assert.equal(decoded.turfName, "Apex Turf Arena");
  assert.equal(decoded.sport, "Football");
  assert.equal(decoded.bookingDate, bookingDate);
  assert.equal(decoded.startTime, "20:00:00");
  assert.equal(decoded.players, 12);
  assert.equal(decoded.teamId, "e29b41d4-a716-4466-5544-0000550e8400");
  assert.equal(decoded.step, 2);

  const redirectHref = buildResumeHref(decoded);
  assert.ok(redirectHref.includes("/?resumeBooking="));
});

test("Guest flow 6: Authenticated vs unauthenticated confirmation decision guard", () => {
  function checkConfirmationFlow({ profile, turf, selectedSlot, slots }) {
    if (!profile?.id) {
      const slot = slots[selectedSlot];
      return {
        action: "redirect_to_auth",
        intent: {
          turfId: turf.id,
          turfName: turf.name,
          sport: turf.sports?.[0] || "Football",
          bookingDate: "2026-11-20",
          startTime: slot.raw_time,
          step: 2,
        },
      };
    }
    return { action: "proceed_to_booking" };
  }

  const turf = { id: VALID_TURF_ID, name: "Apex", sports: ["Football"] };
  const slots = [{ raw_time: "19:00", status: "available" }];

  // 1. Guest -> redirect
  const guestResult = checkConfirmationFlow({ profile: null, turf, selectedSlot: 0, slots });
  assert.equal(guestResult.action, "redirect_to_auth");
  assert.equal(guestResult.intent.step, 2);
  assert.equal(guestResult.intent.startTime, "19:00");

  // 2. Logged-in player -> proceed
  const loggedInResult = checkConfirmationFlow({ profile: { id: "p1" }, turf, selectedSlot: 0, slots });
  assert.equal(loggedInResult.action, "proceed_to_booking");
});

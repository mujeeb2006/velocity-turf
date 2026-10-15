import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_INTENT_MAX_AGE_MS,
  buildResumeHref,
  decodeBookingIntent,
  encodeBookingIntent,
  sanitizeBookingIntent,
} from "../lib/booking/intent.js";

const TURF_ID = "3f2b8c1e-5a47-4d9e-8b61-0c9d2e7a1f44";

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test("a turf-only intent (what a guest has before choosing a slot) is valid", () => {
  const intent = sanitizeBookingIntent({ turfId: TURF_ID, turfName: "Green Pitch" });
  assert.equal(intent.turfId, TURF_ID);
  assert.equal(intent.bookingDate, "");
  assert.equal(intent.startTime, "");
});

test("encode/decode round-trips turf, date, slot and unicode names", () => {
  const input = { turfId: TURF_ID, turfName: "Chinnaswamy Turf – ಬೆಂಗಳೂರು", bookingDate: dateOffset(2), startTime: "18:00:00", sport: "Football" };
  const encoded = encodeBookingIntent(input);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/, "must be URL-safe without further escaping");
  const decoded = decodeBookingIntent(encoded);
  assert.equal(decoded.turfId, TURF_ID);
  assert.equal(decoded.turfName, input.turfName);
  assert.equal(decoded.bookingDate, input.bookingDate);
  assert.equal(decoded.startTime, "18:00:00");
  assert.equal(decoded.sport, "Football");
});

test("rejects intents without a valid turf UUID", () => {
  assert.equal(sanitizeBookingIntent({ turfId: "not-a-uuid" }), null);
  assert.equal(sanitizeBookingIntent({ turfId: "' OR 1=1 --" }), null);
  assert.equal(sanitizeBookingIntent({}), null);
  assert.equal(sanitizeBookingIntent(null), null);
  assert.equal(sanitizeBookingIntent("string"), null);
});

test("a past date is dropped but the turf is still resumed", () => {
  const intent = sanitizeBookingIntent({ turfId: TURF_ID, bookingDate: dateOffset(-3), startTime: "18:00" });
  assert.equal(intent.turfId, TURF_ID);
  assert.equal(intent.bookingDate, "");
  assert.equal(intent.startTime, "", "a slot is meaningless without a valid date");
});

test("impossible dates and malformed times are dropped", () => {
  assert.equal(sanitizeBookingIntent({ turfId: TURF_ID, bookingDate: "2099-02-31", startTime: "18:00" }).bookingDate, "");
  const future = dateOffset(1);
  assert.equal(sanitizeBookingIntent({ turfId: TURF_ID, bookingDate: future, startTime: "25:00" }).startTime, "");
  assert.equal(sanitizeBookingIntent({ turfId: TURF_ID, bookingDate: future, startTime: "6pm" }).startTime, "");
  assert.equal(sanitizeBookingIntent({ turfId: TURF_ID, bookingDate: future, startTime: "07:30" }).startTime, "07:30");
});

test("intents expire after four hours and future timestamps are refused", () => {
  const now = Date.now();
  assert.equal(sanitizeBookingIntent({ turfId: TURF_ID, timestamp: now - BOOKING_INTENT_MAX_AGE_MS - 1000 }, now), null);
  assert.ok(sanitizeBookingIntent({ turfId: TURF_ID, timestamp: now - 60 * 1000 }, now));
  assert.equal(sanitizeBookingIntent({ turfId: TURF_ID, timestamp: now + 60 * 60 * 1000 }, now), null);
});

test("never carries prices, user ids or tokens through the intent", () => {
  const intent = sanitizeBookingIntent({
    turfId: TURF_ID, price: 1, userId: "u1", access_token: "secret", refresh_token: "secret2", payment: { card: "4111" },
  });
  assert.deepEqual(Object.keys(intent).sort(), ["bookingDate", "sport", "startTime", "timestamp", "turfId", "turfName"]);
  assert.ok(!JSON.stringify(intent).includes("secret"));
});

test("decode tolerates garbage, tampering and oversized input without throwing", () => {
  assert.equal(decodeBookingIntent(""), null);
  assert.equal(decodeBookingIntent(undefined), null);
  assert.equal(decodeBookingIntent("%%%not-base64%%%"), null);
  assert.equal(decodeBookingIntent("e30"), null); // "{}"
  assert.equal(decodeBookingIntent("A".repeat(5000)), null);
  const valid = encodeBookingIntent({ turfId: TURF_ID });
  assert.equal(decodeBookingIntent(valid.slice(0, valid.length - 7)), null, "truncated payload");
  // valid JSON, wrong shape
  assert.equal(decodeBookingIntent(Buffer.from('{"turfId":"x"}').toString("base64url")), null);
});

test("buildResumeHref targets '/' so the server can route by role, and never leaks outside the site", () => {
  const href = buildResumeHref({ turfId: TURF_ID, turfName: "A" });
  assert.ok(href.startsWith("/?resumeBooking="));
  assert.ok(!href.includes("://"));
  assert.equal(buildResumeHref({ turfId: "bad" }), "/");
});

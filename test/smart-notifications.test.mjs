import test from "node:test";
import assert from "node:assert/strict";

import {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CATEGORIES,
  sanitizeNotificationText,
  buildDedupKey,
  getUserPreferences,
} from "../lib/notifications/service.js";

test("Sanitize preview text: redacts tokens, passwords, and card credentials", () => {
  const sensitive1 = "User login attempt with token=abc123def456ghi789012 failed.";
  const sanitized1 = sanitizeNotificationText(sensitive1);
  assert.ok(!sanitized1.includes("abc123def456ghi789012"));
  assert.ok(sanitized1.includes("[REDACTED]"));

  const sensitive2 = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 authorized payment.";
  const sanitized2 = sanitizeNotificationText(sensitive2);
  assert.ok(!sanitized2.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
  assert.ok(sanitized2.includes("Bearer [REDACTED]"));

  const sensitive3 = "Payment processed for card 4111 2222 3333 4444 successfully.";
  const sanitized3 = sanitizeNotificationText(sensitive3);
  assert.ok(!sanitized3.includes("4111 2222 3333 4444"));
  assert.ok(sanitized3.includes("[CARD REDACTED]"));
});

test("buildDedupKey: generates deterministic idempotency keys", () => {
  const key1 = buildDedupKey(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_24H, "booking-123", "user-456");
  const key2 = buildDedupKey(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_24H, "booking-123", "user-456");
  const key3 = buildDedupKey(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_2H, "booking-123", "user-456");

  assert.equal(key1, key2);
  assert.notEqual(key1, key3);
  assert.equal(key1, "booking_reminder_24h:booking-123:user-456");
});

test("Notification event types and categories: covers all required application events", () => {
  assert.ok(NOTIFICATION_EVENT_TYPES.BOOKING_CONFIRMED);
  assert.ok(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_24H);
  assert.ok(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_2H);
  assert.ok(NOTIFICATION_EVENT_TYPES.PAYMENT_DUE);
  assert.ok(NOTIFICATION_EVENT_TYPES.PAYMENT_SUCCESS);
  assert.ok(NOTIFICATION_EVENT_TYPES.PAYMENT_FAILED);
  assert.ok(NOTIFICATION_EVENT_TYPES.BOOKING_CANCELLED);
  assert.ok(NOTIFICATION_EVENT_TYPES.BOOKING_RESCHEDULED);
  assert.ok(NOTIFICATION_EVENT_TYPES.GAME_INVITATION);
  assert.ok(NOTIFICATION_EVENT_TYPES.TOURNAMENT_UPDATE);
  assert.ok(NOTIFICATION_EVENT_TYPES.PACKAGE_EXPIRY);
  assert.ok(NOTIFICATION_EVENT_TYPES.MAINTENANCE_ASSIGNMENT);
  assert.ok(NOTIFICATION_EVENT_TYPES.VENUE_CHANGE);

  assert.equal(NOTIFICATION_CATEGORIES.BOOKINGS, "bookings");
  assert.equal(NOTIFICATION_CATEGORIES.PAYMENTS, "payments");
  assert.equal(NOTIFICATION_CATEGORIES.FACILITY, "facility");
});

test("Default user preferences: returns active defaults when no row in database", async () => {
  const mockAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  };

  const prefs = await getUserPreferences(mockAdmin, "user-abc");
  assert.equal(prefs.user_id, "user-abc");
  assert.equal(prefs.in_app, true);
  assert.equal(prefs.email, true);
  assert.equal(prefs.whatsapp, false);
  assert.equal(prefs.reminders_24h, true);
  assert.equal(prefs.reminders_2h, true);
});


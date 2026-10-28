// lib/notifications/service.js
// Smart notifications engine with multi-channel support, deduplication, and reminder scheduling.

export const NOTIFICATION_EVENT_TYPES = {
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_REMINDER_24H: "booking_reminder_24h",
  BOOKING_REMINDER_2H: "booking_reminder_2h",
  PAYMENT_DUE: "payment_due",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_RESCHEDULED: "booking_rescheduled",
  GAME_INVITATION: "game_invitation",
  TOURNAMENT_UPDATE: "tournament_update",
  PACKAGE_EXPIRY: "package_expiry",
  MAINTENANCE_ASSIGNMENT: "maintenance_assignment",
  VENUE_CHANGE: "venue_change",
};

export const NOTIFICATION_CATEGORIES = {
  BOOKINGS: "bookings",
  PAYMENTS: "payments",
  COMMUNITY: "community",
  FACILITY: "facility",
  GENERAL: "general",
};

/**
 * Strips sensitive tokens, passwords, and API secrets from notification previews.
 */
export function sanitizeNotificationText(text = "") {
  if (!text) return "";
  return String(text)
    // Strip tokens, secrets and passwords
    .replace(/(token|key|secret|password|pwd|cred)=([a-zA-Z0-9_\-\.]{8,})/gi, "$1=[REDACTED]")
    // Strip bearer tokens
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    // Strip credit card numbers
    .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[CARD REDACTED]");
}

/**
 * Builds an idempotent deduplication key.
 */
export function buildDedupKey(eventType, entityId, recipientId, extra = "") {
  const parts = [eventType, entityId, recipientId, extra].filter(Boolean);
  return parts.join(":");
}

/**
 * Fetch or instantiate default notification preferences for a user.
 */
export async function getUserPreferences(admin, userId) {
  if (!userId) return null;
  const { data, error } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Could not fetch notification preferences:", error);
  }

  return (
    data || {
      user_id: userId,
      in_app: true,
      email: true,
      whatsapp: false,
      reminders_24h: true,
      reminders_2h: true,
      promotional: false,
    }
  );
}

/**
 * Send smart notification with idempotency check and multi-channel handling.
 */
export async function sendSmartNotification(
  admin,
  {
    userId,
    title,
    body,
    eventType = NOTIFICATION_EVENT_TYPES.BOOKING_CONFIRMED,
    category = NOTIFICATION_CATEGORIES.GENERAL,
    link = null,
    metadata = {},
    dedupKey = null,
    channel = "in_app",
  }
) {
  if (!userId || !title) return { ok: false, error: "Missing required notification fields" };

  const cleanTitle = sanitizeNotificationText(title);
  const cleanBody = sanitizeNotificationText(body);

  // Check user preferences
  const prefs = await getUserPreferences(admin, userId);
  if (channel === "in_app" && prefs && prefs.in_app === false) {
    return { ok: true, skipped: true, reason: "in_app disabled by user preferences" };
  }
  if (channel === "email" && prefs && prefs.email === false) {
    return { ok: true, skipped: true, reason: "email disabled by user preferences" };
  }
  if (channel === "whatsapp" && prefs && prefs.whatsapp === false) {
    return { ok: true, skipped: true, reason: "whatsapp disabled by user preferences" };
  }

  // If dedup key provided, check if already recorded
  if (dedupKey) {
    const { data: existing } = await admin
      .from("notifications")
      .select("id, created_at, delivery_status")
      .eq("dedup_key", dedupKey)
      .maybeSingle();

    if (existing) {
      return { ok: true, duplicate: true, notification: existing };
    }
  }

  // Delivery status is kept separate from booking/payment status
  // In-app notifications are delivered immediately into the database
  // Email/WhatsApp integrations would be queued or dispatched if appropriate provider is configured
  const deliveryStatus = channel === "in_app" ? "delivered" : "queued";

  const { data: inserted, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      title: cleanTitle,
      body: cleanBody,
      event_type: eventType,
      category,
      link,
      metadata: metadata || {},
      dedup_key: dedupKey || null,
      delivery_status: deliveryStatus,
      channel,
    })
    .select("id, title, body, event_type, category, link, read, delivery_status, created_at")
    .single();

  if (error) {
    // If unique constraint race occurs on dedup_key, treat as safe duplicate
    if (error.code === "23505" && dedupKey) {
      return { ok: true, duplicate: true };
    }
    console.error("sendSmartNotification failed:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, notification: inserted };
}

/**
 * Scheduled processor for sending 24h and 2h booking reminders reliably.
 * Can be run via a background worker or cron endpoint.
 */
export async function processScheduledReminders(admin, now = new Date()) {
  const results = {
    evaluated: 0,
    sent24h: 0,
    sent2h: 0,
    errors: [],
  };

  try {
    // Look for confirmed bookings in the next 48 hours
    const todayStr = now.toISOString().slice(0, 10);
    const inTwoDays = new Date(now.getTime() + 48 * 3600 * 1000);
    const endStr = inTwoDays.toISOString().slice(0, 10);

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, player_id, turf_id, booking_date, start_time, sport, turf:turfs(name)")
      .in("status", ["confirmed"])
      .gte("booking_date", todayStr)
      .lte("booking_date", endStr);

    if (error) throw error;
    if (!bookings || bookings.length === 0) return results;

    results.evaluated = bookings.length;

    for (const b of bookings) {
      // Calculate booking datetime
      const [hours, minutes] = String(b.start_time || "00:00").split(":").map(Number);
      const bookingDateTime = new Date(`${b.booking_date}T${String(hours).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`);

      const diffMs = bookingDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const turfName = b.turf?.name || "the turf";

      // ── 24h Reminder (between 22 and 26 hours prior) ──
      if (diffHours >= 22 && diffHours <= 26) {
        const dedup24 = buildDedupKey(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_24H, b.id, b.player_id);
        const res = await sendSmartNotification(admin, {
          userId: b.player_id,
          title: "Upcoming Booking Reminder (Tomorrow)",
          body: `Your ${b.sport || "game"} booking at ${turfName} is tomorrow at ${String(b.start_time).slice(0, 5)}. Get your gear ready!`,
          eventType: NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_24H,
          category: NOTIFICATION_CATEGORIES.BOOKINGS,
          link: `/player`,
          metadata: { bookingId: b.id, turfId: b.turf_id },
          dedupKey: dedup24,
        });

        if (res.ok && !res.duplicate && !res.skipped) {
          results.sent24h += 1;
        }
      }

      // ── 2h Reminder (between 1 and 3 hours prior) ──
      if (diffHours >= 1 && diffHours <= 3) {
        const dedup2h = buildDedupKey(NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_2H, b.id, b.player_id);
        const res = await sendSmartNotification(admin, {
          userId: b.player_id,
          title: "Booking Reminder: 2 Hours to Kickoff!",
          body: `Your booking at ${turfName} starts in ~2 hours (${String(b.start_time).slice(0, 5)}). See you on the turf!`,
          eventType: NOTIFICATION_EVENT_TYPES.BOOKING_REMINDER_2H,
          category: NOTIFICATION_CATEGORIES.BOOKINGS,
          link: `/player`,
          metadata: { bookingId: b.id, turfId: b.turf_id },
          dedupKey: dedup2h,
        });

        if (res.ok && !res.duplicate && !res.skipped) {
          results.sent2h += 1;
        }
      }
    }
  } catch (err) {
    console.error("processScheduledReminders error:", err);
    results.errors.push(err.message);
  }

  return results;
}

/**
 * Reusable booking intent mechanism for guest-to-authenticated booking flow.
 * Safely persists and restores booking selections across authentication barriers.
 */

// Matches standard 36-character UUIDv4
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BOOKING_INTENT_STORAGE_KEY = "velocity-turf:booking-intent";

export function isValidBookingDate(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Date must not be in the past
  return target >= today;
}

export function isValidStartTime(timeStr) {
  if (typeof timeStr !== "string") return false;
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr);
}

export function sanitizeBookingIntent(raw) {
  if (!raw || typeof raw !== "object") return null;

  const turfId = String(raw.turfId || "").trim();
  if (!UUID_PATTERN.test(turfId)) return null;

  const bookingDate = String(raw.bookingDate || raw.date || "").trim();
  if (!isValidBookingDate(bookingDate)) return null;

  const startTime = String(raw.startTime || raw.time || "").trim();
  if (!isValidStartTime(startTime)) return null;

  const turfName = typeof raw.turfName === "string" ? raw.turfName.slice(0, 100).trim() : "";
  const timeLabel = typeof raw.timeLabel === "string"
    ? raw.timeLabel.slice(0, 10).trim()
    : startTime.slice(0, 5);
  const sport = typeof raw.sport === "string" ? raw.sport.slice(0, 50).trim() : "Football";
  const price = typeof raw.price === "number" && raw.price >= 0 ? raw.price : null;

  // Maximum lifetime for an intent is 4 hours
  const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : Date.now();
  if (Date.now() - timestamp > 4 * 60 * 60 * 1000) {
    return null;
  }

  return {
    turfId,
    turfName,
    bookingDate,
    startTime,
    timeLabel,
    sport,
    price,
    timestamp,
  };
}

export function encodeBookingIntent(intent) {
  const sanitized = sanitizeBookingIntent(intent);
  if (!sanitized) return "";

  try {
    const json = JSON.stringify(sanitized);
    if (typeof window !== "undefined" && typeof btoa === "function") {
      return encodeURIComponent(btoa(encodeURIComponent(json)));
    }
    return Buffer.from(json, "utf-8").toString("base64url");
  } catch {
    return "";
  }
}

export function decodeBookingIntent(encoded) {
  if (!encoded || typeof encoded !== "string") return null;

  try {
    const cleanStr = decodeURIComponent(encoded);
    let json = "";
    if (typeof window !== "undefined" && typeof atob === "function") {
      json = decodeURIComponent(atob(cleanStr));
    } else {
      json = Buffer.from(cleanStr, "base64url").toString("utf-8");
    }
    const parsed = JSON.parse(json);
    return sanitizeBookingIntent(parsed);
  } catch {
    // Direct JSON attempt fallback
    try {
      const parsed = JSON.parse(decodeURIComponent(encoded));
      return sanitizeBookingIntent(parsed);
    } catch {
      return null;
    }
  }
}

export function saveBookingIntent(intent) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeBookingIntent(intent);
  if (!sanitized) return;

  try {
    window.sessionStorage.setItem(BOOKING_INTENT_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn("Could not save booking intent to sessionStorage", err);
  }
}

export function getStoredBookingIntent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_INTENT_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeBookingIntent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearStoredBookingIntent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BOOKING_INTENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

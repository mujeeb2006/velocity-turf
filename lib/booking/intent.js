/**
 * Reusable booking intent mechanism for guest-to-authenticated booking flow.
 * Safely persists and restores booking selections across authentication barriers.
 */

// Matches standard 36-character UUIDv4
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BOOKING_INTENT_STORAGE_KEY = "velocity-turf:booking-intent";

// Maximum lifetime for a booking intent (4 hours)
export const BOOKING_INTENT_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export function isValidBookingDate(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  if (target.getFullYear() !== y || target.getMonth() !== m - 1 || target.getDate() !== d) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Date must not be in the past
  return target >= today;
}

export function isValidStartTime(timeStr) {
  if (typeof timeStr !== "string") return false;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = match[3] !== undefined ? Number(match[3]) : 0;
  return h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60;
}

export function sanitizeBookingIntent(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const turfId = String(raw.turfId || "").trim();
  if (!UUID_PATTERN.test(turfId)) return null;

  const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : now;
  // Future timestamps or expired timestamps are refused
  if (timestamp > now || now - timestamp > BOOKING_INTENT_MAX_AGE_MS) {
    return null;
  }

  let bookingDate = String(raw.bookingDate || raw.date || "").trim();
  if (!isValidBookingDate(bookingDate)) {
    bookingDate = "";
  }

  let startTime = "";
  // A slot is meaningless without a valid date
  if (bookingDate) {
    const rawTime = String(raw.startTime || raw.time || "").trim();
    if (isValidStartTime(rawTime)) {
      startTime = rawTime;
    }
  }

  const turfName = typeof raw.turfName === "string" ? raw.turfName.slice(0, 100).trim() : "";
  const sport = typeof raw.sport === "string" && raw.sport.trim() ? raw.sport.slice(0, 50).trim() : "Football";

  return {
    bookingDate,
    sport,
    startTime,
    timestamp,
    turfId,
    turfName,
  };
}

export function encodeBookingIntent(intent) {
  const sanitized = sanitizeBookingIntent(intent);
  if (!sanitized) return "";

  try {
    const json = JSON.stringify(sanitized);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(json, "utf8").toString("base64url");
    }
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function decodeBookingIntent(encoded) {
  if (!encoded || typeof encoded !== "string") return null;
  if (encoded.length > 4000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return null;
  }

  try {
    let json = "";
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(encoded, "base64url").toString("utf8");
    } else {
      let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) {
        b64 += "=";
      }
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    }
    const parsed = JSON.parse(json);
    return sanitizeBookingIntent(parsed);
  } catch {
    return null;
  }
}

export function buildResumeHref(intent) {
  const encoded = encodeBookingIntent(intent);
  if (!encoded) return "/";
  return `/?resumeBooking=${encoded}`;
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

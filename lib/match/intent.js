/**
 * Match intent mechanism for guest-to-authenticated "Join Game" flow.
 * Safely persists and restores community match participation intent across authentication.
 */

// Matches standard 36-character UUIDv4
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MATCH_INTENT_STORAGE_KEY = "velocity-turf:match-intent";

// Maximum lifetime for a match intent (4 hours)
export const MATCH_INTENT_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export function sanitizeMatchIntent(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const matchId = String(raw.matchId || "").trim();
  if (!UUID_PATTERN.test(matchId)) return null;

  const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : now;
  // Future timestamps or expired timestamps (>4h) are refused
  if (timestamp > now || now - timestamp > MATCH_INTENT_MAX_AGE_MS) {
    return null;
  }

  const sport = typeof raw.sport === "string" && raw.sport.trim() ? raw.sport.slice(0, 50).trim() : "Sports";
  const turfName = typeof raw.turfName === "string" ? raw.turfName.slice(0, 100).trim() : "Turf";
  const turfId = typeof raw.turfId === "string" && UUID_PATTERN.test(raw.turfId.trim()) ? raw.turfId.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.slice(0, 50).trim() : "";
  const time = typeof raw.time === "string" ? raw.time.slice(0, 50).trim() : "";

  return {
    action: "join",
    date,
    matchId,
    sport,
    time,
    timestamp,
    turfId,
    turfName,
  };
}

export function encodeMatchIntent(intent) {
  const sanitized = sanitizeMatchIntent(intent);
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

export function decodeMatchIntent(encoded) {
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
    return sanitizeMatchIntent(parsed);
  } catch {
    return null;
  }
}

export function buildResumeMatchHref(intent) {
  const encoded = encodeMatchIntent(intent);
  if (!encoded) return "/";
  return `/?resumeMatch=${encoded}`;
}

export function saveMatchIntent(intent) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeMatchIntent(intent);
  if (!sanitized) return;

  try {
    window.sessionStorage.setItem(MATCH_INTENT_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn("Could not save match intent to sessionStorage", err);
  }
}

export function getStoredMatchIntent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MATCH_INTENT_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeMatchIntent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearStoredMatchIntent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(MATCH_INTENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

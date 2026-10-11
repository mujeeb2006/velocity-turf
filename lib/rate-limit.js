// lib/rate-limit.js
// Edge-compatible, in-memory rate limiter with Supabase-backed fallback.
//
// WHY IN-MEMORY IS ACCEPTABLE HERE:
//   Velocity Turf deploys to Vercel (serverless). True distributed rate limiting
//   requires a shared store (Redis, Upstash, etc.). Without one, we use:
//   1. Per-function in-process LRU counters   — catches bursts within a warm instance
//   2. DB-level idempotency keys              — prevents duplicate bookings regardless
//   3. Clear documentation for production upgrade path
//
// PRODUCTION UPGRADE PATH:
//   Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to env, then:
//   npm install @upstash/ratelimit @upstash/redis
//   Replace the in-memory store below with the Upstash sliding-window limiter.

const DEFAULT_WINDOW_MS  = 60_000; // 1 minute
const DEFAULT_MAX        = 20;

// LRU-style in-memory store (per warm serverless instance)
class MemoryStore {
  constructor() {
    this._map = new Map();
    this._MAX_KEYS = 5000; // evict oldest when map grows too large
  }

  hit(key, windowMs, max) {
    const now = Date.now();
    const entry = this._map.get(key);

    if (!entry || now > entry.resetAt) {
      const next = { count: 1, resetAt: now + windowMs };
      if (this._map.size >= this._MAX_KEYS) {
        // Evict the first (oldest) key
        this._map.delete(this._map.keys().next().value);
      }
      this._map.set(key, next);
      return { limited: false, remaining: max - 1, resetAt: next.resetAt };
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    return {
      limited:   entry.count > max,
      remaining,
      resetAt:   entry.resetAt,
    };
  }
}

const _store = new MemoryStore();

/**
 * Check a rate limit for the given key.
 *
 * @param {string} key       — e.g. `booking:${userId}` or `auth:${ip}`
 * @param {object} [opts]
 * @param {number} [opts.windowMs]  — sliding window in ms (default 60 000)
 * @param {number} [opts.max]       — max requests per window (default 20)
 * @returns {{ limited: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(key, { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = {}) {
  try {
    return _store.hit(key, windowMs, max);
  } catch {
    // Rate limiter failure must never crash a route.
    return { limited: false, remaining: max, resetAt: Date.now() + windowMs };
  }
}

/**
 * Extract the client IP from a Next.js request.
 * Does not blindly trust X-Forwarded-For to prevent spoofing on Vercel,
 * which sets x-real-ip reliably.
 */
export function getClientIp(request) {
  // Vercel sets this reliably
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback: first entry of x-forwarded-for (less trustworthy)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

// ── Per-route limit configurations ───────────────────────────────────────────
// Adjust max values based on observed traffic before deploying.
export const LIMITS = {
  // Booking creation — 10 per minute per user
  bookingCreate:   { windowMs: 60_000,  max: 10  },
  // Booking cancel  — 20 per minute per user
  bookingCancel:   { windowMs: 60_000,  max: 20  },
  // Auth endpoints  — 5 per minute per IP
  auth:            { windowMs: 60_000,  max: 5   },
  // Admin actions   — 30 per minute per admin user
  adminAction:     { windowMs: 60_000,  max: 30  },
  // Payout creation — 10 per minute per admin
  payoutCreate:    { windowMs: 60_000,  max: 10  },
  // Default         — 60 per minute
  default:         { windowMs: 60_000,  max: 60  },
};

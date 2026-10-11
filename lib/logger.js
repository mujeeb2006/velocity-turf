// lib/logger.js
// Structured, levelled logger for server-side route handlers.
// Never import this in Client Components — it is server-only.
//
// Design principles:
//   • Never logs passwords, tokens, keys, or raw PII.
//   • Wraps console.* so the output is JSON-parseable in production.
//   • In development, pretty-prints for readability.
//   • If Sentry is configured, error() forwards to Sentry automatically.
//   • Logger failures never throw — they are swallowed silently.

const IS_PROD = process.env.NODE_ENV === "production";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const ENV = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development";

// Fields that must never appear in logs.
const BLOCKED_KEYS = new Set([
  "password", "token", "secret", "key", "authorization",
  "service_role", "apikey", "api_key", "access_token",
  "refresh_token", "cookie", "credit_card", "card_number",
]);

function redact(obj, depth = 0) {
  if (depth > 4 || obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (BLOCKED_KEYS.has(k.toLowerCase())) return [k, "[REDACTED]"];
      return [k, redact(v, depth + 1)];
    })
  );
}

function buildEntry(level, message, context = {}) {
  const safe = redact(context);
  return {
    ts: new Date().toISOString(),
    level,
    env: ENV,
    version: APP_VERSION,
    message,
    ...safe,
  };
}

function emit(level, entry) {
  try {
    if (IS_PROD) {
      const out = JSON.stringify(entry);
      if (level === "error") console.error(out);
      else if (level === "warn")  console.warn(out);
      else console.log(out);
    } else {
      // Development: human-readable
      const { ts, level: _l, message, ...rest } = entry;
      const prefix = `[${ts}] [${level.toUpperCase()}]`;
      if (level === "error") console.error(prefix, message, rest);
      else if (level === "warn")  console.warn(prefix, message, rest);
      else console.log(prefix, message, rest);
    }
  } catch {
    // Logger must never crash the app.
  }
}

// Forward errors to Sentry if available (lazy import to avoid client bundle bleed)
async function captureWithSentry(entry, err) {
  try {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      scope.setTag("env", ENV);
      scope.setTag("version", APP_VERSION);
      if (entry.route)      scope.setTag("route", entry.route);
      if (entry.operation)  scope.setTag("operation", entry.operation);
      if (entry.actorId)    scope.setUser({ id: entry.actorId });
      if (entry.requestId)  scope.setExtra("requestId", entry.requestId);
      if (entry.bookingId)  scope.setExtra("bookingId", entry.bookingId);
      if (entry.payoutId)   scope.setExtra("payoutId", entry.payoutId);
      if (entry.disputeId)  scope.setExtra("disputeId", entry.disputeId);
      Sentry.captureException(err ?? new Error(entry.message));
    });
  } catch {
    // Sentry capture must never crash the app.
  }
}

export const logger = {
  debug(message, context = {}) {
    if (IS_PROD) return; // debug suppressed in production
    emit("debug", buildEntry("debug", message, context));
  },

  info(message, context = {}) {
    emit("info", buildEntry("info", message, context));
  },

  warn(message, context = {}) {
    const entry = buildEntry("warn", message, context);
    emit("warn", entry);
  },

  error(message, context = {}, err = null) {
    const entry = buildEntry("error", message, {
      ...context,
      ...(err && {
        errorName:    err.name,
        errorMessage: err.message,
        // Only include stack in non-production
        ...(IS_PROD ? {} : { stack: err.stack }),
      }),
    });
    emit("error", entry);
    captureWithSentry(entry, err);
  },
};

// ── Timing helper ─────────────────────────────────────────────────────────────
// Usage:
//   const t = startTimer();
//   ...
//   logger.info("booking created", { durationMs: t() });
export function startTimer() {
  const start = Date.now();
  return () => Date.now() - start;
}

// ── Request ID helper ─────────────────────────────────────────────────────────
// Generates or forwards a correlation ID from the request headers.
export function getRequestId(request) {
  return (
    request?.headers?.get("x-request-id") ||
    request?.headers?.get("x-correlation-id") ||
    crypto.randomUUID()
  );
}

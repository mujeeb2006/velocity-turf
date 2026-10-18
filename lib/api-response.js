// lib/api-response.js
// Standardised API response helpers for all route handlers.
//
// Every error response contains:
//   • code    — stable machine-readable string
//   • message — safe user-facing string
//   • requestId — correlation ID for log tracing
//
// Never include raw SQL errors, stack traces, secrets, or DB internals.

import { NextResponse } from "next/server.js";
import { getRequestId } from "./logger.js";

/**
 * Build a successful JSON response.
 * @param {object} data  - payload to return
 * @param {number} status - HTTP status (default 200)
 * @param {Request} [req] - original request (for correlation ID)
 */
export function ok(data, status = 200, req = null) {
  return NextResponse.json(data, { status });
}

/**
 * Build a standardised error response.
 * @param {object} opts
 * @param {string}  opts.code      - machine-readable error code (snake_case)
 * @param {string}  opts.message   - user-facing message (no internal details)
 * @param {number}  opts.status    - HTTP status code
 * @param {string}  [opts.requestId]
 * @param {object}  [opts.details] - optional validation detail (safe only)
 */
export function apiError({ code, message, status, requestId = null, details = null }) {
  const body = {
    error: message,
    code,
    message,
    requestId,
    errorDetail: { code, message, requestId },
  };
  if (details && typeof details === "object") body.details = details;
  return NextResponse.json(body, { status });
}

// ── Convenience constructors ──────────────────────────────────────────────────

export const Errors = {
  badRequest:     (msg = "Invalid request.",                rid) => apiError({ code: "BAD_REQUEST",      message: msg, status: 400, requestId: rid }),
  unauthorized:   (msg = "Sign in required.",               rid) => apiError({ code: "UNAUTHORIZED",     message: msg, status: 401, requestId: rid }),
  forbidden:      (msg = "Access denied.",                  rid) => apiError({ code: "FORBIDDEN",        message: msg, status: 403, requestId: rid }),
  notFound:       (msg = "Not found.",                      rid) => apiError({ code: "NOT_FOUND",        message: msg, status: 404, requestId: rid }),
  conflict:       (msg = "State conflict.",                 rid) => apiError({ code: "CONFLICT",         message: msg, status: 409, requestId: rid }),
  validation:     (msg, details, rid)                           => apiError({ code: "VALIDATION_ERROR",  message: msg, status: 422, requestId: rid, details }),
  rateLimit:      (msg = "Too many requests. Try again shortly.", rid) => apiError({ code: "RATE_LIMITED", message: msg, status: 429, requestId: rid }),
  internal:       (msg = "An unexpected error occurred. Please try again.", rid) => apiError({ code: "INTERNAL_ERROR", message: msg, status: 500, requestId: rid }),
  unavailable:    (msg = "Service temporarily unavailable.",rid) => apiError({ code: "SERVICE_UNAVAILABLE", message: msg, status: 503, requestId: rid }),

  // Domain-specific
  slotTaken:      (rid) => apiError({ code: "SLOT_CONFLICT",   message: "That slot was just taken — pick another.",       status: 409, requestId: rid }),
  bookingChanged: (rid) => apiError({ code: "BOOKING_CHANGED", message: "This booking has already been changed.",          status: 409, requestId: rid }),
  idempotencyConflict: (rid) => apiError({ code: "IDEMPOTENCY_CONFLICT", message: "This request key was already used with a different booking. Please use a new key.", status: 409, requestId: rid }),
};

/**
 * Safely extract a readable error message from diverse API response shapes:
 * - String ("Something went wrong")
 * - Structured object ({ error: "Message" } or { error: { message: "Message" } })
 * - Direct message ({ message: "Message" })
 * - Error detail or validation ({ errorDetail: { message: "Message" } } or { details: { message: "Message" } })
 * - Null / empty / malformed values -> returns fallback
 */
export function extractErrorMessage(data, fallback = "An unexpected error occurred. Please try again.") {
  if (!data) return fallback;
  if (typeof data === "string") {
    const trimmed = data.trim();
    return trimmed || fallback;
  }
  if (typeof data !== "object") return fallback;

  if (typeof data.error === "string") {
    const trimmed = data.error.trim();
    if (trimmed) return trimmed;
  } else if (data.error && typeof data.error === "object" && typeof data.error.message === "string") {
    const trimmed = data.error.message.trim();
    if (trimmed) return trimmed;
  }

  if (typeof data.message === "string") {
    const trimmed = data.message.trim();
    if (trimmed) return trimmed;
  }

  if (data.errorDetail && typeof data.errorDetail === "object" && typeof data.errorDetail.message === "string") {
    const trimmed = data.errorDetail.message.trim();
    if (trimmed) return trimmed;
  }

  if (data.details && typeof data.details === "object" && typeof data.details.message === "string") {
    const trimmed = data.details.message.trim();
    if (trimmed) return trimmed;
  }

  return fallback;
}

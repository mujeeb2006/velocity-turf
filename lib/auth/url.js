/**
 * URL resolution and redirection safety helpers for Supabase Auth flows.
 */

export function getSiteUrl(request) {
  // 1. Explicit environment variable override
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // 2. Request headers (e.g. deployed behind reverse proxies or Vercel)
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }

    try {
      const url = new URL(request.url);
      return url.origin.replace(/\/$/, "");
    } catch {
      // ignore
    }
  }

  // 3. Fallback for local development
  return "http://localhost:3000";
}

export function sanitizeRedirectPath(path, fallback = "/auth/set-password") {
  if (typeof path !== "string") return fallback;
  const trimmed = path.trim();
  // Must be a single-slash, same-site path. Reject protocol-relative URLs
  // (//example.com), embedded schemes, and backslashes / control characters,
  // which browsers normalise (e.g. "/\\evil.com" becomes "//evil.com").
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return fallback;
  try {
    const base = "http://velocity-turf.invalid";
    if (new URL(trimmed, base).origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return trimmed;
}

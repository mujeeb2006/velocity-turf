// sentry.server.config.js
// Sentry server-side initialisation for Next.js 14.
// This file is loaded by Sentry's Next.js SDK instrumentation automatically.
//
// SETUP STEPS (do this before going live):
//   1. npm install @sentry/nextjs
//   2. Set NEXT_PUBLIC_SENTRY_DSN in your .env.local and Vercel env vars
//   3. Set SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN for source map upload
//   4. Add to next.config.mjs:
//        import { withSentryConfig } from '@sentry/nextjs';
//        export default withSentryConfig(nextConfig, { silent: true, hideSourceMaps: true });
//   5. Create sentry.client.config.js (copy from sentry.server.config.js,
//      change Sentry.init options to client-appropriate values)
//
// IMPORTANT:
//   • Do NOT commit a real DSN without environment variable protection.
//   • hideSourceMaps: true prevents leaking source maps to the public.
//   • Review sample rates before enabling in production.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // 10% of transactions traced in production, 100% in development
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Never log in development to avoid noise
    debug: false,

    // Ignore expected, non-actionable errors
    ignoreErrors: [
      "AuthSessionMissingError",
      /^ResizeObserver loop/,
    ],

    beforeSend(event) {
      // Strip any accidental token / key fields from extras
      if (event.extra) {
        for (const k of Object.keys(event.extra)) {
          if (/token|secret|key|password|authorization/i.test(k)) {
            event.extra[k] = "[REDACTED]";
          }
        }
      }
      return event;
    },
  });
} else {
  // No DSN configured — log a notice so developers know Sentry is inactive
  if (process.env.NODE_ENV !== "test") {
    console.info("[Sentry] NEXT_PUBLIC_SENTRY_DSN not set — error reporting disabled");
  }
}

// app/api/health/ready/route.js
// Readiness check — verifies that critical dependencies are reachable.
// A failed readiness check means the instance should not receive traffic.
//
// Checks performed:
//   ✅ Supabase URL and key are configured
//   ✅ Supabase DB responds to a lightweight query (profiles count)
//
// Intentionally NOT checked here:
//   ✗ Full RLS policy correctness (too expensive)
//   ✗ Auth session validity
//   ✗ Third-party payment provider (not integrated)
//
// GET /api/health/ready
// → 200 { status: "ready", checks: { db: "ok" } }
// → 503 { status: "not_ready", checks: { db: "error: ..." } }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cache the result for 10 s to avoid hammering Supabase on every probe
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 10_000;

export async function GET() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  const checks = {};

  // DB connectivity — minimal query, no full table scan
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) throw error;
    checks.db = "ok";
  } catch (err) {
    checks.db = `error: ${err.message?.slice(0, 80) ?? "unknown"}`;
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? 200 : 503;
  const body = { status: allOk ? "ready" : "not_ready", checks, ts: new Date().toISOString() };

  const response = NextResponse.json(body, { status });
  _cache = response;
  _cacheAt = now;
  return response;
}

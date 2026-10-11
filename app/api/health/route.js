// app/api/health/route.js
// Liveness check — confirms the process is running.
// Intentionally lightweight: no DB calls, no external dependencies.
// Use this for container/deployment liveness probes.
//
// GET /api/health
// → 200 { status: "ok", ts: "...", version: "..." }

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status:  "ok",
    ts:      new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    env:     process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",
  });
}

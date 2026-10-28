// app/api/admin/demo-data/route.js
// Secure server API for Demo Data Management in Velocity Turf.
// Strictly requires authenticated Admin access on the server.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoDataCounts, generateDemoData, resetDemoData } from "@/lib/demo-data/generator";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const admin = createAdminClient();
    const counts = await getDemoDataCounts(admin);
    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    console.error("GET /api/admin/demo-data failed:", error);
    return NextResponse.json({ error: "Could not load demo data status." }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const admin = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const { action = "generate", size = "medium", categories } = body;

    if (action === "reset") {
      const resetRes = await resetDemoData(admin);
      const counts = await getDemoDataCounts(admin);
      return NextResponse.json({ ok: true, action: "reset", result: resetRes, counts });
    }

    const genRes = await generateDemoData(admin, { size, categories });
    const counts = await getDemoDataCounts(admin);

    return NextResponse.json({
      ok: true,
      action: action || "generate",
      size,
      created: genRes.created,
      counts,
    });
  } catch (error) {
    console.error("POST /api/admin/demo-data failed:", error);
    return NextResponse.json({ error: error.message || "Failed to generate demo data." }, { status: 500 });
  }
}

export async function DELETE() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const admin = createAdminClient();
    const resetRes = await resetDemoData(admin);
    const counts = await getDemoDataCounts(admin);
    return NextResponse.json({ ok: true, action: "reset", result: resetRes, counts });
  } catch (error) {
    console.error("DELETE /api/admin/demo-data failed:", error);
    return NextResponse.json({ error: error.message || "Failed to reset demo data." }, { status: 500 });
  }
}


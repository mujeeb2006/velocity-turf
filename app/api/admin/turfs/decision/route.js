import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, readJson, notifyUser, UUID_PATTERN } from "@/lib/admin/server";

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await readJson(request);
  const turfId = typeof body?.turfId === "string" ? body.turfId : "";
  const decision = body?.decision;
  if (!UUID_PATTERN.test(turfId) || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const userClient = createClient();

  const { data: turf, error: lookupError } = await admin
    .from("turfs")
    .select("id, name, owner_id, status")
    .eq("id", turfId)
    .maybeSingle();

  if (lookupError) {
    console.error("turf decision lookup failed", lookupError);
    return NextResponse.json({ error: "Could not load that turf for review." }, { status: 500 });
  }
  if (!turf) return NextResponse.json({ error: "Turf not found." }, { status: 404 });
  if (turf.status !== "pending") {
    return NextResponse.json({ error: "This turf has already been reviewed." }, { status: 409 });
  }

  const approve = decision === "approve";
  const updatePayload = {
    status: approve ? "live" : "rejected",
    approved_at: approve ? new Date().toISOString() : null,
  };

  // 1. First attempt update with the authenticated admin's userClient.
  // This supplies auth.uid(), which satisfies PostgreSQL triggers checking current_user_role() = 'admin'.
  let { data: updated, error } = await userClient
    .from("turfs")
    .update(updatePayload)
    .eq("id", turfId)
    .eq("status", "pending")
    .select("id");

  // Handle case where approved_at column is missing in legacy schema
  if (error?.code === "42703" || error?.code === "PGRST204") {
    console.warn("turf decision retrying without approved_at via userClient");
    ({ data: updated, error } = await userClient
      .from("turfs")
      .update({ status: approve ? "live" : "rejected" })
      .eq("id", turfId)
      .eq("status", "pending")
      .select("id"));
  }

  // 2. If userClient failed (e.g. RLS policy missing on authenticated role), fallback to service-role admin client
  if (error || !updated?.length) {
    console.warn("userClient turf update fallback to adminClient:", error?.message || "No rows returned");
    let fallbackRes = await admin
      .from("turfs")
      .update(updatePayload)
      .eq("id", turfId)
      .eq("status", "pending")
      .select("id");

    if (fallbackRes.error?.code === "42703" || fallbackRes.error?.code === "PGRST204") {
      fallbackRes = await admin
        .from("turfs")
        .update({ status: approve ? "live" : "rejected" })
        .eq("id", turfId)
        .eq("status", "pending")
        .select("id");
    }

    if (!fallbackRes.error && fallbackRes.data?.length) {
      updated = fallbackRes.data;
      error = null;
    } else if (fallbackRes.error) {
      // Retain the most informative error
      error = fallbackRes.error;
    }
  }

  if (error) {
    console.error("turf decision failed", { code: error.code, message: error.message, details: error.details });
    return NextResponse.json(
      { error: error.message || "Could not update that turf. Check that the latest Supabase schema and admin policies are applied." },
      { status: 500 }
    );
  }

  if (!updated?.length) {
    return NextResponse.json({ error: "This turf has already been reviewed." }, { status: 409 });
  }

  try {
    await notifyUser(
      admin,
      turf.owner_id,
      approve ? `"${turf.name}" is now live` : `"${turf.name}" was not approved`,
      approve
        ? "Your turf passed review and players can now book it."
        : "Your listing was not approved. Review the details and contact support if you'd like to resubmit.",
    );
  } catch (notifErr) {
    console.error("turf decision notification failed", notifErr);
  }

  return NextResponse.json({ success: true, status: approve ? "live" : "rejected" });
}

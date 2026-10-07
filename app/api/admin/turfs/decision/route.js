import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { data: turf } = await admin.from("turfs").select("id, name, owner_id, status").eq("id", turfId).maybeSingle();
  if (!turf) return NextResponse.json({ error: "Turf not found." }, { status: 404 });
  if (turf.status !== "pending") {
    return NextResponse.json({ error: "This turf has already been reviewed." }, { status: 409 });
  }

  const approve = decision === "approve";
  const { data: updated, error } = await admin
    .from("turfs")
    .update({ status: approve ? "live" : "rejected", approved_at: approve ? new Date().toISOString() : null })
    .eq("id", turfId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("turf decision failed", error);
    return NextResponse.json({ error: "Could not update that turf." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This turf has already been reviewed." }, { status: 409 });
  }

  await notifyUser(
    admin,
    turf.owner_id,
    approve ? `"${turf.name}" is now live` : `"${turf.name}" was not approved`,
    approve
      ? "Your turf passed review and players can now book it."
      : "Your listing was not approved. Review the details and contact support if you'd like to resubmit.",
  );

  return NextResponse.json({ success: true, status: approve ? "live" : "rejected" });
}

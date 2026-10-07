import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, readJson, notifyUser, UUID_PATTERN } from "@/lib/admin/server";

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await readJson(request);
  const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
  const outcome = body?.outcome;
  if (!UUID_PATTERN.test(disputeId) || !["refund", "dismiss"].includes(outcome)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: dispute } = await admin
    .from("disputes")
    .select("id, ticket_number, raised_by, amount, status")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
  if (dispute.status !== "open") {
    return NextResponse.json({ error: "This dispute is already resolved." }, { status: 409 });
  }

  const { data: updated, error } = await admin
    .from("disputes")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", disputeId)
    .eq("status", "open")
    .select("id");

  if (error) {
    console.error("dispute resolve failed", error);
    return NextResponse.json({ error: "Could not resolve that dispute." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This dispute is already resolved." }, { status: 409 });
  }

  const amount = Number(dispute.amount) || 0;
  await notifyUser(
    admin,
    dispute.raised_by,
    `Dispute ${dispute.ticket_number} resolved`,
    outcome === "refund"
      ? `A refund${amount ? ` of ₹${amount.toLocaleString("en-IN")}` : ""} has been approved for this booking.`
      : "After review, no refund was approved for this booking.",
  );

  return NextResponse.json({ success: true });
}

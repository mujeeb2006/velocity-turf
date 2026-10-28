import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { readJson } from "@/lib/admin/server";
import { isInviteExpired } from "@/lib/staff/policy";
import { sendSmartNotification, NOTIFICATION_EVENT_TYPES, NOTIFICATION_CATEGORIES, buildDedupKey } from "@/lib/notifications/service";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await readJson(request);
  const token = body?.token;

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Invalid invitation token." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: invite, error: fetchErr } = await admin
    .from("venue_staff")
    .select("*, turf:turfs(name)")
    .eq("invite_token", token)
    .maybeSingle();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  if (invite.status === "revoked") {
    return NextResponse.json({ error: "This invitation has been revoked." }, { status: 410 });
  }

  if (invite.status === "active" && invite.user_id === profile.id) {
    return NextResponse.json({ success: true, message: "Invitation already accepted.", staff: invite });
  }

  if (isInviteExpired(invite)) {
    await admin.from("venue_staff").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "This invitation has expired. Request a new invite." }, { status: 410 });
  }

  // Update staff membership to active
  const { data: updated, error: updateErr } = await admin
    .from("venue_staff")
    .update({
      user_id: profile.id,
      full_name: profile.full_name || invite.full_name,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .select()
    .single();

  if (updateErr) {
    console.error("accept invite error:", updateErr);
    return NextResponse.json({ error: "Failed to accept invitation." }, { status: 500 });
  }

  // Audit log
  await admin.from("staff_audit_log").insert({
    turf_id: invite.turf_id,
    actor_id: profile.id,
    actor_role: "staff",
    action: "accept_staff_invite",
    target_type: "venue_staff",
    target_id: invite.id,
    details: { email: profile.email, role: invite.role },
  });

  // Notify owner
  await sendSmartNotification(admin, {
    userId: invite.owner_id,
    title: "Staff Member Accepted Invitation",
    body: `${profile.full_name || profile.email} has accepted the invitation for ${invite.role.replace("_", " ")}${invite.turf?.name ? ` at ${invite.turf.name}` : ""}.`,
    eventType: NOTIFICATION_EVENT_TYPES.VENUE_CHANGE,
    category: NOTIFICATION_CATEGORIES.GENERAL,
    link: "/owner",
    metadata: { staffId: invite.id },
    dedupKey: buildDedupKey("staff_accepted", invite.id, invite.owner_id),
  });

  return NextResponse.json({ success: true, staff: updated });
}


import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { validateTeamInvite } from "@/lib/team/policy";

// POST /api/teams/[teamId]/invite - Create invitation link
export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const teamId = params.teamId;
  if (!UUID_PATTERN.test(teamId)) {
    return Errors.badRequest("Invalid team ID.");
  }

  const admin = createAdminClient();
  const { data: team, error: teamErr } = await admin
    .from("teams")
    .select("id, captain_id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (teamErr || !team) {
    return Errors.notFound("Team not found.");
  }

  const body = await readJson(request);
  const validation = validateTeamInvite({
    team,
    captainId: profile.id,
    maxUses: body?.maxUses ?? 10,
    expiryHours: body?.expiryHours ?? 72,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const { data: invite, error: insErr } = await admin
    .from("team_invites")
    .insert({
      team_id: team.id,
      created_by: profile.id,
      token: validation.data.token,
      expires_at: validation.data.expiresAt,
      max_uses: validation.data.maxUses,
    })
    .select("id, token, expires_at, max_uses, uses, created_at")
    .single();

  if (insErr) {
    console.error("Invite link insert failed:", insErr);
    return Errors.internal("Could not create invitation link.");
  }

  // Construct invite link relative to site
  const origin = request.headers.get("origin") || "";
  const inviteUrl = `${origin}/player?joinTeam=${invite.token}`;

  return ok({
    invite: {
      ...invite,
      inviteUrl,
    },
  });
}

// DELETE /api/teams/[teamId]/invite - Revoke invitation link
export async function DELETE(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const teamId = params.teamId;
  if (!UUID_PATTERN.test(teamId)) {
    return Errors.badRequest("Invalid team ID.");
  }

  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return Errors.badRequest("Invite token is required.");
  }

  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("captain_id").eq("id", teamId).maybeSingle();
  if (!team || (team.captain_id !== profile.id && profile.role !== "admin")) {
    return Errors.forbidden("Only the captain can revoke invite links.");
  }

  const { data: updated, error: updErr } = await admin
    .from("team_invites")
    .update({ revoked: true })
    .eq("team_id", teamId)
    .eq("token", token)
    .select("id, revoked")
    .maybeSingle();

  if (updErr || !updated) {
    return Errors.notFound("Invite not found or already revoked.");
  }

  return ok({ success: true, message: "Invitation revoked successfully." });
}

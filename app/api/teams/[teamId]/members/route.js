import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { canManageRoster } from "@/lib/team/policy";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const teamId = params.teamId;
  if (!UUID_PATTERN.test(teamId)) {
    return Errors.badRequest("Invalid team ID.");
  }

  const body = await readJson(request);
  const action = typeof body?.action === "string" ? body.action : "remove";
  const targetPlayerId = typeof body?.playerId === "string" ? body.playerId : profile.id;

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams")
    .select("id, captain_id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) return Errors.notFound("Team not found.");

  const { data: member } = await admin
    .from("team_members")
    .select("id, player_id, role, status")
    .eq("team_id", teamId)
    .eq("player_id", targetPlayerId)
    .maybeSingle();

  if (!member) {
    return Errors.notFound("Member not found in team roster.");
  }

  const allowed = canManageRoster({
    team,
    memberToManage: member,
    requestingUserId: profile.id,
    action: action === "leave" ? "remove_member" : "remove_member",
  });

  if (!allowed && profile.role !== "admin") {
    return Errors.forbidden("You do not have permission to manage this roster member.");
  }

  if (targetPlayerId === team.captain_id) {
    return Errors.badRequest("The captain cannot be removed from the team. Transfer captaincy or delete the team.");
  }

  const { error: delErr } = await admin
    .from("team_members")
    .delete()
    .eq("id", member.id);

  if (delErr) {
    console.error("Member delete failed:", delErr);
    return Errors.internal("Failed to update roster.");
  }

  return ok({
    success: true,
    message: action === "leave" ? "You have left the team." : "Member removed from roster.",
  });
}

import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { validateInviteRedemption } from "@/lib/team/policy";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required to join a team.");
  }

  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return Errors.badRequest("Invitation token is required.");
  }

  const admin = createAdminClient();

  // Load invitation
  const { data: invite, error: invErr } = await admin
    .from("team_invites")
    .select("*, team:teams(id, name, sport, captain_id)")
    .eq("token", token)
    .maybeSingle();

  if (invErr || !invite) {
    return Errors.notFound("Invalid or expired team invitation.");
  }

  // Check if player is already a member
  const { data: existingMember } = await admin
    .from("team_members")
    .select("id, status")
    .eq("team_id", invite.team_id)
    .eq("player_id", profile.id)
    .maybeSingle();

  const validation = validateInviteRedemption({
    invite,
    playerId: profile.id,
    existingMember,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  // Atomically increment invite uses
  const { data: updInvite, error: updErr } = await admin
    .from("team_invites")
    .update({ uses: invite.uses + 1 })
    .eq("id", invite.id)
    .eq("uses", invite.uses) // concurrency check
    .lt("uses", invite.max_uses)
    .select("id, uses")
    .maybeSingle();

  if (updErr || !updInvite) {
    return Errors.conflict("This invitation has just reached its maximum uses.");
  }

  // Add member record
  const { data: member, error: insErr } = await admin
    .from("team_members")
    .insert({
      team_id: invite.team_id,
      player_id: profile.id,
      role: "member",
      status: "active",
    })
    .select("id, role, status, joined_at")
    .single();

  if (insErr) {
    console.error("Team member insert error on join:", insErr);
    return Errors.internal("Could not join team.");
  }

  // Notify captain
  if (invite.team?.captain_id) {
    try {
      await admin.from("notifications").insert({
        user_id: invite.team.captain_id,
        title: "New player joined your team",
        body: `${profile.full_name || "A player"} joined ${invite.team.name} via invitation link.`,
      });
    } catch (notifErr) {
      console.warn("Could not notify captain of team join:", notifErr);
    }
  }

  return ok({
    success: true,
    teamId: invite.team_id,
    teamName: invite.team?.name,
    member,
  });
}

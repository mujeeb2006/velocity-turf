import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { canManageRoster } from "@/lib/team/policy";

export async function GET(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const teamId = params.teamId;
  if (!UUID_PATTERN.test(teamId)) {
    return Errors.badRequest("Invalid team ID.");
  }

  const admin = createAdminClient();

  // Load team
  const { data: team, error: teamErr } = await admin
    .from("teams")
    .select(`
      *,
      captain:profiles!teams_captain_id_fkey(id, full_name, email),
      members:team_members(id, player_id, role, status, joined_at, profile:profiles(id, full_name, email))
    `)
    .eq("id", teamId)
    .maybeSingle();

  if (teamErr || !team) {
    return Errors.notFound("Team not found.");
  }

  const isCaptain = team.captain_id === profile.id;
  const isMember = team.members?.some((m) => m.player_id === profile.id && m.status === "active");
  const isAuthorized = isCaptain || isMember;

  // Load team bookings
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, booking_date, start_time, sport, price, status, turf:turfs(id, name, city)")
    .eq("team_id", teamId)
    .order("booking_date", { ascending: false })
    .limit(20);

  // Load active invites if captain
  let invites = [];
  if (isCaptain) {
    const { data: activeInvites } = await admin
      .from("team_invites")
      .select("id, token, expires_at, max_uses, uses, revoked, created_at")
      .eq("team_id", teamId)
      .eq("revoked", false)
      .order("created_at", { ascending: false });
    invites = activeInvites || [];
  }

  // Sanitize members if not authorized member
  const members = (team.members || []).map((m) => ({
    id: m.id,
    playerId: m.player_id,
    name: m.profile?.full_name || "Player",
    email: isAuthorized ? m.profile?.email : undefined,
    role: m.role,
    status: m.status,
    joinedAt: m.joined_at,
  }));

  return ok({
    team: {
      id: team.id,
      name: team.name,
      sport: team.sport,
      description: team.description,
      logoUrl: team.logo_url,
      captain: team.captain,
      isCaptain,
      isMember,
      members,
      bookings: isAuthorized ? (bookings || []) : [],
      invites: isCaptain ? invites : [],
      createdAt: team.created_at,
    },
  });
}

export async function PATCH(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const teamId = params.teamId;
  if (!UUID_PATTERN.test(teamId)) {
    return Errors.badRequest("Invalid team ID.");
  }

  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("id, captain_id").eq("id", teamId).maybeSingle();
  if (!team) return Errors.notFound("Team not found.");

  if (team.captain_id !== profile.id && profile.role !== "admin") {
    return Errors.forbidden("Only the captain can modify team settings.");
  }

  const body = await readJson(request);
  const updates = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    updates.name = body.name.trim().slice(0, 60);
  }
  if (typeof body.description === "string") {
    updates.description = body.description.trim().slice(0, 500);
  }
  if (typeof body.logoUrl === "string") {
    updates.logo_url = body.logoUrl.trim().slice(0, 1000);
  }
  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from("teams")
    .update(updates)
    .eq("id", teamId)
    .select("*")
    .single();

  if (updateErr) {
    return Errors.internal("Failed to update team.");
  }

  return ok({ team: updated });
}

export async function DELETE(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const teamId = params.teamId;
  if (!UUID_PATTERN.test(teamId)) {
    return Errors.badRequest("Invalid team ID.");
  }

  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("id, captain_id").eq("id", teamId).maybeSingle();
  if (!team) return Errors.notFound("Team not found.");

  if (team.captain_id !== profile.id && profile.role !== "admin") {
    return Errors.forbidden("Only the captain can delete this team.");
  }

  const { error: delErr } = await admin.from("teams").delete().eq("id", teamId);
  if (delErr) {
    return Errors.internal("Failed to delete team.");
  }

  return ok({ success: true });
}

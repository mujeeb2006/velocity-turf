import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { validateTeamCreation } from "@/lib/team/policy";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  const query = searchParams.get("q");

  const admin = createAdminClient();

  // Find teams user is a member or captain of
  const { data: userMemberships, error: memberErr } = await admin
    .from("team_members")
    .select("team_id, role, status")
    .eq("player_id", profile.id)
    .eq("status", "active");

  if (memberErr) {
    if (memberErr.code === "PGRST205") {
      // Table doesn't exist in Supabase yet (pending migration 20261035_teams_tournaments_packages.sql)
      return ok({ myTeams: [], publicTeams: [] });
    }
    console.error("Fetch user team memberships error:", memberErr);
    return Errors.internal("Could not fetch teams.");
  }

  const myTeamIds = (userMemberships || []).map((m) => m.team_id);

  // Fetch all my teams with member counts and captain profile
  let dbQuery = admin
    .from("teams")
    .select(`
      *,
      captain:profiles!teams_captain_id_fkey(id, full_name, email),
      members:team_members(id, player_id, role, status, profile:profiles(id, full_name, email))
    `);

  if (sport) {
    dbQuery = dbQuery.eq("sport", sport);
  }

  const { data: allTeams, error: teamsErr } = await dbQuery.order("created_at", { ascending: false });

  if (teamsErr) {
    console.error("Fetch teams error:", teamsErr);
    return Errors.internal("Could not fetch teams.");
  }

  // Filter or annotate
  const myTeams = (allTeams || []).filter((t) => myTeamIds.includes(t.id) || t.captain_id === profile.id);
  const otherTeams = (allTeams || []).filter((t) => !myTeamIds.includes(t.id) && t.captain_id !== profile.id);

  return ok({
    myTeams: myTeams.map((t) => ({
      ...t,
      isCaptain: t.captain_id === profile.id,
      memberCount: t.members?.filter((m) => m.status === "active").length || 0,
    })),
    otherTeams: otherTeams.map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      logo_url: t.logo_url,
      description: t.description,
      captain: t.captain,
      memberCount: t.members?.filter((m) => m.status === "active").length || 0,
    })),
  });
}

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const body = await readJson(request);
  const validation = validateTeamCreation({
    name: body?.name,
    sport: body?.sport,
    description: body?.description,
    logoUrl: body?.logoUrl,
    captainId: profile.id,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const admin = createAdminClient();

  // Create team record
  const { data: team, error: teamErr } = await admin
    .from("teams")
    .insert({
      captain_id: profile.id,
      name: validation.data.name,
      sport: validation.data.sport,
      description: validation.data.description,
      logo_url: validation.data.logoUrl,
    })
    .select("*")
    .single();

  if (teamErr) {
    console.error("Team insert error:", teamErr);
    return Errors.internal("Failed to create team. Team name may already exist.");
  }

  // Add captain as primary active member
  const { error: memberErr } = await admin.from("team_members").insert({
    team_id: team.id,
    player_id: profile.id,
    role: "captain",
    status: "active",
  });

  if (memberErr) {
    console.error("Team captain member insert error:", memberErr);
  }

  return ok({
    team: {
      ...team,
      isCaptain: true,
      memberCount: 1,
    },
  });
}

import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { generateTournamentFixtures } from "@/lib/tournament/policy";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const tournamentId = params.tournamentId;
  if (!UUID_PATTERN.test(tournamentId)) {
    return Errors.badRequest("Invalid tournament ID.");
  }

  const admin = createAdminClient();
  const { data: tour } = await admin
    .from("tournaments")
    .select("id, organizer_id, status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tour) return Errors.notFound("Tournament not found.");

  const isOrganizer = tour.organizer_id === profile.id;
  const isAdmin = profile.role === "admin";
  if (!isOrganizer && !isAdmin) {
    return Errors.forbidden("Only the organizer or admin can generate tournament fixtures.");
  }

  // Fetch approved registrations
  const { data: registrations } = await admin
    .from("tournament_registrations")
    .select("id, team_name")
    .eq("tournament_id", tournamentId)
    .eq("approval_status", "approved");

  if (!registrations || registrations.length < 2) {
    return Errors.badRequest("At least 2 approved teams are required to generate fixtures.");
  }

  // Delete existing scheduled fixtures if any
  await admin.from("tournament_fixtures").delete().eq("tournament_id", tournamentId).eq("status", "scheduled");

  const fixtureList = generateTournamentFixtures({
    tournamentId,
    registrations,
  });

  const { data: inserted, error: insErr } = await admin
    .from("tournament_fixtures")
    .insert(fixtureList)
    .select("*");

  if (insErr) {
    console.error("Fixture insert failed:", insErr);
    return Errors.internal("Could not generate tournament fixtures.");
  }

  // Update tournament status to ongoing
  await admin.from("tournaments").update({ status: "ongoing" }).eq("id", tournamentId);

  return ok({
    success: true,
    fixtures: inserted,
  });
}

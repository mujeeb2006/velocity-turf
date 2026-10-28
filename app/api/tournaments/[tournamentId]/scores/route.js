import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { validateScoreSubmission } from "@/lib/tournament/policy";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const tournamentId = params.tournamentId;
  if (!UUID_PATTERN.test(tournamentId)) {
    return Errors.badRequest("Invalid tournament ID.");
  }

  const body = await readJson(request);
  const fixtureId = typeof body?.fixtureId === "string" ? body.fixtureId : "";
  const homeScore = body?.homeScore;
  const awayScore = body?.awayScore;

  if (!UUID_PATTERN.test(fixtureId)) {
    return Errors.badRequest("Invalid fixture ID.");
  }

  const admin = createAdminClient();
  const { data: tour } = await admin
    .from("tournaments")
    .select("id, organizer_id, status, format")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tour) return Errors.notFound("Tournament not found.");

  const { data: fixture } = await admin
    .from("tournament_fixtures")
    .select("*")
    .eq("id", fixtureId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (!fixture) return Errors.notFound("Fixture not found.");

  const validation = validateScoreSubmission({
    fixture,
    tournament: tour,
    homeScore,
    awayScore,
    requestingUserId: profile.id,
    userRole: profile.role,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const { data: updated, error: updErr } = await admin
    .from("tournament_fixtures")
    .update({
      home_score: validation.data.homeScore,
      away_score: validation.data.awayScore,
      winner_registration_id: validation.data.winnerRegistrationId,
      status: validation.data.status,
    })
    .eq("id", fixtureId)
    .select("*")
    .single();

  if (updErr) {
    console.error("Fixture score update failed:", updErr);
    return Errors.internal("Could not update match score.");
  }

  // Check if all fixtures are completed
  const { data: allFixtures } = await admin
    .from("tournament_fixtures")
    .select("status")
    .eq("tournament_id", tournamentId);

  const allCompleted = (allFixtures || []).every((f) => f.status === "completed");
  if (allCompleted && allFixtures?.length > 0) {
    await admin.from("tournaments").update({ status: "completed" }).eq("id", tournamentId);
  }

  return ok({
    success: true,
    fixture: updated,
    tournamentCompleted: allCompleted,
  });
}

import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { calculateTournamentFinancials, calculateStandings } from "@/lib/tournament/policy";

export async function GET(request, { params }) {
  const tournamentId = params.tournamentId;
  if (!UUID_PATTERN.test(tournamentId)) {
    return Errors.badRequest("Invalid tournament ID.");
  }

  const profile = await getProfile();
  const admin = createAdminClient();

  const { data: tournament, error: tourErr } = await admin
    .from("tournaments")
    .select(`
      *,
      turf:turfs(id, name, city, address, sports, owner_id),
      organizer:profiles!tournaments_organizer_id_fkey(id, full_name, email),
      registrations:tournament_registrations(id, team_id, registered_by, team_name, payment_status, amount_paid, approval_status, created_at),
      fixtures:tournament_fixtures(id, round, match_number, home_registration_id, away_registration_id, home_score, away_score, winner_registration_id, status, match_date, start_time)
    `)
    .eq("id", tournamentId)
    .maybeSingle();

  if (tourErr || !tournament) {
    return Errors.notFound("Tournament not found.");
  }

  const registeredTeams = tournament.registrations || [];
  const fixtures = tournament.fixtures || [];
  const standings = calculateStandings({ registrations: registeredTeams, fixtures });
  const financials = calculateTournamentFinancials({
    entryFee: tournament.entry_fee,
    registeredTeamsCount: registeredTeams.length,
    maxTeams: tournament.max_teams,
  });

  const isOrganizer = profile?.id === tournament.organizer_id;
  const isTurfOwner = profile?.id === tournament.turf?.owner_id;
  const isAdmin = profile?.role === "admin";
  const userRegistration = profile?.id
    ? registeredTeams.find((r) => r.registered_by === profile.id)
    : null;

  return ok({
    tournament: {
      ...tournament,
      financials,
      standings,
      isOrganizer,
      isTurfOwner,
      isAdmin,
      userRegistration,
    },
  });
}

export async function PATCH(request, { params }) {
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
    .select("organizer_id, status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tour) return Errors.notFound("Tournament not found.");

  const isOrganizer = tour.organizer_id === profile.id;
  const isAdmin = profile.role === "admin";
  if (!isOrganizer && !isAdmin) {
    return Errors.forbidden("Only the organizer or an admin can update tournament status.");
  }

  const body = await readJson(request);
  const status = typeof body?.status === "string" ? body.status : null;
  const allowedStatuses = ["open", "registration_closed", "ongoing", "completed", "cancelled"];

  if (!allowedStatuses.includes(status)) {
    return Errors.badRequest(`Status must be one of: ${allowedStatuses.join(", ")}`);
  }

  const { data: updated, error: updErr } = await admin
    .from("tournaments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tournamentId)
    .select("*")
    .single();

  if (updErr) {
    return Errors.internal("Failed to update tournament.");
  }

  return ok({ tournament: updated });
}

import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import {
  validateTournamentRegistration,
  buildTournamentPaymentOrder,
} from "@/lib/tournament/policy";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required to register.");
  }

  const tournamentId = params.tournamentId;
  if (!UUID_PATTERN.test(tournamentId)) {
    return Errors.badRequest("Invalid tournament ID.");
  }

  const body = await readJson(request);
  const teamId = typeof body?.teamId === "string" && UUID_PATTERN.test(body.teamId) ? body.teamId : null;
  const rawTeamName = typeof body?.teamName === "string" ? body.teamName.trim() : "";
  const idempotencyKey = request.headers.get("x-idempotency-key") || body?.idempotencyKey || null;

  const admin = createAdminClient();

  // Load tournament
  const { data: tournament, error: tourErr } = await admin
    .from("tournaments")
    .select("*, turf:turfs(id, name, owner_id)")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tourErr || !tournament) {
    return Errors.notFound("Tournament not found.");
  }

  // Load user team if teamId passed
  let teamRecord = null;
  if (teamId) {
    const { data: team } = await admin
      .from("teams")
      .select("id, name, captain_id")
      .eq("id", teamId)
      .maybeSingle();
    teamRecord = team;
  }

  // Count existing registrations
  const { data: registrations, count: regCount } = await admin
    .from("tournament_registrations")
    .select("id, registered_by, team_id", { count: "exact" })
    .eq("tournament_id", tournamentId);

  const existingReg = (registrations || []).find(
    (r) => r.registered_by === profile.id || (teamId && r.team_id === teamId)
  );

  const validation = validateTournamentRegistration({
    tournament,
    user: profile,
    team: teamRecord,
    teamName: rawTeamName || teamRecord?.name || profile.full_name,
    existingRegistration: existingReg,
    registeredCount: regCount || registrations?.length || 0,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  // Generate payment order & authoritative price
  const order = buildTournamentPaymentOrder({
    tournament,
    teamName: validation.data.teamName,
    user: profile,
    idempotencyKey,
  });

  // Client reported fee verification (prevent tamper)
  const clientReportedAmount = body?.clientReportedAmount;
  if (
    clientReportedAmount !== undefined &&
    clientReportedAmount !== null &&
    Math.abs(Number(clientReportedAmount) - order.entryFee) > 0.01
  ) {
    return Errors.badRequest("Entry fee mismatch. Please refresh and try again.");
  }

  // Atomic insert registration
  const { data: registration, error: regErr } = await admin
    .from("tournament_registrations")
    .insert({
      tournament_id: tournament.id,
      team_id: validation.data.teamId,
      registered_by: profile.id,
      team_name: validation.data.teamName,
      payment_status: "paid",
      amount_paid: order.entryFee,
      transaction_reference: order.transactionReference,
      approval_status: "approved",
    })
    .select("id, team_name, amount_paid, transaction_reference, created_at")
    .single();

  if (regErr) {
    console.error("Tournament registration insert failed:", regErr);
    const isConflict = regErr.code === "23505";
    return isConflict
      ? Errors.conflict("You or your team are already registered for this tournament.")
      : Errors.internal("Could not complete tournament registration.");
  }

  // Record payment in tournament_payments
  await admin.from("tournament_payments").insert({
    tournament_id: tournament.id,
    registration_id: registration.id,
    user_id: profile.id,
    turf_id: tournament.turf_id,
    amount: order.entryFee,
    platform_fee: order.platformFee,
    net_amount: order.entryFee - order.platformFee,
    status: "completed",
    payment_method: order.paymentMethod,
    transaction_reference: order.transactionReference,
  });

  // Notify organizer
  if (tournament.organizer_id) {
    try {
      await admin.from("notifications").insert({
        user_id: tournament.organizer_id,
        title: "New tournament team registered",
        body: `"${registration.team_name}" registered for "${tournament.title}". Entry fee paid: ₹${registration.amount_paid}.`,
      });
    } catch (notifErr) {
      console.warn("Could not notify tournament organizer:", notifErr);
    }
  }

  return ok({
    success: true,
    registration,
    order,
  });
}

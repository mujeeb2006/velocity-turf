import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { validateTournamentCreation, calculateTournamentFinancials } from "@/lib/tournament/policy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  const turfId = searchParams.get("turfId");
  const status = searchParams.get("status");

  const admin = createAdminClient();
  let query = admin
    .from("tournaments")
    .select(`
      *,
      turf:turfs(id, name, city, address, sports, owner_id),
      organizer:profiles!tournaments_organizer_id_fkey(id, full_name, email),
      registrations:tournament_registrations(id, team_name, registered_by, approval_status, payment_status)
    `)
    .order("start_date", { ascending: true });

  if (sport) query = query.eq("sport", sport);
  if (turfId && UUID_PATTERN.test(turfId)) query = query.eq("turf_id", turfId);
  if (status) query = query.eq("status", status);

  const { data: tournaments, error } = await query;
  if (error) {
    if (error.code === "PGRST205") {
      // Table doesn't exist in Supabase yet (pending migration 20261035_teams_tournaments_packages.sql)
      return ok({ tournaments: [] });
    }
    console.error("Fetch tournaments error:", error);
    return Errors.internal("Could not fetch tournaments.");
  }

  const formatted = (tournaments || []).map((t) => {
    const regCount = (t.registrations || []).filter((r) => r.approval_status === "approved").length;
    const financials = calculateTournamentFinancials({
      entryFee: t.entry_fee,
      registeredTeamsCount: regCount,
      maxTeams: t.max_teams,
    });

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      sport: t.sport,
      format: t.format,
      teamSize: t.team_size,
      maxTeams: t.max_teams,
      registeredTeamsCount: regCount,
      entryFee: Number(t.entry_fee),
      platformFee: Number(t.platform_fee),
      prizePool: Number(t.prize_pool),
      prizeDescription: t.prize_description,
      rules: t.rules,
      registrationDeadline: t.registration_deadline,
      startDate: t.start_date,
      endDate: t.end_date,
      turfApprovalStatus: t.turf_approval_status,
      adminApprovalStatus: t.admin_approval_status,
      status: t.status,
      turf: t.turf,
      organizer: t.organizer,
      financials,
      createdAt: t.created_at,
    };
  });

  return ok({ tournaments: formatted });
}

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const role = normalizeUserRole(profile.role);
  const body = await readJson(request);
  const turfId = typeof body?.turfId === "string" ? body.turfId : "";

  if (!UUID_PATTERN.test(turfId)) {
    return Errors.badRequest("Invalid venue ID.");
  }

  const admin = createAdminClient();
  const { data: turf, error: turfErr } = await admin
    .from("turfs")
    .select("id, name, sports, status, archived_at, owner_id")
    .eq("id", turfId)
    .maybeSingle();

  if (turfErr || !turf) {
    return Errors.notFound("Turf venue not found.");
  }

  const validation = validateTournamentCreation({
    turf,
    title: body?.title,
    description: body?.description,
    sport: body?.sport,
    format: body?.format,
    teamSize: body?.teamSize,
    maxTeams: body?.maxTeams,
    entryFee: body?.entryFee,
    platformFee: body?.platformFee,
    prizePool: body?.prizePool,
    prizeDescription: body?.prizeDescription,
    rules: body?.rules,
    registrationDeadline: body?.registrationDeadline,
    startDate: body?.startDate,
    endDate: body?.endDate,
    organizerId: profile.id,
    organizerRole: role,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const insertData = {
    organizer_id: profile.id,
    turf_id: turf.id,
    title: validation.data.title,
    description: validation.data.description,
    sport: validation.data.sport,
    format: validation.data.format,
    team_size: validation.data.teamSize,
    max_teams: validation.data.maxTeams,
    entry_fee: validation.data.entryFee,
    platform_fee: validation.data.platformFee,
    prize_pool: validation.data.prizePool,
    prize_description: validation.data.prizeDescription,
    rules: validation.data.rules,
    registration_deadline: validation.data.registrationDeadline,
    start_date: validation.data.startDate,
    end_date: validation.data.endDate,
    turf_approval_status: validation.data.turfApprovalStatus,
    admin_approval_status: validation.data.adminApprovalStatus,
    status: validation.data.status,
  };

  const { data: tournament, error: insErr } = await admin
    .from("tournaments")
    .insert(insertData)
    .select("*")
    .single();

  if (insErr) {
    console.error("Tournament insert error:", insErr);
    return Errors.internal("Could not create tournament.");
  }

  // If turf approval is needed, notify turf owner
  if (validation.data.turfApprovalStatus === "pending" && turf.owner_id) {
    try {
      await admin.from("notifications").insert({
        user_id: turf.owner_id,
        title: "Tournament venue request",
        body: `${profile.full_name || "An organizer"} requested to host "${tournament.title}" (${tournament.sport}) at ${turf.name}. Please review and approve.`,
      });
    } catch (notifErr) {
      console.warn("Could not notify turf owner of tournament request:", notifErr);
    }
  }

  return ok({ tournament });
}

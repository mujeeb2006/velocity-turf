import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN, notifyUser } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { checkRateLimit, getClientIp, LIMITS } from "@/lib/rate-limit";
import { validateGameCreation, checkGameSchedulingConflict } from "@/lib/match/policy";
import { dateKey } from "@/lib/dashboard/analytics";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to view your games.");
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return Errors.forbidden("Only turf owners and admins can access this resource.");
  }

  const admin = createAdminClient();

  // Load all turfs owned by this owner
  const { data: ownerTurfs, error: turfErr } = await admin
    .from("turfs")
    .select("id, name, sports, city, address, open_time, close_time, status, archived_at")
    .eq("owner_id", profile.id);

  if (turfErr) {
    return Errors.internal("Could not load turfs for games listing.");
  }

  const turfIds = (ownerTurfs || []).map((t) => t.id);
  if (!turfIds.length) {
    return ok({ games: [], turfs: [] });
  }

  const { data: games, error: gamesErr } = await admin
    .from("matches")
    .select("*, turf:turfs(id, name, city, address, owner_id)")
    .in("turf_id", turfIds)
    .order("match_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (gamesErr) {
    return Errors.internal("Could not load community games.");
  }

  return ok({
    games: games || [],
    turfs: ownerTurfs || [],
  });
}

export async function POST(request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`game:create:ip:${ip}`, LIMITS.bookingCreate || 20);
  if (ipLimit.limited) {
    return Errors.rateLimit();
  }

  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to create a game.");
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return Errors.forbidden("Only turf owners can create games.");
  }

  const body = await readJson(request);
  if (!body) {
    return Errors.badRequest("Invalid request body.");
  }

  const turfId = typeof body.turfId === "string" ? body.turfId : "";
  if (!UUID_PATTERN.test(turfId)) {
    return Errors.badRequest("Please select a valid turf.");
  }

  const admin = createAdminClient();

  // Load turf and verify ownership
  const { data: turf, error: turfLookupErr } = await admin
    .from("turfs")
    .select("id, name, owner_id, status, sports, open_time, close_time, archived_at")
    .eq("id", turfId)
    .maybeSingle();

  if (turfLookupErr || !turf) {
    return Errors.notFound("Selected turf not found.");
  }

  // Authorize turf ownership
  if (turf.owner_id !== profile.id && role !== "admin") {
    return Errors.forbidden("You can only create games for turfs you own.");
  }

  // Validate business rules
  const validation = validateGameCreation({
    turf,
    sport: body.sport,
    title: body.title,
    description: body.description,
    matchDate: body.matchDate,
    startTime: body.startTime,
    endTime: body.endTime,
    maxPlayers: body.maxPlayers,
    pricePerPlayer: body.pricePerPlayer,
    currentDate: dateKey(),
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const { data: validated } = validation;

  // Check for scheduling conflicts (private bookings, blocks, other matches)
  try {
    const conflictCheck = await checkGameSchedulingConflict(admin, {
      turfId: validated.turfId,
      matchDate: validated.matchDate,
      startTime: validated.startTime,
    });

    if (conflictCheck.conflict) {
      return Errors.conflict(conflictCheck.reason);
    }
  } catch (conflictErr) {
    console.error("Conflict check failed:", conflictErr);
    return Errors.internal("Could not verify slot schedule availability.");
  }

  // Insert match in pending_approval status
  const { data: game, error: insertErr } = await admin
    .from("matches")
    .insert({
      turf_id: validated.turfId,
      creator_id: profile.id,
      sport: validated.sport,
      title: validated.title,
      description: validated.description,
      match_date: validated.matchDate,
      start_time: validated.startTime,
      end_time: validated.endTime,
      max_players: validated.maxPlayers,
      participant_count: 0,
      price_per_player: validated.pricePerPlayer,
      skill_level: typeof body.skillLevel === "string" ? body.skillLevel : "Any",
      status: "pending_approval",
      approval_status: "pending",
    })
    .select("*, turf:turfs(id, name, city, address)")
    .single();

  if (insertErr) {
    console.error("Failed to insert community match:", insertErr);
    return Errors.internal("Failed to submit game. Please try again.");
  }

  // Notify admins (best effort)
  try {
    await admin.rpc("notify_admins", {
      p_title: "New community game pending approval",
      p_body: `Owner submitted "${validated.title}" (${validated.sport}) at ${turf.name} on ${validated.matchDate} at ${validated.startTime.slice(0, 5)}.`,
    });
  } catch (notifErr) {
    console.warn("Admin notification failed:", notifErr);
  }

  return ok({
    game,
    message: "Game submitted successfully and is now pending admin approval.",
  });
}

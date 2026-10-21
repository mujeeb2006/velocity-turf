import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { buildGamePaymentOrder } from "@/lib/match/payments";
import { dateKey } from "@/lib/dashboard/analytics";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to join this game.");
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "player" && role !== "admin") {
    return Errors.forbidden("Only player accounts can join community games.");
  }

  const body = await readJson(request);
  const matchId = typeof body?.matchId === "string" ? body.matchId : "";

  if (!UUID_PATTERN.test(matchId)) {
    return Errors.badRequest("Invalid game ID.");
  }

  const admin = createAdminClient();

  const { data: game, error: gameErr } = await admin
    .from("matches")
    .select("*, turf:turfs(id, name, city, address, status, archived_at)")
    .eq("id", matchId)
    .maybeSingle();

  if (gameErr || !game) {
    return Errors.notFound("Game not found or no longer available.");
  }

  if (game.turf?.archived_at || game.turf?.status !== "live") {
    return Errors.badRequest("The venue for this game is currently unavailable.");
  }

  if (game.approval_status !== "approved" || game.status !== "open") {
    return Errors.badRequest(
      game.status === "full"
        ? "This game has just reached maximum capacity."
        : "This game is not open for registration."
    );
  }

  if (game.participant_count >= game.max_players) {
    return Errors.conflict("This game has just reached maximum capacity.");
  }

  // Check if session date has passed
  const today = dateKey();
  if (game.match_date < today) {
    return Errors.badRequest("This game date has already passed.");
  }

  // Check if player has already joined
  const { data: existingParticipant } = await admin
    .from("match_participants")
    .select("id")
    .eq("match_id", matchId)
    .eq("player_id", profile.id)
    .maybeSingle();

  if (existingParticipant) {
    return Errors.conflict("You have already joined this game.");
  }

  const idempotencyKey = request.headers.get("x-idempotency-key") || body?.idempotencyKey || null;

  try {
    const order = buildGamePaymentOrder({
      game,
      player: profile,
      idempotencyKey,
    });

    return ok({
      order,
    });
  } catch (err) {
    console.error("Game checkout order generation failed:", err);
    return Errors.internal("Could not prepare game checkout.");
  }
}

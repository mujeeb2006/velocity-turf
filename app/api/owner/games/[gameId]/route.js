import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";

export async function PATCH(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in.");
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return Errors.forbidden("Only turf owners can manage games.");
  }

  const gameId = params?.gameId;
  if (!UUID_PATTERN.test(gameId)) {
    return Errors.badRequest("Invalid game ID.");
  }

  const body = await readJson(request);
  if (!body) {
    return Errors.badRequest("Invalid request body.");
  }

  const admin = createAdminClient();

  // Load game with turf details
  const { data: game, error: gameErr } = await admin
    .from("matches")
    .select("*, turf:turfs(id, name, owner_id)")
    .eq("id", gameId)
    .maybeSingle();

  if (gameErr || !game) {
    return Errors.notFound("Game not found.");
  }

  // Check ownership
  if (game.turf?.owner_id !== profile.id && game.creator_id !== profile.id && role !== "admin") {
    return Errors.forbidden("You do not have permission to manage this game.");
  }

  const action = body.action || (body.status === "cancelled" ? "cancel" : "edit");

  if (action === "cancel") {
    if (game.status === "cancelled") {
      return Errors.badRequest("This game is already cancelled.");
    }
    if (game.status === "completed") {
      return Errors.badRequest("Cannot cancel a completed game.");
    }

    const { data: updated, error: updateErr } = await admin
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", gameId)
      .select("id, status")
      .single();

    if (updateErr) {
      return Errors.internal("Failed to cancel game.");
    }

    // Notify any joined participants
    const { data: participants } = await admin
      .from("match_participants")
      .select("player_id")
      .eq("match_id", gameId);

    if (participants?.length) {
      for (const p of participants) {
        try {
          await admin.from("notifications").insert({
            user_id: p.player_id,
            title: "Community game cancelled",
            body: `The game "${game.title}" at ${game.turf?.name || "the turf"} on ${game.match_date} was cancelled by the host.`,
          });
        } catch {
          // best-effort notification
        }
      }
    }

    return ok({ message: "Game cancelled successfully.", game: updated });
  }

  if (action === "edit") {
    // Only pending games can be edited
    if (game.approval_status !== "pending" && game.status !== "pending_approval") {
      return Errors.badRequest("Only games pending admin approval can be edited. Cancel and resubmit if changes are needed.");
    }

    const updates = {};
    if (typeof body.title === "string" && body.title.trim().length >= 3) {
      updates.title = body.title.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }
    if (body.maxPlayers !== undefined) {
      const maxP = Number(body.maxPlayers);
      if (Number.isInteger(maxP) && maxP >= 2 && maxP <= 50) {
        updates.max_players = maxP;
      }
    }
    if (body.pricePerPlayer !== undefined) {
      const fee = Number(body.pricePerPlayer);
      if (!Number.isNaN(fee) && Number.isFinite(fee) && fee >= 0) {
        updates.price_per_player = fee;
      }
    }

    if (!Object.keys(updates).length) {
      return Errors.badRequest("No valid fields provided for update.");
    }

    const { data: updated, error: updateErr } = await admin
      .from("matches")
      .update(updates)
      .eq("id", gameId)
      .select("*")
      .single();

    if (updateErr) {
      return Errors.internal("Failed to update game.");
    }

    return ok({ message: "Game updated successfully.", game: updated });
  }

  return Errors.badRequest("Invalid action.");
}

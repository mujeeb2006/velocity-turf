import { NextResponse } from "next/server";
import { requireAdmin, readJson, notifyUser, UUID_PATTERN } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateGameApproval, checkGameSchedulingConflict } from "@/lib/match/policy";
import { Errors, ok } from "@/lib/api-response";

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const adminProfile = gate.profile;
  const body = await readJson(request);
  if (!body) return Errors.badRequest("Invalid request body.");

  const gameId = typeof body.gameId === "string" ? body.gameId : "";
  const decision = body.decision;
  const rejectionReason = body.rejectionReason;

  if (!UUID_PATTERN.test(gameId)) {
    return Errors.badRequest("Invalid game ID.");
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

  const validation = validateGameApproval({
    game,
    decision,
    rejectionReason,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const ownerId = game.turf?.owner_id || game.creator_id;

  if (decision === "approve") {
    // Check if any conflicting booking was created in the meantime
    try {
      const conflict = await checkGameSchedulingConflict(admin, {
        turfId: game.turf_id,
        matchDate: game.match_date,
        startTime: game.start_time,
        excludeMatchId: game.id,
      });

      if (conflict.conflict) {
        return Errors.conflict(
          `Cannot approve game: ${conflict.reason} Please resolve the conflict before approving.`
        );
      }
    } catch (conflictErr) {
      console.error("Conflict check during approval failed:", conflictErr);
      return Errors.internal("Could not verify slot schedule availability.");
    }

    const { data: updated, error: updateErr } = await admin
      .from("matches")
      .update({
        status: "open",
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: adminProfile.id,
        rejection_reason: null,
      })
      .eq("id", gameId)
      .select("id, status, approval_status")
      .single();

    if (updateErr) {
      console.error("Failed to approve game:", updateErr);
      return Errors.internal("Failed to update game approval status.");
    }

    if (ownerId) {
      await notifyUser(
        admin,
        ownerId,
        `"${game.title}" is now approved!`,
        `Your community game at ${game.turf?.name || "your turf"} is now published and open for players to join at ₹${game.price_per_player}/player.`
      );
    }

    return ok({
      success: true,
      decision: "approve",
      status: "open",
      approvalStatus: "approved",
      message: "Game approved and published successfully.",
    });
  }

  if (decision === "reject") {
    const { data: updated, error: updateErr } = await admin
      .from("matches")
      .update({
        status: "rejected",
        approval_status: "rejected",
        rejection_reason: validation.rejectionReason,
      })
      .eq("id", gameId)
      .select("id, status, approval_status")
      .single();

    if (updateErr) {
      console.error("Failed to reject game:", updateErr);
      return Errors.internal("Failed to update game rejection status.");
    }

    if (ownerId) {
      await notifyUser(
        admin,
        ownerId,
        `"${game.title}" was not approved`,
        `Reason from admin: ${validation.rejectionReason}. You may edit the details and resubmit.`
      );
    }

    return ok({
      success: true,
      decision: "reject",
      status: "rejected",
      approvalStatus: "rejected",
      message: "Game rejected.",
    });
  }

  return Errors.badRequest("Invalid decision.");
}

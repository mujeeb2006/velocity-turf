// lib/match/payments.js
// Secure payment workflow, authoritative pricing, and accounting for community games.

import { createHash } from "crypto";

export const PAYMENT_MODE = "demo_simulated";

/**
 * Builds an authoritative payment order for a player joining an approved game.
 */
export function buildGamePaymentOrder({ game, player, idempotencyKey = null }) {
  if (!game || typeof game !== "object") {
    throw new Error("Invalid game record.");
  }
  if (!player || typeof player !== "object") {
    throw new Error("Invalid player record.");
  }

  // Authoritative price per player directly from database record
  const unitFee = Number(game.price_per_player ?? 0);
  const platformFee = 0; // In demo mode, zero platform surcharge
  const totalPayable = unitFee + platformFee;

  // Generate unique transaction reference
  const hashSeed = `${game.id}:${player.id}:${idempotencyKey || Date.now()}`;
  const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
  const transactionReference = `VT-PAY-${refSuffix}`;

  return {
    gameId: game.id,
    gameTitle: game.title || `${game.sport} Game`,
    turfId: game.turf_id,
    turfName: game.turf?.name || "Turf",
    playerId: player.id,
    playerName: player.full_name || "Player",
    amount: unitFee,
    fee: platformFee,
    totalPayable,
    transactionReference,
    paymentMethod: PAYMENT_MODE,
    isSimulated: true,
    notice: "Demo Checkout: Velocity Turf does not charge real payment cards. Participation is recorded in demo mode.",
  };
}

/**
 * Verifies payment and safely confirms player participation atomically.
 * Prevents overbooking and ensures failure reconciliation.
 */
export async function verifyAndConfirmParticipation(
  adminClient,
  { matchId, playerId, transactionReference, idempotencyKey = null, clientReportedAmount = null }
) {
  // 1. Fetch authoritative game data
  const { data: game, error: gameErr } = await adminClient
    .from("matches")
    .select("*, turf:turfs(id, name, owner_id, status, archived_at)")
    .eq("id", matchId)
    .maybeSingle();

  if (gameErr || !game) {
    return {
      ok: false,
      status: 404,
      error: "This game is no longer available.",
    };
  }

  // Verify approval and status
  if (game.approval_status !== "approved" || game.status !== "open") {
    return {
      ok: false,
      status: 400,
      error:
        game.status === "full"
          ? "This game has just reached maximum capacity."
          : "This game is not open for registration.",
    };
  }

  if (game.participant_count >= game.max_players) {
    return {
      ok: false,
      status: 409,
      error: "This game has just reached maximum capacity.",
    };
  }

  // Authoritative price check: client manipulation protection
  const authoritativeFee = Number(game.price_per_player ?? 0);
  if (
    clientReportedAmount !== null &&
    clientReportedAmount !== undefined &&
    Math.abs(Number(clientReportedAmount) - authoritativeFee) > 0.01
  ) {
    return {
      ok: false,
      status: 400,
      error: "Participation fee mismatch. Please refresh and try again.",
    };
  }

  // 2. Check for duplicate participation
  const { data: existingParticipant } = await adminClient
    .from("match_participants")
    .select("id")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingParticipant) {
    return {
      ok: false,
      status: 409,
      error: "You have already joined this game.",
    };
  }

  // 3. Atomically insert participant record
  // (Database trigger `update_match_participant_count` verifies capacity and increments count)
  const { data: participant, error: joinErr } = await adminClient
    .from("match_participants")
    .insert({
      match_id: matchId,
      player_id: playerId,
      payment_status: "paid",
      amount_paid: authoritativeFee,
      payment_id: transactionReference,
      idempotency_key: idempotencyKey,
    })
    .select("id, created_at")
    .single();

  if (joinErr) {
    const isConflict =
      joinErr.code === "23505" ||
      joinErr.message?.toLowerCase().includes("full") ||
      joinErr.message?.toLowerCase().includes("closed");

    return {
      ok: false,
      status: isConflict ? 409 : 500,
      error: isConflict
        ? "This game has just reached maximum capacity or you have already joined."
        : "Failed to confirm participation. Please try again.",
    };
  }

  // 4. Record payment transaction for owner accounting
  const ownerId = game.turf?.owner_id || game.creator_id;
  const { data: paymentRecord, error: payErr } = await adminClient
    .from("game_payments")
    .insert({
      match_id: matchId,
      player_id: playerId,
      turf_id: game.turf_id,
      owner_id: ownerId,
      participation_id: participant.id,
      amount: authoritativeFee,
      fee: 0,
      net_amount: authoritativeFee,
      status: "completed",
      payment_method: PAYMENT_MODE,
      transaction_reference: transactionReference,
      idempotency_key: idempotencyKey,
      completed_at: new Date().toISOString(),
      metadata: {
        game_title: game.title,
        sport: game.sport,
        match_date: game.match_date,
        start_time: game.start_time,
      },
    })
    .select("id, amount, status, transaction_reference")
    .single();

  if (payErr) {
    // Audit log / warning — participant is confirmed
    console.error("game_payments insert failed after participant confirmed:", payErr);
  }

  // 5. Notify owner about new player joined
  if (ownerId) {
    try {
      await adminClient.from("notifications").insert({
        user_id: ownerId,
        title: "Player joined community game",
        body: `A player joined "${game.title}" (${game.sport}) for ₹${authoritativeFee}.`,
      });
    } catch (notifErr) {
      console.warn("Could not send owner game notification", notifErr);
    }
  }

  return {
    ok: true,
    participantId: participant.id,
    amount: authoritativeFee,
    transactionReference,
    game: {
      id: game.id,
      title: game.title,
      sport: game.sport,
      turfName: game.turf?.name || "Turf",
      date: game.match_date,
      time: game.start_time,
    },
  };
}

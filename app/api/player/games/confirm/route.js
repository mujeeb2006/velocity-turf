import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { verifyAndConfirmParticipation } from "@/lib/match/payments";
import { checkRateLimit, getClientIp, LIMITS } from "@/lib/rate-limit";

export async function POST(request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`game:join:ip:${ip}`, LIMITS.bookingCreate || 20);
  if (ipLimit.limited) {
    return Errors.rateLimit();
  }

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
  const transactionReference =
    typeof body?.transactionReference === "string" ? body.transactionReference : "";
  const idempotencyKey =
    request.headers.get("x-idempotency-key") || body?.idempotencyKey || null;
  const clientReportedAmount =
    body?.amount !== undefined ? Number(body.amount) : null;

  if (!UUID_PATTERN.test(matchId)) {
    return Errors.badRequest("Invalid game ID.");
  }

  if (!transactionReference) {
    return Errors.badRequest("Missing transaction reference.");
  }

  const admin = createAdminClient();

  // Check idempotency if key provided
  if (idempotencyKey) {
    const { data: existingPayment } = await admin
      .from("game_payments")
      .select("id, status, match_id, player_id, amount, transaction_reference")
      .eq("idempotency_key", idempotencyKey)
      .eq("player_id", profile.id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === "completed") {
      return ok({
        confirmed: true,
        cached: true,
        transactionReference: existingPayment.transaction_reference,
        amount: Number(existingPayment.amount),
        message: "Your spot has already been confirmed.",
      });
    }
  }

  const result = await verifyAndConfirmParticipation(admin, {
    matchId,
    playerId: profile.id,
    transactionReference,
    idempotencyKey,
    clientReportedAmount,
  });

  if (!result.ok) {
    if (result.status === 409) {
      return Errors.conflict(result.error);
    }
    if (result.status === 404) {
      return Errors.notFound(result.error);
    }
    if (result.status === 400) {
      return Errors.badRequest(result.error);
    }
    return Errors.internal(result.error || "Failed to confirm participation.");
  }

  return ok({
    confirmed: true,
    participantId: result.participantId,
    amount: result.amount,
    transactionReference: result.transactionReference,
    game: result.game,
    message: `You're in! Your spot in "${result.game.title}" has been confirmed.`,
  });
}

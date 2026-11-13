import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";
import { readJson } from "@/lib/admin/server";
import { payParticipantShare } from "@/lib/group/service";

export async function POST(request, { params }) {
  const { id } = params;
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to make this payment.");
  }

  const body = await readJson(request);
  const participantId = body?.participantId;
  const idempotencyKey = request.headers.get("x-idempotency-key") || body?.idempotencyKey || null;

  if (!participantId) {
    return Errors.badRequest("Participant ID is required.");
  }

  const admin = createAdminClient();
  try {
    const result = await payParticipantShare(admin, {
      groupId: id,
      participantId,
      playerId: profile.id,
      idempotencyKey,
    });

    if (!result.ok) {
      return Errors.badRequest(result.error);
    }

    return ok(result);
  } catch (err) {
    console.error("POST /api/group-bookings/[id]/pay error:", err);
    return Errors.internal("Payment failed. Please retry.");
  }
}


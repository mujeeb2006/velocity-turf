import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors } from "@/lib/api-response";
import { payLeaderRemainingBalance } from "@/lib/group/service";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to proceed.");
  }

  const { id } = params;
  if (!id) {
    return Errors.badRequest("Group ID is required.");
  }

  const idempotencyKey = request.headers.get("x-idempotency-key") || null;
  const admin = createAdminClient();

  try {
    const result = await payLeaderRemainingBalance(admin, {
      groupId: id,
      leaderId: profile.id,
      idempotencyKey,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/group-bookings/[id]/pay-balance error:", err);
    return Errors.internal("Could not process remaining balance payment.");
  }
}


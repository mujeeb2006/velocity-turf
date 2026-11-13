import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors } from "@/lib/api-response";
import { readJson } from "@/lib/admin/server";
import { replaceGroupParticipant } from "@/lib/group/service";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to proceed.");
  }

  const { id } = params;
  if (!id) {
    return Errors.badRequest("Group ID is required.");
  }

  const body = await readJson(request);
  const { oldParticipantId, replacementPlayerId } = body || {};

  if (!oldParticipantId) {
    return Errors.badRequest("Target participant ID to replace is required.");
  }

  const admin = createAdminClient();

  try {
    const result = await replaceGroupParticipant(admin, {
      groupId: id,
      leaderId: profile.id,
      oldParticipantId,
      replacementPlayerId: replacementPlayerId || null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/group-bookings/[id]/replace-member error:", err);
    return Errors.internal("Could not replace participant.");
  }
}


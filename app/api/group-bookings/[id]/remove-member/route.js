import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";
import { readJson } from "@/lib/admin/server";
import { removeGroupParticipant } from "@/lib/group/service";

export async function POST(request, { params }) {
  const { id } = params;
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Unauthorized.");
  }

  const body = await readJson(request);
  const participantId = body?.participantId;
  if (!participantId) {
    return Errors.badRequest("Participant ID is required.");
  }

  const admin = createAdminClient();
  try {
    const result = await removeGroupParticipant(admin, {
      groupId: id,
      leaderId: profile.id,
      participantId,
    });

    if (!result.ok) {
      return Errors.badRequest(result.error);
    }

    return ok(result);
  } catch (err) {
    console.error("POST remove-member error:", err);
    return Errors.internal("Could not remove participant.");
  }
}


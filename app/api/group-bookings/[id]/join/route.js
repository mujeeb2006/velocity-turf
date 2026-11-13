import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";
import { readJson } from "@/lib/admin/server";
import { joinGroupBooking } from "@/lib/group/service";

export async function POST(request, { params }) {
  const { id } = params;
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to join this group booking.");
  }

  const body = await readJson(request);
  const invitationCode = body?.invitationCode || (String(id).startsWith("GRP-") ? id : "");

  if (!invitationCode) {
    return Errors.badRequest("Group invitation code is required.");
  }

  const admin = createAdminClient();
  try {
    const result = await joinGroupBooking(admin, {
      invitationCode,
      playerId: profile.id,
    });

    if (!result.ok) {
      return Errors.badRequest(result.error);
    }

    return ok(result);
  } catch (err) {
    console.error("POST /api/group-bookings/[id]/join error:", err);
    return Errors.internal("Could not join group booking.");
  }
}


import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";
import { getGroupBookingDetails } from "@/lib/group/service";

export async function GET(request, { params }) {
  const { id } = params;
  const profile = await getProfile();

  const admin = createAdminClient();
  try {
    const isCode = String(id).startsWith("GRP-");
    const result = await getGroupBookingDetails(admin, {
      groupId: isCode ? null : id,
      invitationCode: isCode ? id : null,
      userId: profile?.id || null,
    });

    if (!result.ok) {
      return Errors.notFound(result.error);
    }

    return ok(result);
  } catch (err) {
    console.error("GET /api/group-bookings/[id] error:", err);
    return Errors.internal("Could not load group booking details.");
  }
}


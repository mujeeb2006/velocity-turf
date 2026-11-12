import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { adminAdjustPoints } from "@/lib/rewards/service";
import { Errors } from "@/lib/api-response";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile || normalizeUserRole(profile.role) !== "admin") {
    return Errors.forbidden("Admin access required.");
  }

  try {
    const body = await request.json();
    const userId = body?.userId;
    const pointsDelta = body?.pointsDelta;
    const reason = body?.reason;

    if (!userId) return Errors.badRequest("Target user ID is required.");
    if (!pointsDelta || parseInt(pointsDelta, 10) === 0) return Errors.badRequest("Adjustment points cannot be zero.");
    if (!reason || !reason.trim()) return Errors.badRequest("A reason is mandatory for manual adjustments.");

    const admin = createAdminClient();
    const result = await adminAdjustPoints(admin, {
      userId,
      pointsDelta,
      reason,
      adminId: profile.id,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin points adjustment error:", err);
    return Errors.badRequest(err.message || "Failed to adjust user points.");
  }
}


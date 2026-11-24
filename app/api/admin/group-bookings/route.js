import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { Errors, ok } from "@/lib/api-response";
import { getAdminGroupBookings } from "@/lib/group/service";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized();
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "admin" && role !== "owner") {
    return Errors.forbidden("Only admins and turf owners can view this dashboard.");
  }

  const { searchParams } = new URL(request.url);
  const turfId = searchParams.get("turfId") || null;

  const admin = createAdminClient();
  try {
    const result = await getAdminGroupBookings(admin, {
      turfId,
      ownerId: role === "owner" ? profile.id : null,
    });
    const list = Array.isArray(result?.groupBookings)
      ? result.groupBookings
      : Array.isArray(result)
      ? result
      : [];
    return NextResponse.json({ ok: true, groupBookings: list });
  } catch (err) {
    console.error("GET /api/admin/group-bookings error:", err);
    return Errors.internal("Could not load group bookings.");
  }
}


import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });
  }

  const body = await readJson(request);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  const decision = body?.decision;
  if (!UUID_PATTERN.test(bookingId) || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, status, turf_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) {
    console.error("booking decision lookup failed", bookingError);
    return NextResponse.json({ error: "Could not load that booking." }, { status: 500 });
  }
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "This booking has already been reviewed." }, { status: 409 });
  }

  if (role === "owner") {
    const { data: turf, error: turfError } = await admin
      .from("turfs")
      .select("owner_id")
      .eq("id", booking.turf_id)
      .maybeSingle();
    if (turfError) {
      console.error("booking owner lookup failed", turfError);
      return NextResponse.json({ error: "Could not verify booking ownership." }, { status: 500 });
    }
    if (!turf || turf.owner_id !== profile.id) {
      return NextResponse.json({ error: "You can only respond to bookings for your own turfs." }, { status: 403 });
    }
  }

  const status = decision === "approve" ? "confirmed" : "declined";
  const { data: updated, error } = await admin
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id");
  if (error) {
    console.error("booking decision update failed", error);
    return NextResponse.json({ error: "Could not update that booking." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This booking has already been reviewed." }, { status: 409 });
  }

  return NextResponse.json({ success: true, status });
}

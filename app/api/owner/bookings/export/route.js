import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { Errors } from "@/lib/api-response";
import { buildBookingExcelWorkbook, queryBookingsForExport } from "@/lib/reports/booking-excel";

export async function GET(request) {
  // 1. Authenticate owner
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Please sign in to export bookings.");
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return Errors.forbidden("Only turf owners and admins can export turf bookings.");
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);

  const reqTurfId = searchParams.get("turfId")?.trim() || null;
  const startDate = searchParams.get("startDate")?.trim() || null;
  const endDate = searchParams.get("endDate")?.trim() || null;
  const status = searchParams.get("status")?.trim() || null;

  // 2. Fetch all turfs owned by this owner to enforce strict server-side authorization
  const { data: ownerTurfs, error: turfErr } = await admin
    .from("turfs")
    .select("id, name, city")
    .eq("owner_id", profile.id);

  if (turfErr) {
    console.error("Owner turfs query failed during export:", turfErr);
    return Errors.internal("Could not verify turf ownership.");
  }

  const ownedTurfIds = (ownerTurfs || []).map((t) => t.id);

  // If the owner has no turfs registered yet
  if (!ownedTurfIds.length) {
    const workbook = await buildBookingExcelWorkbook({
      bookings: [],
      scopeTitle: "Owner Turfs (0 Registered)",
      generatedBy: profile.full_name || profile.email || "Turf Owner",
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="velocity-turf-bookings-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  // If owner requested a specific turf, strictly verify ownership
  let targetTurfIds = ownedTurfIds;
  let scopeLabel = `All Owned Turfs (${ownedTurfIds.length})`;

  if (reqTurfId) {
    if (!ownedTurfIds.includes(reqTurfId)) {
      return Errors.forbidden("You do not have permission to export bookings for this turf.");
    }
    targetTurfIds = [reqTurfId];
    const targetTurf = ownerTurfs.find((t) => t.id === reqTurfId);
    scopeLabel = targetTurf ? `${targetTurf.name} (${targetTurf.city})` : reqTurfId;
  }

  // 3. Query bookings from Supabase
  try {
    const { bookings, idempotencyMap } = await queryBookingsForExport(admin, {
      turfIds: targetTurfIds,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null,
    });

    // 4. Generate formatted Excel workbook
    const workbook = await buildBookingExcelWorkbook({
      bookings,
      idempotencyKeyMap: idempotencyMap,
      scopeTitle: scopeLabel,
      generatedBy: profile.full_name || profile.email || "Turf Owner",
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `velocity-turf-bookings-${todayStr}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Export bookings generation failed:", err);
    return Errors.internal("Failed to generate Excel report. Please try again.");
  }
}

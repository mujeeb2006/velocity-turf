import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors } from "@/lib/api-response";
import { buildBookingExcelWorkbook, queryBookingsForExport } from "@/lib/reports/booking-excel";

export async function GET(request) {
  // 1. Authenticate admin user
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);

  const turfId = searchParams.get("turfId")?.trim() || null;
  const ownerId = searchParams.get("ownerId")?.trim() || null;
  const startDate = searchParams.get("startDate")?.trim() || null;
  const endDate = searchParams.get("endDate")?.trim() || null;
  const status = searchParams.get("status")?.trim() || null;
  const paymentStatus = searchParams.get("paymentStatus")?.trim() || null;

  try {
    const { bookings, idempotencyMap } = await queryBookingsForExport(admin, {
      turfIds: turfId ? [turfId] : null,
      ownerId: ownerId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null,
      paymentStatus: paymentStatus || null,
    });

    let scopeLabel = "System Consolidated (All Turfs & Owners)";
    if (turfId) scopeLabel = `Turf: ${turfId}`;
    else if (ownerId) scopeLabel = `Owner: ${ownerId}`;

    const workbook = await buildBookingExcelWorkbook({
      bookings,
      idempotencyKeyMap: idempotencyMap,
      scopeTitle: scopeLabel,
      generatedBy: gate.profile?.full_name || gate.profile?.email || "Velocity Turf Administrator",
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `velocity-turf-all-bookings-admin-${todayStr}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Admin bookings export failed:", err);
    return Errors.internal("Failed to generate admin Excel report. Please try again.");
  }
}

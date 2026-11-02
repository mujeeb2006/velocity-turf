import { NextResponse } from "next/server";
import { requireAdmin, readJson, UUID_PATTERN, notifyUser } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE /api/admin/turfs/[turfId]
// Permanently deletes a turf and all its associated database records and storage images.
// Caller must be an authenticated admin.
// Query param: ?force=true   — skip the active-bookings warning and proceed immediately.
export async function DELETE(request, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { turfId } = params;

  if (!turfId || !UUID_PATTERN.test(String(turfId))) {
    return NextResponse.json({ error: "A valid turf ID is required." }, { status: 400 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  const admin = createAdminClient();

  // 1. Load the turf (verify it exists and capture metadata).
  const { data: turf, error: turfErr } = await admin
    .from("turfs")
    .select("id, name, owner_id, image")
    .eq("id", turfId)
    .maybeSingle();

  if (turfErr) {
    console.error("DELETE turf - lookup failed", turfErr);
    return NextResponse.json({ error: "Could not load turf details." }, { status: 500 });
  }
  if (!turf) {
    return NextResponse.json({ error: "Turf not found." }, { status: 404 });
  }

  // 2. Check for active bookings (pending or confirmed) unless force=true.
  if (!force) {
    const { data: activeBookings, error: bookErr } = await admin
      .from("bookings")
      .select("id, status, booking_date, start_time, player_id")
      .eq("turf_id", turfId)
      .in("status", ["pending", "confirmed"])
      .limit(20);

    if (bookErr) {
      console.error("DELETE turf - active bookings check failed", bookErr);
      return NextResponse.json({ error: "Could not check for active bookings." }, { status: 500 });
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        {
          warning: true,
          activeBookings: activeBookings.length,
          message:
            "This turf has " +
            activeBookings.length +
            " active booking" +
            (activeBookings.length === 1 ? "" : "s") +
            " (pending or confirmed). They will be cancelled before the turf is deleted. Re-confirm to proceed.",
        },
        { status: 409 }
      );
    }
  }

  // 3. Delete all related data in FK dependency order.
  try {
    let e;

    // 3a. Cancel + delete active bookings and notify affected players.
    const { data: activeBookings2 } = await admin
      .from("bookings")
      .select("id, player_id")
      .eq("turf_id", turfId)
      .in("status", ["pending", "confirmed"]);

    if (activeBookings2 && activeBookings2.length > 0) {
      // Notify each affected player once.
      const uniquePlayers = [...new Set(activeBookings2.map((b) => b.player_id))];
      await Promise.all(
        uniquePlayers.map((pid) =>
          notifyUser(
            admin,
            pid,
            "Booking cancelled",
            "A booking on \"" + turf.name + "\" was cancelled because the turf was removed from the platform."
          )
        )
      );
    }

    // 3b. Delete disputes linked to this turf (ON DELETE RESTRICT).
    e = (await admin.from("disputes").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("disputes: " + e.message);

    // 3c. Delete reviews on this turf.
    e = (await admin.from("reviews").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("reviews: " + e.message);

    // 3d. Delete tournament payments (ON DELETE RESTRICT on turf_id).
    e = (await admin.from("tournament_payments").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("tournament_payments: " + e.message);

    // 3e. Delete tournaments (ON DELETE RESTRICT; registrations + fixtures CASCADE from tournaments).
    e = (await admin.from("tournaments").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("tournaments: " + e.message);

    // 3f. Delete all bookings on this turf (ON DELETE RESTRICT).
    e = (await admin.from("bookings").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("bookings: " + e.message);

    // 3g. Delete blocked slots.
    e = (await admin.from("blocked_slots").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("blocked_slots: " + e.message);

    // 3h. Delete matches (ON DELETE RESTRICT; match_participants CASCADE from matches).
    e = (await admin.from("matches").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("matches: " + e.message);

    // 3i. Delete maintenance records (CASCADE, but be explicit for safety).
    e = (await admin.from("maintenance_tasks").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("maintenance_tasks: " + e.message);

    e = (await admin.from("maintenance_windows").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("maintenance_windows: " + e.message);

    // 3j. Delete turf slots (CASCADE, but explicit for safety).
    e = (await admin.from("turf_slots").delete().eq("turf_id", turfId)).error;
    if (e) throw new Error("turf_slots: " + e.message);

    // 3k. Delete the turf row itself.
    e = (await admin.from("turfs").delete().eq("id", turfId)).error;
    if (e) throw new Error("turf row: " + e.message);

    // 3l. Remove turf images from Supabase Storage (best-effort — never block deletion).
    // The `image` field may be a plain URL string or a JSON string like
    // {"cover":"https://...","gallery":["https://..."]}.
    const imageUrls = [];
    if (typeof turf.image === "string" && turf.image.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(turf.image);
        if (typeof parsed.cover === "string") imageUrls.push(parsed.cover);
        if (Array.isArray(parsed.gallery)) imageUrls.push(...parsed.gallery);
      } catch {
        // Not valid JSON — ignore.
      }
    } else if (typeof turf.image === "string" && turf.image.startsWith("http")) {
      imageUrls.push(turf.image);
    }

    const storagePaths = imageUrls
      .filter((u) => typeof u === "string" && u.includes("/storage/v1/object/public/turf-images/"))
      .map((u) => {
        try {
          const idx = u.indexOf("/turf-images/");
          return idx !== -1 ? u.slice(idx + "/turf-images/".length) : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const { error: storageErr } = await admin.storage.from("turf-images").remove(storagePaths);
      if (storageErr) {
        console.warn("DELETE turf - storage cleanup partial failure (non-fatal):", storageErr.message);
      }
    }

    // 3m. Notify the owner (best-effort).
    try {
      await notifyUser(
        admin,
        turf.owner_id,
        "Turf removed",
        "Your turf listing \"" + turf.name + "\" has been permanently removed from Velocity Turf by an administrator."
      );
    } catch (notifErr) {
      console.warn("DELETE turf - owner notification failed (non-fatal):", notifErr.message);
    }

  } catch (err) {
    console.error("DELETE /api/admin/turfs/[turfId] - deletion failed:", err.message);
    return NextResponse.json(
      { error: "Failed to delete turf: " + err.message + ". Please try again." },
      { status: 500 }
    );
  }

  console.info("Admin " + gate.profile.id + " permanently deleted turf " + turfId + " (\"" + turf.name + "\")");

  return NextResponse.json({
    success: true,
    message: "Turf \"" + turf.name + "\" has been permanently deleted.",
    deletedId: turfId,
  });
}

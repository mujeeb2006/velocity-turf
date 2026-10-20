import { NextResponse } from "next/server";
import { requireAdmin, UUID_PATTERN } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";

// DELETE /api/admin/users/[userId]
export async function DELETE(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { userId } = params;

  if (!userId || !UUID_PATTERN.test(String(userId))) {
    return NextResponse.json({ error: "A valid user ID is required." }, { status: 400 });
  }

  if (userId === gate.profile.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: targetProfile, error: profileErr } = await admin
    .from("profiles")
    .select("id, full_name, role, email")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("profile lookup failed", profileErr);
    return NextResponse.json({ error: "Could not verify user profile." }, { status: 500 });
  }

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const targetRole = normalizeUserRole(targetProfile.role);
  if (targetRole === "admin") {
    return NextResponse.json({ error: "Admin accounts cannot be deleted from this panel." }, { status: 403 });
  }

  try {
    let e;

    e = (await admin.from("disputes").delete().eq("raised_by", userId)).error;
    if (e) throw new Error("disputes: " + e.message);

    e = (await admin.from("reviews").delete().eq("player_id", userId)).error;
    if (e) throw new Error("reviews: " + e.message);

    e = (await admin.from("bookings").delete().eq("player_id", userId)).error;
    if (e) throw new Error("bookings: " + e.message);

    if (targetRole === "owner") {
      const { data: ownerTurfs, error: tqe } = await admin.from("turfs").select("id").eq("owner_id", userId);
      if (tqe) throw new Error("turfs query: " + tqe.message);

      if (ownerTurfs && ownerTurfs.length > 0) {
        const turfIds = ownerTurfs.map((t) => t.id);

        e = (await admin.from("disputes").delete().in("turf_id", turfIds)).error;
        if (e) throw new Error("turf disputes: " + e.message);

        e = (await admin.from("reviews").delete().in("turf_id", turfIds)).error;
        if (e) throw new Error("turf reviews: " + e.message);

        e = (await admin.from("bookings").delete().in("turf_id", turfIds)).error;
        if (e) throw new Error("turf bookings: " + e.message);

        e = (await admin.from("blocked_slots").delete().in("turf_id", turfIds)).error;
        if (e) throw new Error("blocked_slots: " + e.message);

        e = (await admin.from("matches").delete().in("turf_id", turfIds)).error;
        if (e) throw new Error("matches: " + e.message);

        e = (await admin.from("turfs").delete().eq("owner_id", userId)).error;
        if (e) throw new Error("turfs: " + e.message);
      }
    }

    e = (await admin.from("payouts").delete().eq("owner_id", userId)).error;
    if (e) throw new Error("payouts: " + e.message);

    e = (await admin.from("match_participants").delete().eq("player_id", userId)).error;
    if (e) throw new Error("match_participants: " + e.message);

    e = (await admin.from("notifications").delete().eq("user_id", userId)).error;
    if (e) throw new Error("notifications: " + e.message);

    e = (await admin.from("profiles").delete().eq("id", userId)).error;
    if (e) throw new Error("profile: " + e.message);

    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error("auth.users: " + authErr.message);

  } catch (err) {
    console.error("User deletion failed:", err.message);
    return NextResponse.json({ error: "Failed to delete user: " + err.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "User has been permanently deleted.",
    deletedId: userId,
  });
}

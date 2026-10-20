import { NextResponse } from "next/server";
import { requireAdmin, readJson, UUID_PATTERN, notifyUser } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await readJson(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { userId, targetRole, resolution } = body;

  if (!userId || !UUID_PATTERN.test(String(userId))) {
    return NextResponse.json({ error: "A valid user ID is required." }, { status: 400 });
  }

  const normalizedTarget = normalizeUserRole(targetRole);
  if (normalizedTarget !== "player" && normalizedTarget !== "owner") {
    return NextResponse.json(
      { error: "Role can only be changed between Player and Turf Owner." },
      { status: 400 }
    );
  }

  // Self-demotion guard
  if (userId === gate.profile.id) {
    return NextResponse.json(
      { error: "You cannot change your own administrative role." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Look up target profile
  const { data: targetProfile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !targetProfile) {
    return NextResponse.json({ error: "User profile not found." }, { status: 404 });
  }

  const currentRole = normalizeUserRole(targetProfile.role);

  // Protected: ordinary admins cannot modify other admins
  if (currentRole === "admin") {
    return NextResponse.json(
      { error: "Administrative roles cannot be changed from this panel." },
      { status: 403 }
    );
  }

  if (currentRole === normalizedTarget) {
    return NextResponse.json(
      { success: true, message: `User is already a ${normalizedTarget === "owner" ? "Turf Owner" : "Player"}.` }
    );
  }

  // Active turfs check when demoting Turf Owner -> Player
  if (currentRole === "owner" && normalizedTarget === "player") {
    const { data: activeTurfs, error: turfsErr } = await admin
      .from("turfs")
      .select("id, name, status")
      .eq("owner_id", userId)
      .is("archived_at", null);

    if (turfsErr) {
      console.error("Failed to query active turfs for owner:", turfsErr);
      return NextResponse.json({ error: "Could not verify owner's turf listings." }, { status: 500 });
    }

    if (activeTurfs && activeTurfs.length > 0) {
      if (resolution !== "archive_turfs" && resolution !== "confirm_demote") {
        return NextResponse.json(
          {
            warning: true,
            hasActiveTurfs: true,
            turfs: activeTurfs.map((t) => ({ id: t.id, name: t.name, status: t.status })),
            message: `This Turf Owner has ${activeTurfs.length} active turf listing${
              activeTurfs.length === 1 ? "" : "s"
            }. You must choose how to resolve these turfs before completing the role change.`,
          },
          { status: 409 }
        );
      }

      if (resolution === "archive_turfs") {
        const { error: archiveErr } = await admin
          .from("turfs")
          .update({
            archived_at: new Date().toISOString(),
            status: "rejected",
          })
          .eq("owner_id", userId)
          .is("archived_at", null);

        if (archiveErr) {
          console.error("Failed to archive turfs for demoted owner:", archiveErr);
          return NextResponse.json({ error: "Failed to archive owner turfs." }, { status: 500 });
        }
      }
    }
  }

  // 1. Update database profile
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ role: normalizedTarget })
    .eq("id", userId);

  if (updateErr) {
    console.error("Failed to update profile role:", updateErr);
    return NextResponse.json({ error: "Could not update user role in database." }, { status: 500 });
  }

  // 2. Update Supabase Auth app_metadata and user_metadata
  try {
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: normalizedTarget },
      user_metadata: { role: normalizedTarget },
    });
  } catch (authErr) {
    console.warn("Failed to update auth user metadata:", authErr);
  }

  // 3. Notify user
  const notifyMessage =
    normalizedTarget === "owner"
      ? "Your account has been upgraded to Turf Owner. You can now access the Owner Dashboard."
      : "Your role has been updated to Player.";
  await notifyUser(admin, userId, "Role Updated", notifyMessage);

  return NextResponse.json({
    success: true,
    user: {
      id: userId,
      role: normalizedTarget === "owner" ? "Turf Owner" : "Player",
    },
    message: `Role successfully changed to ${normalizedTarget === "owner" ? "Turf Owner" : "Player"}.`,
  });
}

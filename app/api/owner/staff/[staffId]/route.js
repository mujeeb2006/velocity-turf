import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { ALL_STAFF_PERMISSIONS, STAFF_ROLES } from "@/lib/staff/policy";

export async function PATCH(request, { params }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const staffId = params.staffId;
  if (!UUID_PATTERN.test(staffId)) {
    return NextResponse.json({ error: "Invalid staff ID." }, { status: 400 });
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only turf owners can update staff permissions." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: staff, error: fetchErr } = await admin
    .from("venue_staff")
    .select("*")
    .eq("id", staffId)
    .maybeSingle();

  if (fetchErr || !staff) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  if (role === "owner" && staff.owner_id !== profile.id) {
    return NextResponse.json({ error: "You can only manage your own staff." }, { status: 403 });
  }

  const body = await readJson(request);
  const updates = {};

  if (body.role) {
    const validRoles = STAFF_ROLES.map((r) => r.id);
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role: ${body.role}` }, { status: 400 });
    }
    updates.role = body.role;
  }

  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: "Permissions must be an array." }, { status: 400 });
    }
    const validPerms = ALL_STAFF_PERMISSIONS.map((p) => p.id);
    for (const p of body.permissions) {
      if (!validPerms.includes(p)) {
        return NextResponse.json({ error: `Invalid permission: ${p}` }, { status: 400 });
      }
    }
    updates.permissions = body.permissions;
  }

  if (body.status) {
    if (!["invited", "active", "revoked"].includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    updates.status = body.status;
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await admin
    .from("venue_staff")
    .update(updates)
    .eq("id", staffId)
    .select()
    .single();

  if (updateError) {
    console.error("update staff error:", updateError);
    return NextResponse.json({ error: "Failed to update staff." }, { status: 500 });
  }

  // Audit log
  await admin.from("staff_audit_log").insert({
    turf_id: staff.turf_id,
    actor_id: profile.id,
    actor_role: role,
    action: "update_staff_permissions",
    target_type: "venue_staff",
    target_id: staffId,
    details: updates,
  });

  return NextResponse.json({ success: true, staff: updated });
}

export async function DELETE(request, { params }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const staffId = params.staffId;
  if (!UUID_PATTERN.test(staffId)) {
    return NextResponse.json({ error: "Invalid staff ID." }, { status: 400 });
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only turf owners can remove staff." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: staff, error: fetchErr } = await admin
    .from("venue_staff")
    .select("*")
    .eq("id", staffId)
    .maybeSingle();

  if (fetchErr || !staff) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  if (role === "owner" && staff.owner_id !== profile.id) {
    return NextResponse.json({ error: "You can only manage your own staff." }, { status: 403 });
  }

  const { error: delError } = await admin.from("venue_staff").delete().eq("id", staffId);
  if (delError) {
    console.error("delete staff error:", delError);
    return NextResponse.json({ error: "Failed to remove staff." }, { status: 500 });
  }

  await admin.from("staff_audit_log").insert({
    turf_id: staff.turf_id,
    actor_id: profile.id,
    actor_role: role,
    action: "remove_staff",
    target_type: "venue_staff",
    target_id: staffId,
    details: { removed_email: staff.email, role: staff.role },
  });

  return NextResponse.json({ success: true });
}


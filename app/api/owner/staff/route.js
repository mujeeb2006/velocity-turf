import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import {
  validateStaffInvite,
  generateInviteToken,
  calculateInviteExpiry,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/staff/policy";
import { sendSmartNotification, NOTIFICATION_EVENT_TYPES, NOTIFICATION_CATEGORIES, buildDedupKey } from "@/lib/notifications/service";

// GET /api/owner/staff
export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  const admin = createAdminClient();

  // If user is a staff member, return their staff record and permitted venues
  if (role === "staff") {
    const { data: staffMemberships } = await admin
      .from("venue_staff")
      .select("id, owner_id, turf_id, role, permissions, status, turf:turfs(id, name)")
      .eq("user_id", profile.id)
      .eq("status", "active");

    return NextResponse.json({
      isStaff: true,
      memberships: staffMemberships || [],
      staff: staffMemberships?.[0] || null,
    });
  }

  // If owner or admin, list staff for their venues
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });
  }

  let ownerId = profile.id;

  let query = admin
    .from("venue_staff")
    .select(`
      id, owner_id, turf_id, user_id, email, full_name, role, permissions,
      status, invite_token, invite_expires_at, created_at,
      user_profile:profiles!venue_staff_user_id_fkey(id, full_name, email),
      turf:turfs(id, name)
    `)
    .order("created_at", { ascending: false });

  if (role === "owner") {
    query = query.eq("owner_id", ownerId);
  }

  const { data: staffList, error } = await query;
  if (error) {
    console.error("fetch staff error:", error);
    return NextResponse.json({ error: "Failed to load venue staff." }, { status: 500 });
  }

  // Mark expired invites
  const now = new Date().toISOString();
  const processed = (staffList || []).map((s) => {
    if (s.status === "invited" && s.invite_expires_at < now) {
      return { ...s, status: "expired" };
    }
    return s;
  });

  return NextResponse.json({ isStaff: false, staff: processed });
}

// POST /api/owner/staff
export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only turf owners can invite staff." }, { status: 403 });
  }

  const body = await readJson(request);
  const email = body?.email;
  const staffRole = body?.role || "receptionist";
  const turfId = body?.turf_id || body?.turfId || null;
  const permissions = body?.permissions || ROLE_DEFAULT_PERMISSIONS[staffRole] || [];
  const fullName = String(body?.full_name || body?.fullName || "").trim();

  if (turfId && !UUID_PATTERN.test(turfId)) {
    return NextResponse.json({ error: "Invalid turf ID." }, { status: 400 });
  }

  const admin = createAdminClient();

  // If owner, verify turf belongs to them if turfId specified
  if (role === "owner" && turfId) {
    const { data: turf } = await admin.from("turfs").select("id, owner_id").eq("id", turfId).maybeSingle();
    if (!turf || turf.owner_id !== profile.id) {
      return NextResponse.json({ error: "You can only invite staff to your own turfs." }, { status: 403 });
    }
  }

  const validation = validateStaffInvite({ email, role: staffRole, permissions, turfId });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
  }

  const sanitizedEmail = validation.sanitized.email;

  // Check if active or invited staff record already exists for this email and turf
  let dupQuery = admin
    .from("venue_staff")
    .select("id, status")
    .eq("email", sanitizedEmail)
    .eq("owner_id", profile.id)
    .in("status", ["active", "invited"]);

  if (turfId) {
    dupQuery = dupQuery.eq("turf_id", turfId);
  }

  const { data: existing } = await dupQuery.maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "A staff invitation or active membership already exists for this email." },
      { status: 409 }
    );
  }

  // Check if user already has an account
  const { data: existingUser } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", sanitizedEmail)
    .maybeSingle();

  const token = generateInviteToken();
  const expiresAt = calculateInviteExpiry(7);

  const { data: newStaff, error: insertError } = await admin
    .from("venue_staff")
    .insert({
      owner_id: profile.id,
      turf_id: turfId,
      user_id: existingUser?.id || null,
      email: sanitizedEmail,
      full_name: fullName || existingUser?.full_name || "",
      role: staffRole,
      permissions: validation.sanitized.permissions,
      status: "invited",
      invite_token: token,
      invite_expires_at: expiresAt,
    })
    .select(`
      id, owner_id, turf_id, user_id, email, full_name, role, permissions,
      status, invite_token, invite_expires_at, created_at,
      turf:turfs(id, name)
    `)
    .single();

  if (insertError) {
    console.error("insert staff error:", insertError);
    return NextResponse.json({ error: "Failed to create staff invitation." }, { status: 500 });
  }

  // Audit log
  await admin.from("staff_audit_log").insert({
    turf_id: turfId,
    actor_id: profile.id,
    actor_role: role,
    action: "invite_staff",
    target_type: "venue_staff",
    target_id: newStaff.id,
    details: { email: sanitizedEmail, role: staffRole, permissions: validation.sanitized.permissions },
  });

  // If user already exists, send in-app notification
  if (existingUser?.id) {
    await sendSmartNotification(admin, {
      userId: existingUser.id,
      title: "Venue Staff Invitation",
      body: `You've been invited by ${profile.full_name || "the turf owner"} to join as ${staffRole.replace("_", " ")}.`,
      eventType: NOTIFICATION_EVENT_TYPES.VENUE_CHANGE,
      category: NOTIFICATION_CATEGORIES.GENERAL,
      link: `/owner`,
      metadata: { staffId: newStaff.id, token },
      dedupKey: buildDedupKey("staff_invite", newStaff.id, existingUser.id),
    });
  }

  return NextResponse.json({
    success: true,
    staff: newStaff,
    inviteLink: `/auth/setup-password?token=${token}&type=staff`,
  });
}


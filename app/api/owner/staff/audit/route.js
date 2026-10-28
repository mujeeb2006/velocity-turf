import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const role = normalizeUserRole(profile.role);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only turf owners can view staff audit logs." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const turfId = searchParams.get("turfId");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  let query = admin
    .from("staff_audit_log")
    .select(`
      id, turf_id, actor_id, actor_role, action, target_type, target_id,
      details, ip_address, created_at,
      actor:profiles!staff_audit_log_actor_id_fkey(id, full_name, email),
      turf:turfs(id, name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role === "owner") {
    const { data: myTurfs } = await admin.from("turfs").select("id").eq("owner_id", profile.id);
    const myTurfIds = (myTurfs || []).map((t) => t.id);
    if (turfId) {
      if (!myTurfIds.includes(turfId)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
      query = query.eq("turf_id", turfId);
    } else {
      query = query.in("turf_id", myTurfIds);
    }
  } else if (turfId) {
    query = query.eq("turf_id", turfId);
  }

  const { data: logs, error } = await query;
  if (error) {
    console.error("fetch staff audit log error:", error);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }

  return NextResponse.json({ logs: logs || [] });
}


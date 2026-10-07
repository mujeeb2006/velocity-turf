// SERVER-ONLY helpers for admin route handlers and the admin page.
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Returns { profile } for a signed-in admin, or { error: NextResponse }.
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (normalizeUserRole(profile.role) !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { profile };
}

// profiles.email is not readable by the `authenticated` role (see schema.sql
// column grants), so admin-wide user lists have to come from the service role.
export async function loadAdminUsers(admin = createAdminClient()) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, role, email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Best-effort: a failed notification must never fail the admin action itself.
export async function notifyUser(admin, userId, title, body) {
  const { error } = await admin.from("notifications").insert({ user_id: userId, title, body });
  if (error) console.error("notifyUser failed", { userId, code: error.code, message: error.message });
}

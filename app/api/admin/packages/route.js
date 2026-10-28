import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { validatePackageConfig } from "@/lib/package/policy";

export async function GET() {
  const profile = await getProfile();
  if (!profile?.id) return Errors.unauthorized("Sign in required.");
  if (normalizeUserRole(profile.role) !== "admin") return Errors.forbidden("Admin access required.");

  const admin = createAdminClient();
  const { data: packages, error } = await admin
    .from("packages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Errors.internal("Could not fetch packages.");
  }

  return ok({ packages });
}

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) return Errors.unauthorized("Sign in required.");
  if (normalizeUserRole(profile.role) !== "admin") return Errors.forbidden("Admin access required.");

  const body = await readJson(request);
  const validation = validatePackageConfig({
    name: body?.name,
    description: body?.description,
    price: body?.price,
    totalSessions: body?.totalSessions,
    validityDays: body?.validityDays,
    eligibleSports: body?.eligibleSports,
    eligibleTurfs: body?.eligibleTurfs,
    maxSessionsPerDay: body?.maxSessionsPerDay,
    restrictions: body?.restrictions,
  });

  if (!validation.ok) {
    return Errors.badRequest(validation.error);
  }

  const admin = createAdminClient();
  const { data: pkg, error: insErr } = await admin
    .from("packages")
    .insert({
      name: validation.data.name,
      description: validation.data.description,
      price: validation.data.price,
      total_sessions: validation.data.totalSessions,
      validity_days: validation.data.validityDays,
      eligible_sports: validation.data.eligibleSports,
      eligible_turfs: validation.data.eligibleTurfs,
      max_sessions_per_day: validation.data.maxSessionsPerDay,
      restrictions: validation.data.restrictions,
      is_active: true,
    })
    .select("*")
    .single();

  if (insErr) {
    console.error("Admin create package failed:", insErr);
    return Errors.internal("Could not create sports package.");
  }

  return ok({ package: pkg });
}

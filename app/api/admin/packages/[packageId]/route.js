import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";

export async function PATCH(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) return Errors.unauthorized("Sign in required.");
  if (normalizeUserRole(profile.role) !== "admin") return Errors.forbidden("Admin access required.");

  const packageId = params.packageId;
  if (!UUID_PATTERN.test(packageId)) return Errors.badRequest("Invalid package ID.");

  const body = await readJson(request);
  const updates = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim().slice(0, 80);
  if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 500);
  if (body.price !== undefined && Number(body.price) >= 0) updates.price = Number(body.price);
  if (body.totalSessions !== undefined && Number(body.totalSessions) > 0) updates.total_sessions = Number(body.totalSessions);
  if (body.validityDays !== undefined && Number(body.validityDays) > 0) updates.validity_days = Number(body.validityDays);
  if (Array.isArray(body.eligibleSports)) updates.eligible_sports = body.eligibleSports;
  if (Array.isArray(body.eligibleTurfs)) updates.eligible_turfs = body.eligibleTurfs;
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
  if (typeof body.restrictions === "object" && body.restrictions !== null) updates.restrictions = body.restrictions;

  const admin = createAdminClient();
  const { data: updated, error: updErr } = await admin
    .from("packages")
    .update(updates)
    .eq("id", packageId)
    .select("*")
    .single();

  if (updErr) {
    return Errors.internal("Failed to update sports package.");
  }

  return ok({ package: updated });
}

export async function DELETE(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) return Errors.unauthorized("Sign in required.");
  if (normalizeUserRole(profile.role) !== "admin") return Errors.forbidden("Admin access required.");

  const packageId = params.packageId;
  if (!UUID_PATTERN.test(packageId)) return Errors.badRequest("Invalid package ID.");

  const admin = createAdminClient();
  // Soft deactivate so historical user_packages don't break
  const { data: updated, error } = await admin
    .from("packages")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", packageId)
    .select("*")
    .single();

  if (error) return Errors.internal("Failed to deactivate package.");
  return ok({ success: true, package: updated });
}

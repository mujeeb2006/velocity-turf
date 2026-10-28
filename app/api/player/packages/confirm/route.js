import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const body = await readJson(request);
  const packageId = typeof body?.packageId === "string" ? body.packageId : "";
  const transactionReference = typeof body?.transactionReference === "string" ? body.transactionReference.trim() : "";
  const clientReportedAmount = body?.clientReportedAmount;

  if (!UUID_PATTERN.test(packageId) || !transactionReference) {
    return Errors.badRequest("Invalid package confirmation payload.");
  }

  const admin = createAdminClient();

  // Authoritative package check
  const { data: pkg, error: pkgErr } = await admin
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .eq("is_active", true)
    .maybeSingle();

  if (pkgErr || !pkg) {
    return Errors.notFound("This package is no longer available.");
  }

  // Price tampering check
  const authoritativePrice = Number(pkg.price);
  if (
    clientReportedAmount !== undefined &&
    clientReportedAmount !== null &&
    Math.abs(Number(clientReportedAmount) - authoritativePrice) > 0.01
  ) {
    return Errors.badRequest("Price mismatch detected. Please refresh and try again.");
  }

  // Check if transaction reference was already used
  const { data: existingUserPkg } = await admin
    .from("user_packages")
    .select("id")
    .eq("transaction_reference", transactionReference)
    .maybeSingle();

  if (existingUserPkg) {
    return Errors.conflict("This purchase has already been confirmed.");
  }

  // Calculate expiry
  const now = new Date();
  const expiresAt = new Date(now.getTime() + pkg.validity_days * 24 * 60 * 60 * 1000).toISOString();

  // Insert user_packages record
  const { data: userPkg, error: insErr } = await admin
    .from("user_packages")
    .insert({
      user_id: profile.id,
      package_id: pkg.id,
      total_sessions: pkg.total_sessions,
      remaining_sessions: pkg.total_sessions,
      price_paid: authoritativePrice,
      transaction_reference: transactionReference,
      payment_status: "paid",
      status: "active",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (insErr) {
    console.error("User package confirmation insert failed:", insErr);
    return Errors.internal("Could not activate your package pass.");
  }

  // Notify user
  try {
    await admin.from("notifications").insert({
      user_id: profile.id,
      title: "Sports Pass Activated!",
      body: `Your "${pkg.name}" is now active with ${pkg.total_sessions} sessions valid for ${pkg.validity_days} days.`,
    });
  } catch (notifErr) {
    console.warn("Could not send package purchase notification:", notifErr);
  }

  return ok({
    success: true,
    userPackage: {
      id: userPkg.id,
      packageName: pkg.name,
      remainingSessions: userPkg.remaining_sessions,
      totalSessions: userPkg.total_sessions,
      expiresAt: userPkg.expires_at,
      status: userPkg.status,
    },
  });
}

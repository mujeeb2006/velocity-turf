import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";
import { buildPackagePaymentOrder } from "@/lib/package/policy";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const body = await readJson(request);
  const packageId = typeof body?.packageId === "string" ? body.packageId : "";

  if (!UUID_PATTERN.test(packageId)) {
    return Errors.badRequest("Invalid package ID.");
  }

  const admin = createAdminClient();
  const { data: pkg, error: pkgErr } = await admin
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .eq("is_active", true)
    .maybeSingle();

  if (pkgErr || !pkg) {
    return Errors.notFound("Sports package not found or no longer active.");
  }

  const idempotencyKey = request.headers.get("x-idempotency-key") || body?.idempotencyKey || null;

  try {
    const order = buildPackagePaymentOrder({
      pkg,
      user: profile,
      idempotencyKey,
    });

    return ok({ order });
  } catch (err) {
    console.error("Package checkout order generation failed:", err);
    return Errors.internal("Could not prepare package checkout.");
  }
}

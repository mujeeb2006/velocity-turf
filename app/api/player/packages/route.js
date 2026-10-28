import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";

export async function GET() {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const admin = createAdminClient();

  // Load user's purchased passes with package config
  const { data: userPackages, error: pkgErr } = await admin
    .from("user_packages")
    .select(`
      *,
      package:packages(*)
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (pkgErr) {
    console.error("Fetch player packages error:", pkgErr);
    return Errors.internal("Could not load your sports passes.");
  }

  // Load redemption history
  const { data: redemptions, error: redErr } = await admin
    .from("package_redemptions")
    .select(`
      *,
      user_package:user_packages(id, package:packages(name)),
      booking:bookings(id, booking_date, start_time, sport, turf:turfs(name))
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (redErr) {
    console.warn("Fetch package redemptions error:", redErr);
  }

  // Format packages and check if active expired
  const now = new Date();
  const formatted = (userPackages || []).map((up) => {
    const isExpired = new Date(up.expires_at) < now;
    const effectiveStatus = isExpired && up.status === "active" ? "expired" : up.status;

    return {
      id: up.id,
      packageId: up.package_id,
      packageName: up.package?.name || "Sports Pass",
      description: up.package?.description || "",
      totalSessions: up.total_sessions,
      remainingSessions: up.remaining_sessions,
      pricePaid: Number(up.price_paid),
      status: effectiveStatus,
      purchasedAt: up.purchased_at,
      expiresAt: up.expires_at,
      eligibleSports: up.package?.eligible_sports || [],
      restrictions: up.package?.restrictions || {},
      transactionReference: up.transaction_reference,
    };
  });

  return ok({
    packages: formatted,
    activeCount: formatted.filter((p) => p.status === "active" && p.remainingSessions > 0).length,
    redemptions: redemptions || [],
  });
}

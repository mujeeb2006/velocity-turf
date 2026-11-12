import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { getRewardSettings, updateRewardSettings } from "@/lib/rewards/service";
import { Errors } from "@/lib/api-response";

export async function GET() {
  const profile = await getProfile();
  if (!profile || normalizeUserRole(profile.role) !== "admin") {
    return Errors.forbidden("Admin access required.");
  }

  const admin = createAdminClient();

  try {
    const [settings, referralsRes, walletsRes, transactionsRes] = await Promise.all([
      getRewardSettings(admin),
      admin
        .from("referrals")
        .select("*, referrer:referrer_id(id, full_name, email, referral_code), referred:referred_id(id, full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("reward_wallets")
        .select("*, profile:user_id(id, full_name, email, role, referral_code)")
        .order("lifetime_earned", { ascending: false })
        .limit(100),
      admin
        .from("reward_transactions")
        .select("*, profile:user_id(id, full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return NextResponse.json({
      settings,
      referrals: referralsRes.data || [],
      wallets: walletsRes.data || [],
      transactions: transactionsRes.data || [],
    });
  } catch (err) {
    console.error("Admin rewards fetch error:", err);
    return Errors.internal("Could not load rewards administration data.");
  }
}

export async function PUT(request) {
  const profile = await getProfile();
  if (!profile || normalizeUserRole(profile.role) !== "admin") {
    return Errors.forbidden("Admin access required.");
  }

  try {
    const body = await request.json();
    const admin = createAdminClient();
    const updated = await updateRewardSettings(admin, body, profile.id);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    console.error("Admin rewards update error:", err);
    return Errors.badRequest(err.message || "Failed to update reward settings.");
  }
}


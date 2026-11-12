import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRewardSettings } from "@/lib/rewards/service";
import { Errors } from "@/lib/api-response";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body?.code || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ valid: false, error: "Referral code is required." });
    }

    const admin = createAdminClient();
    const settings = await getRewardSettings(admin);

    const { data: referrer } = await admin
      .from("profiles")
      .select("id, full_name, referral_code")
      .eq("referral_code", code)
      .maybeSingle();

    if (!referrer) {
      return NextResponse.json({ valid: false, error: "Invalid referral code. Please check and try again." });
    }

    // Check referrer limit
    const { count: completedCount } = await admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrer.id)
      .eq("status", "completed");

    if ((completedCount || 0) >= settings.maxReferralsPerUser) {
      return NextResponse.json({
        valid: false,
        error: "This referral code has already reached its maximum limit of successful referrals.",
      });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.full_name || "A friend",
      welcomePoints: settings.referredWelcomePoints,
    });
  } catch (err) {
    console.error("Error validating referral code:", err);
    return Errors.internal("Could not validate referral code.");
  }
}


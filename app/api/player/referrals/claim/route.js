import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { registerReferralOnSignup } from "@/lib/rewards/service";
import { Errors } from "@/lib/api-response";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return Errors.unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const referralCode = String(body?.referralCode || "").trim().toUpperCase();

    if (!referralCode) {
      return Errors.badRequest("Referral code is required.");
    }

    const admin = createAdminClient();

    // Check if player is already referred
    const { data: currentProfile } = await admin
      .from("profiles")
      .select("id, referred_by")
      .eq("id", profile.id)
      .maybeSingle();

    if (currentProfile?.referred_by) {
      return NextResponse.json({
        success: false,
        message: "You have already claimed a referral code.",
      });
    }

    const result = await registerReferralOnSignup(admin, {
      newUserId: profile.id,
      referralCode,
    });

    if (!result.success) {
      if (result.reason === "invalid_code") {
        return Errors.badRequest("Invalid referral code.");
      }
      if (result.reason === "self_referral_blocked") {
        return Errors.badRequest("You cannot use your own referral code.");
      }
      if (result.reason === "referrer_limit_reached") {
        return Errors.badRequest("This referrer has already reached their maximum referral limit of 3 friends.");
      }
      return Errors.badRequest("Could not apply referral code.");
    }

    return NextResponse.json({
      success: true,
      message: "Referral applied successfully! Complete your first booking to unlock your welcome reward.",
    });
  } catch (err) {
    console.error("Error claiming referral code:", err);
    return Errors.internal("Could not process referral code.");
  }
}


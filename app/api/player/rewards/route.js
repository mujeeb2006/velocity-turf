import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { getPlayerWalletSummary, getPlayerReferralSummary } from "@/lib/rewards/service";
import { Errors } from "@/lib/api-response";
import { DEFAULT_REWARD_SETTINGS } from "@/lib/rewards/policy";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile) return Errors.unauthorized();

  const admin = createAdminClient();
  const origin = request.nextUrl.origin || "";

  try {
    const [walletSettled, referralSettled] = await Promise.allSettled([
      getPlayerWalletSummary(admin, profile.id),
      getPlayerReferralSummary(admin, profile.id, origin),
    ]);

    const walletData = walletSettled.status === "fulfilled"
      ? walletSettled.value
      : {
          walletError: "Your rewards wallet couldn't be loaded. Please try again.",
          wallet: {
            availablePoints: 0,
            available_points: 0,
            pendingPoints: 0,
            pending_points: 0,
            lifetimeEarned: 0,
            lifetime_earned: 0,
            lifetimeRedeemed: 0,
            lifetime_redeemed: 0,
            inrValue: 0,
            equivalent_inr: 0,
          },
          settings: DEFAULT_REWARD_SETTINGS,
          transactions: [],
        };

    const referralData = referralSettled.status === "fulfilled"
      ? referralSettled.value
      : {
          referralError: "Referral data temporarily unavailable.",
          referralCode: profile?.referral_code || "",
          referralLink: `${origin}/signup?ref=${encodeURIComponent(profile?.referral_code || "")}`,
          maxReferrals: 3,
          maxAllowed: 3,
          completedCount: 0,
          totalCompleted: 0,
          totalCount: 0,
          isLimitReached: false,
          slots: [],
          settings: DEFAULT_REWARD_SETTINGS,
        };

    if (walletSettled.status === "rejected") {
      console.error("Wallet summary query error:", walletSettled.reason);
    }
    if (referralSettled.status === "rejected") {
      console.error("Referral summary query error:", referralSettled.reason);
    }

    return NextResponse.json({
      ...walletData,
      referral: referralData,
      success: true,
    });
  } catch (err) {
    console.error("Error in /api/player/rewards:", err);
    return Errors.internal("Your rewards wallet couldn't be loaded. Please try again.");
  }
}


import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { getPlayerWalletSummary, getPlayerReferralSummary } from "@/lib/rewards/service";
import { Errors } from "@/lib/api-response";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile) return Errors.unauthorized();

  const admin = createAdminClient();
  const origin = request.nextUrl.origin || "";

  try {
    const [walletData, referralData] = await Promise.all([
      getPlayerWalletSummary(admin, profile.id),
      getPlayerReferralSummary(admin, profile.id, origin),
    ]);

    return NextResponse.json({
      ...walletData,
      referral: referralData,
    });
  } catch (err) {
    console.error("Error fetching player rewards:", err);
    return Errors.internal("Could not load rewards wallet.");
  }
}


// app/api/owner/turfs/[turfId]/pricing/route.js
// Manage advanced pricing rules for a turf listing.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { validatePricingRules, calculateSlotPrice } from "@/lib/turf/pricing";

export const dynamic = "force-dynamic";

async function getAuthContext() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { user: null, profile: null };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  return { user, profile, admin };
}

export async function GET(request, { params }) {
  const { turfId } = params;
  const { user, profile, admin } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: turf, error: turfErr } = await admin
    .from("turfs")
    .select("id, name, owner_id, base_price, peak_price, open_time, close_time, pricing_rules, status")
    .eq("id", turfId)
    .single();

  if (turfErr || !turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  // Authorization: must be owner or admin
  const isOwner = turf.owner_id === profile.id;
  const isAdmin = profile.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: You don't own this turf." }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    turf: {
      id: turf.id,
      name: turf.name,
      base_price: Number(turf.base_price) || 0,
      peak_price: Number(turf.peak_price) || 0,
      open_time: turf.open_time,
      close_time: turf.close_time,
      pricing_rules: turf.pricing_rules || {},
    },
  });
}

export async function PATCH(request, { params }) {
  const { turfId } = params;
  const { user, profile, admin } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: turf, error: turfErr } = await admin
    .from("turfs")
    .select("id, name, owner_id, base_price, peak_price, pricing_rules")
    .eq("id", turfId)
    .single();

  if (turfErr || !turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  const isOwner = turf.owner_id === profile.id;
  const isAdmin = profile.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: You cannot modify pricing for this turf." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const basePrice = body.base_price !== undefined ? Number(body.base_price) : Number(turf.base_price);
    const peakPrice = body.peak_price !== undefined ? Number(body.peak_price) : Number(turf.peak_price);

    const validation = validatePricingRules(body.pricing_rules || body, basePrice);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
    }

    const updates = {
      base_price: basePrice,
      peak_price: peakPrice,
      pricing_rules: validation.rules,
    };

    const { data: updatedTurf, error: updateErr } = await admin
      .from("turfs")
      .update(updates)
      .eq("id", turfId)
      .select("id, name, base_price, peak_price, pricing_rules")
      .single();

    if (updateErr) {
      console.error("Failed to update turf pricing:", updateErr);
      return NextResponse.json({ error: "Database error updating pricing rules." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Pricing updated successfully.",
      turf: updatedTurf,
    });
  } catch (err) {
    console.error("Pricing update error:", err);
    return NextResponse.json({ error: "Malformed request payload." }, { status: 400 });
  }
}

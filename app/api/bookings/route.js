import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { dateKey } from "@/lib/dashboard/analytics";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile?.id) {
    return NextResponse.json({ error: "Please sign in to book a turf." }, { status: 401 });
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "player" && role !== "admin") {
    return NextResponse.json({ error: "Only player accounts can book turfs." }, { status: 403 });
  }

  const body = await readJson(request);
  const turfId = typeof body?.turfId === "string" ? body.turfId : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime : "";
  const requestedSport = typeof body?.sport === "string" ? body.sport : "";
  const bookingDate = typeof body?.bookingDate === "string" ? body.bookingDate : dateKey();

  if (!UUID_PATTERN.test(turfId) || !startTime) {
    return NextResponse.json({ error: "Please select a valid turf and time slot." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Fetch the turf
  const { data: turf, error: turfError } = await admin
    .from("turfs")
    .select("id, name, owner_id, status, sports, base_price, peak_price, open_time, close_time")
    .eq("id", turfId)
    .maybeSingle();

  if (turfError || !turf) {
    return NextResponse.json({ error: "This turf is unavailable right now." }, { status: 404 });
  }

  if (turf.status !== "live") {
    return NextResponse.json({ error: "This turf is not currently available for booking." }, { status: 400 });
  }

  const sport = requestedSport || turf.sports?.[0];
  if (!sport || (turf.sports && turf.sports.length > 0 && !turf.sports.includes(sport))) {
    return NextResponse.json({ error: "This sport is not offered at this turf." }, { status: 400 });
  }

  // 2. Verify slot availability via turf_slots RPC
  const { data: slots, error: slotsError } = await admin.rpc("turf_slots", {
    p_turf_id: turfId,
    p_date: bookingDate,
  });

  if (slotsError) {
    console.error("turf_slots rpc error", slotsError);
    return NextResponse.json({ error: "Could not verify slot availability. Please try again." }, { status: 500 });
  }

  const slotList = slots || [];
  const targetSlot = slotList.find((s) => s.slot_time === startTime || s.slot_time.slice(0, 5) === startTime.slice(0, 5));

  if (!targetSlot) {
    return NextResponse.json({ error: "That time slot is not offered today." }, { status: 400 });
  }

  if (targetSlot.status !== "available") {
    return NextResponse.json({ error: "That slot was just taken — pick another." }, { status: 409 });
  }

  // 3. Dynamic pricing based on slot occupancy
  const bookedCount = slotList.filter((s) => s.status !== "available").length;
  const occupancy = slotList.length ? Math.round((bookedCount / slotList.length) * 100) : 0;
  const price = occupancy > 70 ? Number(turf.peak_price) : Number(turf.base_price);

  // 4. Insert booking via admin client
  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert({
      turf_id: turfId,
      player_id: profile.id,
      booking_date: bookingDate,
      start_time: targetSlot.slot_time,
      sport,
      players_count: 1,
      price,
      status: "confirmed",
    })
    .select("id, price, booking_date, start_time")
    .single();

  if (insertError) {
    console.error("booking insertion failed", insertError);
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "That slot was just taken — pick another." }, { status: 409 });
    }
    return NextResponse.json({ error: "Couldn't complete the booking. Please try again." }, { status: 500 });
  }

  // 5. Notify the turf owner of new booking (best effort)
  try {
    if (turf.owner_id) {
      await admin.from("notifications").insert({
        user_id: turf.owner_id,
        title: "New booking confirmed",
        body: `${profile.full_name || "A player"} booked ${sport} at ${turf.name} for ${startTime.slice(0, 5)}.`,
      });
    }
  } catch (notifErr) {
    console.warn("Could not send owner notification", notifErr);
  }

  return NextResponse.json({
    id: booking.id,
    price: Number(booking.price ?? price),
  });
}

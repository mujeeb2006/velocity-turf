// app/api/owner/walk-in/route.js
// Record walk-in (offline) bookings for authorized turf owners and staff.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calculateSlotPrice } from "@/lib/turf/pricing";

export const dynamic = "force-dynamic";

export async function POST(request) {
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
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User profile not found." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      turfId,
      bookingDate,
      startTime,
      sport,
      customerName,
      customerPhone,
      playersCount,
      price: customPrice,
      paymentMethod = "cash",
      paymentStatus = "paid",
    } = body;

    // Validate required fields
    if (!turfId || !bookingDate || !startTime || !sport || !customerName?.trim()) {
      return NextResponse.json(
        { error: "Please provide turf, date, start time, sport, and customer name." },
        { status: 400 }
      );
    }

    // Verify turf existence and authorization
    const { data: turf, error: turfErr } = await admin
      .from("turfs")
      .select("id, name, owner_id, sports, base_price, peak_price, pricing_rules, open_time, close_time, status, archived_at")
      .eq("id", turfId)
      .single();

    if (turfErr || !turf || turf.archived_at) {
      return NextResponse.json({ error: "Turf listing not found or archived." }, { status: 404 });
    }

    // Authorization check: Owner, Admin, or Staff with manage_bookings
    const isOwner = turf.owner_id === profile.id;
    const isAdmin = profile.role === "admin";
    let isAuthorizedStaff = false;

    if (!isOwner && !isAdmin) {
      const { data: staffMember } = await admin
        .from("venue_staff")
        .select("id, role, permissions, status")
        .eq("user_id", profile.id)
        .eq("status", "active")
        .or(`turf_id.eq.${turfId},turf_id.is.null`)
        .maybeSingle();

      if (staffMember) {
        isAuthorizedStaff =
          staffMember.role === "venue_manager" ||
          (Array.isArray(staffMember.permissions) &&
            staffMember.permissions.includes("manage_bookings"));
      }
    }

    if (!isOwner && !isAdmin && !isAuthorizedStaff) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to record bookings for this turf." },
        { status: 403 }
      );
    }

    const cleanTime = String(startTime).slice(0, 5) + ":00";

    // 1. Check operating hours
    const openTime = String(turf.open_time || "06:00").slice(0, 5);
    const closeTime = String(turf.close_time || "22:00").slice(0, 5);
    const slotHour = cleanTime.slice(0, 5);
    if (slotHour < openTime || slotHour >= closeTime) {
      return NextResponse.json(
        { error: `Slot is outside operating hours (${openTime} - ${closeTime}).` },
        { status: 400 }
      );
    }

    // 2. Check for conflicting confirmed/pending bookings
    const { data: existingBookings } = await admin
      .from("bookings")
      .select("id, status")
      .eq("turf_id", turfId)
      .eq("booking_date", bookingDate)
      .eq("start_time", cleanTime)
      .in("status", ["pending", "confirmed", "completed"]);

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { error: "This time slot is already booked. Please choose an available slot." },
        { status: 409 }
      );
    }

    // 3. Check for conflicting blocked slots
    const { data: blockedSlot } = await admin
      .from("blocked_slots")
      .select("id")
      .eq("turf_id", turfId)
      .eq("blocked_date", bookingDate)
      .eq("start_time", cleanTime)
      .maybeSingle();

    if (blockedSlot) {
      return NextResponse.json(
        { error: "This slot is currently blocked by turf management." },
        { status: 409 }
      );
    }

    // 4. Calculate authoritative pricing if not manually overridden
    let finalPrice;
    if (customPrice !== undefined && customPrice !== null && !isNaN(Number(customPrice))) {
      finalPrice = Math.max(0, Number(customPrice));
    } else {
      const priceCalculation = calculateSlotPrice(turf, bookingDate, cleanTime);
      finalPrice = priceCalculation.price;
    }

    // 5. Insert walk-in booking record
    const bookingPayload = {
      turf_id: turfId,
      player_id: profile.id, // recorded by staff/owner
      booking_date: bookingDate,
      start_time: cleanTime,
      sport: sport,
      players_count: Math.max(1, Number(playersCount) || 1),
      price: finalPrice,
      status: paymentStatus === "pending" ? "pending" : "confirmed",
      booking_source: "walk_in",
      customer_name: customerName.trim(),
      customer_phone: customerPhone ? customerPhone.trim() : "",
      payment_method: paymentMethod,
      payment_status: paymentStatus,
    };

    const { data: newBooking, error: insertErr } = await admin
      .from("bookings")
      .insert(bookingPayload)
      .select("*")
      .single();

    if (insertErr) {
      console.error("Walk-in booking insert error:", insertErr);
      if (insertErr.code === "23505") {
        return NextResponse.json(
          { error: "A booking was just confirmed for this slot. Please choose another." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to record walk-in booking." }, { status: 500 });
    }

    // Fail-safe audit log
    try {
      await admin.from("staff_audit_log").insert({
        turf_id: turfId,
        actor_id: profile.id,
        actor_role: profile.role,
        action: "create_walk_in_booking",
        target_type: "booking",
        target_id: newBooking.id,
        details: {
          customerName: customerName.trim(),
          bookingDate,
          startTime: cleanTime,
          price: finalPrice,
          paymentMethod,
          paymentStatus,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log failed for walk-in booking:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Walk-in booking recorded successfully.",
      booking: newBooking,
    });
  } catch (err) {
    console.error("Walk-in booking handler error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

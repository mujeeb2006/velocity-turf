import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { dateKey } from "@/lib/dashboard/analytics";
import { createHash } from "crypto";
import { logger, startTimer, getRequestId } from "@/lib/logger";
import { Errors, ok } from "@/lib/api-response";
import { checkRateLimit, getClientIp, LIMITS } from "@/lib/rate-limit";

// ── Idempotency helpers ───────────────────────────────────────────────────────

function hashPayload(obj) {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

async function resolveIdempotency(admin, key, playerId, payloadHash) {
  if (!key || typeof key !== "string" || key.length > 200) return null;

  // Try to find an existing key record
  const { data: existing } = await admin
    .from("idempotency_keys")
    .select("key, status, payload_hash, response_body")
    .eq("key", key)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    // Same key, different payload → conflict
    if (existing.payload_hash !== payloadHash) {
      return {
        conflict: true,
        response: NextResponse.json(
          { error: "This request key was already used with a different booking. Please use a new key." },
          { status: 409 }
        ),
      };
    }
    // Same key, same payload → return cached result
    if (existing.status === "success" && existing.response_body) {
      return { cached: true, response: NextResponse.json(existing.response_body) };
    }
    // Same key, still pending (parallel in-flight request) → 409
    if (existing.status === "pending") {
      return {
        conflict: true,
        response: NextResponse.json(
          { error: "A booking with this key is already being processed. Please wait." },
          { status: 409 }
        ),
      };
    }
    // Failed previously — allow retry with same key+payload
    return { retry: true, existingKey: existing };
  }

  // Reserve the key (INSERT … ON CONFLICT DO NOTHING)
  const { error: insertErr } = await admin.from("idempotency_keys").insert({
    key,
    player_id: playerId,
    payload_hash: payloadHash,
    status: "pending",
  });

  if (insertErr) {
    // Race: another request inserted first — re-fetch
    const { data: raced } = await admin
      .from("idempotency_keys")
      .select("key, status, payload_hash, response_body")
      .eq("key", key)
      .eq("player_id", playerId)
      .maybeSingle();

    if (raced && raced.payload_hash !== payloadHash) {
      return {
        conflict: true,
        response: NextResponse.json(
          { error: "This request key was already used with a different booking." },
          { status: 409 }
        ),
      };
    }
    if (raced?.status === "success") {
      return { cached: true, response: NextResponse.json(raced.response_body) };
    }
  }

  return { fresh: true };
}

async function finaliseIdempotency(admin, key, playerId, bookingId, responseBody, success) {
  if (!key) return;
  await admin
    .from("idempotency_keys")
    .update({
      status: success ? "success" : "failed",
      resource_id: bookingId ?? null,
      response_body: responseBody,
    })
    .eq("key", key)
    .eq("player_id", playerId);
}

// ── POST /api/bookings ────────────────────────────────────────────────────────

export async function POST(request) {
  const requestId = getRequestId(request);
  const elapsed = startTimer();
  let userId = null;
  let userName = "A player";

  // ── Rate limit (pre-auth, by IP) ──────────────────────────────────────────
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`booking:ip:${ip}`, LIMITS.bookingCreate);
  if (ipLimit.limited) {
    logger.warn("booking rate limited", { requestId, ip, route: "/api/bookings" });
    return Errors.rateLimit(undefined, requestId);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const profile = await getProfile();
  if (profile?.id) {
    const role = normalizeUserRole(profile.role);
    if (role !== "player" && role !== "admin") {
      logger.warn("booking forbidden - wrong role", { requestId, role, route: "/api/bookings" });
      return Errors.forbidden("Only player accounts can book turfs.", requestId);
    }
    userId = profile.id;
    userName = profile.full_name || userName;
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const admin = createAdminClient();
      const { data: { user: authUser } } = await admin.auth.getUser(token);
      if (authUser?.id) {
        const { data: p } = await admin
          .from("profiles")
          .select("id, role, full_name")
          .eq("id", authUser.id)
          .maybeSingle();
        const role = normalizeUserRole(p?.role);
        if (role !== "player" && role !== "admin") {
          logger.warn("booking forbidden - wrong role (bearer)", { requestId, role, route: "/api/bookings" });
          return Errors.forbidden("Only player accounts can book turfs.", requestId);
        }
        userId = authUser.id;
        userName = p?.full_name || userName;
      }
    }
  }

  if (!userId) {
    logger.warn("booking unauthenticated", { requestId, route: "/api/bookings" });
    return Errors.unauthorized("Please sign in to book a turf.", requestId);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const body = await readJson(request);
  const turfId = typeof body?.turfId === "string" ? body.turfId : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime : "";
  const requestedSport = typeof body?.sport === "string" ? body.sport : "";
  const bookingDate = typeof body?.bookingDate === "string" ? body.bookingDate : dateKey();
  const idempotencyKey = request.headers.get("x-idempotency-key") || body?.idempotencyKey || null;

  // Per-user rate limit (post-auth)
  const userLimit = checkRateLimit(`booking:user:${userId}`, LIMITS.bookingCreate);
  if (userLimit.limited) {
    logger.warn("booking rate limited per user", { requestId, userId, route: "/api/bookings" });
    return Errors.rateLimit(undefined, requestId);
  }

  if (!UUID_PATTERN.test(turfId) || !startTime) {
    logger.warn("booking bad request", { requestId, userId, turfId: turfId || null, route: "/api/bookings" });
    return Errors.badRequest("Please select a valid turf and time slot.", requestId);
  }

  const admin = createAdminClient();

  // ── Idempotency check ─────────────────────────────────────────────────────
  const payloadHash = hashPayload({ turfId, startTime, bookingDate, sport: requestedSport });
  if (idempotencyKey) {
    const idem = await resolveIdempotency(admin, idempotencyKey, userId, payloadHash);
    if (idem?.cached) return idem.response;
    if (idem?.conflict) return idem.response;
    // fresh or retry — continue
  }

  // ── Fetch turf ────────────────────────────────────────────────────────────
  const { data: turf, error: turfError } = await admin
    .from("turfs")
    .select("id, name, owner_id, status, sports, base_price, peak_price, open_time, close_time")
    .eq("id", turfId)
    .maybeSingle();

  if (turfError || !turf) {
    logger.error("booking - turf fetch failed", { requestId, userId, turfId, route: "/api/bookings" }, turfError);
    await finaliseIdempotency(admin, idempotencyKey, userId, null, { error: "Turf unavailable" }, false);
    return turfError ? Errors.internal(undefined, requestId) : Errors.notFound("This turf is unavailable right now.", requestId);
  }

  if (turf.status !== "live") {
    logger.info("booking rejected - turf not live", { requestId, userId, turfId, turfStatus: turf.status });
    return Errors.badRequest("This turf is not currently available for booking.", requestId);
  }

  const sport = requestedSport || turf.sports?.[0];
  if (!sport || (turf.sports?.length > 0 && !turf.sports.includes(sport))) {
    logger.warn("booking rejected - sport not offered", { requestId, userId, turfId, sport });
    return Errors.badRequest("This sport is not offered at this turf.", requestId);
  }

  // ── Verify slot availability (server-side, before insert) ─────────────────
  // Note: the DB trigger also checks atomically — this pre-flight gives a
  // clean 409 before hitting the unique constraint.
  const { data: slots, error: slotsError } = await admin.rpc("turf_slots", {
    p_turf_id: turfId,
    p_date: bookingDate,
  });

  if (slotsError) {
    logger.error("booking - turf_slots RPC failed", { requestId, userId, turfId, route: "/api/bookings" }, slotsError);
    return Errors.internal("Could not verify slot availability. Please try again.", requestId);
  }

  const slotList = slots || [];
  const targetSlot = slotList.find(
    (s) => s.slot_time === startTime || s.slot_time.slice(0, 5) === startTime.slice(0, 5)
  );

  if (!targetSlot) {
    logger.warn("booking - slot not found", { requestId, userId, turfId, startTime });
    return Errors.badRequest("That time slot is not offered today.", requestId);
  }

  if (targetSlot.status !== "available") {
    logger.info("booking - slot not available", { requestId, userId, turfId, startTime, slotStatus: targetSlot.status });
    return Errors.slotTaken(requestId);
  }

  // ── Dynamic pricing ───────────────────────────────────────────────────────
  const bookedCount = slotList.filter((s) => s.status !== "available").length;
  const occupancy = slotList.length ? Math.round((bookedCount / slotList.length) * 100) : 0;
  const price = occupancy > 70 ? Number(turf.peak_price) : Number(turf.base_price);

  // ── Insert booking (DB trigger validates atomically + locks turf row) ─────
  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert({
      turf_id: turfId,
      player_id: userId,
      booking_date: bookingDate,
      start_time: targetSlot.slot_time,
      sport,
      players_count: 1,
      price,
      status: "confirmed", // trigger enforces this
    })
    .select("id, price, booking_date, start_time")
    .single();

  if (insertError) {
    const isConcurrentConflict =
      insertError.code === "23505" ||
      insertError.message?.includes("not available");

    if (isConcurrentConflict) {
      logger.info("booking - concurrent slot conflict", { requestId, userId, turfId, startTime, dbCode: insertError.code });
    } else {
      logger.error("booking - DB insert failed", { requestId, userId, turfId, startTime, route: "/api/bookings" }, insertError);
    }

    const errMsg = isConcurrentConflict ? "That slot was just taken — pick another." : "Couldn't complete the booking. Please try again.";
    await finaliseIdempotency(admin, idempotencyKey, userId, null, { error: errMsg }, false);
    return isConcurrentConflict ? Errors.slotTaken(requestId) : Errors.internal(errMsg, requestId);
  }

  const responseBody = {
    id: booking.id,
    price: Number(booking.price ?? price),
  };

  // ── Finalise idempotency key ──────────────────────────────────────────────
  await finaliseIdempotency(admin, idempotencyKey, userId, booking.id, responseBody, true);

  // ── Notify turf owner (best-effort, non-blocking) ─────────────────────────
  try {
    if (turf.owner_id) {
      await admin.from("notifications").insert({
        user_id: turf.owner_id,
        title: "New booking confirmed",
        body: `${userName} booked ${sport} at ${turf.name} on ${bookingDate} at ${startTime.slice(0, 5)}.`,
      });
    }
  } catch (notifErr) {
    console.warn("Could not send owner notification", notifErr);
  }

  logger.info("booking created", { requestId, userId, turfId, bookingId: booking.id, startTime, bookingDate, sport, price, durationMs: elapsed() });
  return ok(responseBody);
}

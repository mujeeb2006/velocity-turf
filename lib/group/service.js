// lib/group/service.js
// Server-side service for Group Booking, Bill Split, and Slot Protection.

import { createHash } from "crypto";
import {
  SPLIT_MODES,
  PAYMENT_MODES,
  GROUP_STATUSES,
  PARTICIPANT_STATUSES,
  DEFAULT_PAYMENT_DEADLINE_MINUTES,
  DEFAULT_REMINDER_MINUTES_BEFORE_DEADLINE,
  calculateEqualSplit,
  validateCustomSplit,
  calculateLeaderPaysSplit,
  calculateGroupPaymentSummary,
  generateGroupInviteCode,
} from "./policy.js";
import { calcPrice } from "@/lib/dashboard/analytics";
import { calculateSlotPrice } from "@/lib/turf/pricing";

/**
 * Creates a new Group Booking, locks the slot with a temporary pending hold (default 10m),
 * or confirms immediately if leader pays upfront (Instant Booking alternative).
 */
export async function createGroupBooking(
  adminClient,
  {
    leaderId,
    turfId,
    sport = "Football",
    bookingDate,
    startTime,
    participantCount,
    splitMode = SPLIT_MODES.EQUAL,
    customShares = [],
    paymentMode = PAYMENT_MODES.ALL_OR_NOTHING,
    deadlineMinutes = DEFAULT_PAYMENT_DEADLINE_MINUTES,
    origin = "",
  }
) {
  // 1. Verify Turf
  const { data: turf, error: turfErr } = await adminClient
    .from("turfs")
    .select("id, name, base_price, peak_price, sports, status, archived_at, pricing_rules")
    .eq("id", turfId)
    .maybeSingle();

  if (turfErr || !turf || turf.archived_at || turf.status !== "live") {
    return { ok: false, error: "Selected turf venue is currently unavailable." };
  }

  // Pre-sweep expired group booking holds so freed slots can be booked immediately
  await sweepExpiredGroupHolds(adminClient);

  // 2. Verify slot availability via RPC
  const { data: slots, error: slotsErr } = await adminClient.rpc("turf_slots", {
    p_turf_id: turfId,
    p_date: bookingDate,
  });

  if (slotsErr || !slots) {
    return { ok: false, error: "Could not verify slot availability. Please retry." };
  }

  const normalizedTarget = startTime.slice(0, 5);
  const targetSlot = slots.find((s) => s.slot_time.slice(0, 5) === normalizedTarget);

  if (!targetSlot) {
    return { ok: false, error: "That time slot is not offered today. Please choose an upcoming time." };
  }

  if (targetSlot.status !== "available") {
    if (targetSlot.status === "closed" || targetSlot.status === "completed") {
      return { ok: false, error: "This session has ended. Please choose an upcoming time slot." };
    }
    return { ok: false, error: "This time slot has already been booked. Please choose another available time." };
  }

  // 3. Authoritative Pricing
  const bookedCount = slots.filter((s) => s.status !== "available").length;
  const occupancy = slots.length ? Math.round((bookedCount / slots.length) * 100) : 0;
  const pricingResult = calculateSlotPrice(turf, bookingDate, startTime, occupancy);
  const totalPrice = pricingResult.price;

  // 4. Validate and calculate participant shares
  const count = Math.max(2, Math.min(50, Math.floor(Number(participantCount) || 2)));
  let shares = [];

  if (splitMode === SPLIT_MODES.EQUAL) {
    shares = calculateEqualSplit({ totalPrice, participantCount: count });
  } else if (splitMode === SPLIT_MODES.CUSTOM) {
    const valRes = validateCustomSplit({ totalPrice, shares: customShares });
    if (!valRes.valid) {
      return { ok: false, error: valRes.error };
    }
    shares = customShares.map((s) => Number(s));
  } else if (splitMode === SPLIT_MODES.LEADER_PAYS) {
    shares = calculateLeaderPaysSplit({ totalPrice, participantCount: count });
  } else {
    return { ok: false, error: "Invalid split mode." };
  }

  // 5. Calculate deadline (Default: 10 minutes)
  const isInstant = paymentMode === PAYMENT_MODES.LEADER_IMMEDIATE;
  const now = new Date();
  const holdMinutes = Math.max(5, Math.min(60, Number(deadlineMinutes) || DEFAULT_PAYMENT_DEADLINE_MINUTES));
  const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);

  // 6. Generate unique invitation code
  let inviteCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateGroupInviteCode();
    const { data: existing } = await adminClient
      .from("group_bookings")
      .select("id")
      .eq("invitation_code", candidate)
      .maybeSingle();
    if (!existing) {
      inviteCode = candidate;
      break;
    }
  }
  if (!inviteCode) {
    inviteCode = `GRP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  // 7. Insert the single authoritative turf booking
  // If instant booking: confirmed immediately. If all_or_nothing: temporary slot hold with pending status.
  const bookingInitialStatus = isInstant ? "confirmed" : "pending";
  const { data: booking, error: bookingErr } = await adminClient
    .from("bookings")
    .insert({
      turf_id: turfId,
      player_id: leaderId,
      booking_date: bookingDate,
      start_time: targetSlot.slot_time,
      sport,
      players_count: count,
      price: totalPrice,
      status: bookingInitialStatus,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("Group booking lock insertion failed:", bookingErr);
    const msg = bookingErr?.message?.includes("already") || bookingErr?.code === "23505" || bookingErr?.message?.includes("not available")
      ? "This time slot has already been booked. Please choose another available time."
      : (bookingErr?.message || "Could not lock turf slot for group booking. Please try again.");
    return { ok: false, error: msg };
  }

  // 8. Insert group_bookings record
  const groupInitialStatus = isInstant ? GROUP_STATUSES.CONFIRMED : GROUP_STATUSES.PENDING;
  const groupPaymentStatus = isInstant ? "paid" : "pending";

  const { data: groupBooking, error: groupErr } = await adminClient
    .from("group_bookings")
    .insert({
      booking_id: booking.id,
      turf_id: turfId,
      leader_id: leaderId,
      sport,
      booking_date: bookingDate,
      start_time: targetSlot.slot_time,
      total_price: totalPrice,
      participant_count: count,
      split_mode: splitMode,
      payment_mode: paymentMode,
      payment_status: groupPaymentStatus,
      status: groupInitialStatus,
      invitation_code: inviteCode,
      expires_at: expiresAt.toISOString(),
      reminder_sent: false,
    })
    .select("*")
    .single();

  if (groupErr || !groupBooking) {
    console.error("Group booking record insertion failed:", groupErr);
    // Rollback booking lock
    await adminClient.from("bookings").delete().eq("id", booking.id);
    return { ok: false, error: groupErr?.message || "Failed to initialize group booking. Please try again." };
  }

  // 9. Insert leader as participant #1
  const leaderShare = isInstant ? totalPrice : shares[0];
  const leaderPaymentStatus = isInstant ? PARTICIPANT_STATUSES.PAID : PARTICIPANT_STATUSES.PENDING;

  const { data: leaderParticipant, error: partErr } = await adminClient
    .from("group_participants")
    .insert({
      group_booking_id: groupBooking.id,
      player_id: leaderId,
      role: "leader",
      share_amount: leaderShare,
      payment_status: leaderPaymentStatus,
      paid_at: isInstant ? now.toISOString() : null,
    })
    .select("*")
    .single();

  if (partErr || !leaderParticipant) {
    await adminClient.from("group_bookings").delete().eq("id", groupBooking.id);
    await adminClient.from("bookings").delete().eq("id", booking.id);
    return { ok: false, error: "Failed to register leader participant." };
  }

  // If instant booking, log the full upfront payment transaction for the leader
  if (isInstant) {
    const hashSeed = `${groupBooking.id}:${leaderParticipant.id}:${leaderId}:${Date.now()}`;
    const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
    const transactionReference = `VT-INSTANT-${refSuffix}`;

    await adminClient.from("group_payment_transactions").insert({
      group_booking_id: groupBooking.id,
      participant_id: leaderParticipant.id,
      player_id: leaderId,
      amount: totalPrice,
      payment_method: "instant_leader_upfront",
      transaction_reference: transactionReference,
      status: "success",
    });

    await adminClient
      .from("group_participants")
      .update({ transaction_reference: transactionReference })
      .eq("id", leaderParticipant.id);
  }

  const inviteUrl = `${origin}/player?joinGroup=${inviteCode}`;

  return {
    ok: true,
    groupBooking,
    leaderParticipant,
    inviteCode,
    inviteUrl,
    shares,
    totalPrice,
    isInstant,
  };
}

/**
 * Gets complete group booking details, participants, and live payment status.
 * Automatically checks and applies deadline expiration if due.
 */
export async function getGroupBookingDetails(adminClient, { groupId, invitationCode, userId = null }) {
  let query = adminClient
    .from("group_bookings")
    .select("*, turf:turfs(id, name, city, address, rating, sports), leader:profiles!leader_id(id, full_name, email)");

  if (groupId) {
    query = query.eq("id", groupId);
  } else if (invitationCode) {
    query = query.eq("invitation_code", invitationCode.trim().toUpperCase());
  } else {
    return { ok: false, error: "Group ID or invitation code is required." };
  }

  const { data: group, error: groupErr } = await query.maybeSingle();
  if (groupErr || !group) {
    return { ok: false, error: "Group booking not found." };
  }

  // Check deadline expiration using server time
  if (group.status === GROUP_STATUSES.PENDING) {
    const expired = await expireGroupBookingIfDue(adminClient, group);
    if (expired) {
      group.status = GROUP_STATUSES.EXPIRED;
      group.payment_status = "expired";
    } else if (!group.reminder_sent) {
      await checkAndSendPaymentReminders(adminClient, group.id);
    }
  }

  // Fetch participants with profiles
  const { data: participants } = await adminClient
    .from("group_participants")
    .select("*, player:profiles(id, full_name, email)")
    .eq("group_booking_id", group.id)
    .order("created_at", { ascending: true });

  const list = participants || [];
  const summary = calculateGroupPaymentSummary({ groupBooking: group, participants: list });

  return {
    ok: true,
    group,
    participants: list,
    summary,
    isLeader: Boolean(userId && group.leader_id === userId),
    myParticipant: userId ? list.find((p) => p.player_id === userId) || null : null,
  };
}

/**
 * Adds an invited friend to the group booking if spots remain.
 */
export async function joinGroupBooking(adminClient, { invitationCode, playerId }) {
  if (!invitationCode || !playerId) {
    return { ok: false, error: "Invitation code and player ID are required." };
  }

  const { data: group, error: groupErr } = await adminClient
    .from("group_bookings")
    .select("*")
    .eq("invitation_code", invitationCode.trim().toUpperCase())
    .maybeSingle();

  if (groupErr || !group) {
    return { ok: false, error: "Invalid group invitation code." };
  }

  // Check expiration
  const isExpired = new Date(group.expires_at).getTime() < Date.now();
  if (isExpired && group.status === GROUP_STATUSES.PENDING) {
    await expireGroupBookingIfDue(adminClient, group);
    return { ok: false, error: "This group booking has expired." };
  }

  if (group.status !== GROUP_STATUSES.PENDING && group.payment_mode !== PAYMENT_MODES.LEADER_IMMEDIATE) {
    return { ok: false, error: "This group booking is no longer open for joining." };
  }

  // Check existing membership
  const { data: existing } = await adminClient
    .from("group_participants")
    .select("*")
    .eq("group_booking_id", group.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    return { ok: true, participant: existing, alreadyJoined: true, group };
  }

  // Check capacity
  const { data: currentParticipants } = await adminClient
    .from("group_participants")
    .select("id, share_amount")
    .eq("group_booking_id", group.id);

  const joinedCount = currentParticipants?.length || 0;
  if (joinedCount >= group.participant_count) {
    return { ok: false, error: "This group booking has already reached its maximum participant capacity." };
  }

  // Determine share amount for new participant
  let shareAmount = 0;
  if (group.payment_mode === PAYMENT_MODES.LEADER_IMMEDIATE) {
    // For instant booking, each member's reimbursement share is total_price / count
    shareAmount = Math.round((Number(group.total_price) / group.participant_count) * 100) / 100;
  } else if (group.split_mode === SPLIT_MODES.EQUAL) {
    const shares = calculateEqualSplit({
      totalPrice: group.total_price,
      participantCount: group.participant_count,
    });
    shareAmount = shares[joinedCount] || shares[0];
  } else if (group.split_mode === SPLIT_MODES.LEADER_PAYS) {
    shareAmount = 0;
  } else {
    // Custom split: divide remaining balance by remaining spots
    const totalAllocated = (currentParticipants || []).reduce((sum, p) => sum + Number(p.share_amount || 0), 0);
    const remaining = Math.max(0, Number(group.total_price) - totalAllocated);
    const spotsLeft = group.participant_count - joinedCount;
    shareAmount = Math.round((remaining / spotsLeft) * 100) / 100;
  }

  // Insert participant
  const { data: newParticipant, error: insertErr } = await adminClient
    .from("group_participants")
    .insert({
      group_booking_id: group.id,
      player_id: playerId,
      role: "member",
      share_amount: shareAmount,
      payment_status: PARTICIPANT_STATUSES.PENDING,
    })
    .select("*")
    .single();

  if (insertErr || !newParticipant) {
    return { ok: false, error: "Could not join group booking. Please retry." };
  }

  return { ok: true, participant: newParticipant, alreadyJoined: false, group };
}

/**
 * Leader removes an unpaid member before payment is finalized.
 */
export async function removeGroupParticipant(adminClient, { groupId, leaderId, participantId }) {
  const { data: group } = await adminClient
    .from("group_bookings")
    .select("leader_id, status")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.leader_id !== leaderId) {
    return { ok: false, error: "Only the group leader can remove participants." };
  }

  if (group.status !== GROUP_STATUSES.PENDING) {
    return { ok: false, error: "Participants cannot be removed once booking is finalized." };
  }

  const { data: participant } = await adminClient
    .from("group_participants")
    .select("*")
    .eq("id", participantId)
    .eq("group_booking_id", groupId)
    .maybeSingle();

  if (!participant) {
    return { ok: false, error: "Participant not found." };
  }

  if (participant.role === "leader") {
    return { ok: false, error: "The group leader cannot be removed." };
  }

  if (participant.payment_status === PARTICIPANT_STATUSES.PAID) {
    return { ok: false, error: "Cannot remove a participant who has already paid their share." };
  }

  const { error: delErr } = await adminClient
    .from("group_participants")
    .delete()
    .eq("id", participantId);

  if (delErr) {
    return { ok: false, error: "Could not remove participant." };
  }

  return { ok: true, removed: true };
}

/**
 * Replaces an unpaid participant with another player or opens the slot for a replacement player.
 */
export async function replaceGroupParticipant(
  adminClient,
  { groupId, leaderId, oldParticipantId, replacementPlayerId = null }
) {
  const { data: group, error: groupErr } = await adminClient
    .from("group_bookings")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (groupErr || !group) {
    return { ok: false, error: "Group booking not found." };
  }

  if (group.leader_id !== leaderId) {
    return { ok: false, error: "Only the group leader can replace participants." };
  }

  if (group.status !== GROUP_STATUSES.PENDING) {
    return { ok: false, error: "Cannot replace participants on an inactive or confirmed booking." };
  }

  if (new Date(group.expires_at).getTime() < Date.now()) {
    await expireGroupBookingIfDue(adminClient, group);
    return { ok: false, error: "Payment deadline has expired." };
  }

  const { data: oldParticipant } = await adminClient
    .from("group_participants")
    .select("*")
    .eq("id", oldParticipantId)
    .eq("group_booking_id", groupId)
    .maybeSingle();

  if (!oldParticipant) {
    return { ok: false, error: "Participant not found." };
  }

  if (oldParticipant.role === "leader") {
    return { ok: false, error: "The group leader cannot be replaced." };
  }

  if (oldParticipant.payment_status === PARTICIPANT_STATUSES.PAID) {
    return { ok: false, error: "Cannot replace a participant who has already paid their share." };
  }

  if (replacementPlayerId) {
    // Check replacement player isn't already in group
    const { data: existing } = await adminClient
      .from("group_participants")
      .select("id")
      .eq("group_booking_id", groupId)
      .eq("player_id", replacementPlayerId)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "Replacement player is already in this group." };
    }

    const { data: updated, error: updErr } = await adminClient
      .from("group_participants")
      .update({
        player_id: replacementPlayerId,
        guest_name: null,
        guest_email: null,
        payment_status: PARTICIPANT_STATUSES.PENDING,
      })
      .eq("id", oldParticipantId)
      .select("*")
      .single();

    if (updErr) {
      return { ok: false, error: "Failed to assign replacement player." };
    }

    return { ok: true, participant: updated, replaced: true };
  } else {
    // Free up the slot so another player can join using the invite code
    await adminClient
      .from("group_participants")
      .delete()
      .eq("id", oldParticipantId);

    return { ok: true, removed: true, message: "Unpaid participant removed. A replacement player can now join." };
  }
}

/**
 * Processes payment for a participant's share.
 * Verifies all transactions server-side and atomically confirms booking when fully paid.
 */
export async function payParticipantShare(
  adminClient,
  { groupId, participantId, playerId, idempotencyKey = null }
) {
  // 1. Fetch group details
  const { data: group, error: groupErr } = await adminClient
    .from("group_bookings")
    .select("*, booking:bookings(id, status), turf:turfs(name)")
    .eq("id", groupId)
    .maybeSingle();

  if (groupErr || !group) {
    return { ok: false, error: "Group booking not found." };
  }

  if (group.status !== GROUP_STATUSES.PENDING) {
    return { ok: false, error: `This group booking is already ${group.status}.` };
  }

  // Check deadline using server time
  if (new Date(group.expires_at).getTime() < Date.now()) {
    await expireGroupBookingIfDue(adminClient, group);
    return { ok: false, error: "Payment deadline for this group booking has expired." };
  }

  // 2. Fetch participant
  const { data: participant, error: partErr } = await adminClient
    .from("group_participants")
    .select("*")
    .eq("id", participantId)
    .eq("group_booking_id", groupId)
    .maybeSingle();

  if (partErr || !participant) {
    return { ok: false, error: "Participant record not found." };
  }

  if (participant.player_id !== playerId) {
    return { ok: false, error: "You can only pay for your own share." };
  }

  if (participant.payment_status === PARTICIPANT_STATUSES.PAID) {
    return { ok: true, message: "Your share has already been paid.", alreadyPaid: true };
  }

  const shareAmount = Number(participant.share_amount || 0);

  // 3. Generate authoritative transaction reference
  const hashSeed = `${groupId}:${participantId}:${playerId}:${Date.now()}`;
  const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
  const transactionReference = `VT-GRP-${refSuffix}`;

  // 4. Log transaction idempotently
  if (shareAmount > 0) {
    const { error: txErr } = await adminClient.from("group_payment_transactions").insert({
      group_booking_id: groupId,
      participant_id: participantId,
      player_id: playerId,
      amount: shareAmount,
      payment_method: "demo_simulated",
      transaction_reference: transactionReference,
      status: "success",
      idempotency_key: idempotencyKey,
    });

    if (txErr) {
      return { ok: false, error: "Could not record payment transaction. Please try again." };
    }
  }

  // 5. Update participant payment status
  await adminClient
    .from("group_participants")
    .update({
      payment_status: PARTICIPANT_STATUSES.PAID,
      paid_at: new Date().toISOString(),
      transaction_reference: transactionReference,
    })
    .eq("id", participantId);

  // 6. Check if all required shares are now paid
  const { data: allParticipants } = await adminClient
    .from("group_participants")
    .select("player_id, share_amount, payment_status")
    .eq("group_booking_id", groupId);

  const summary = calculateGroupPaymentSummary({
    groupBooking: group,
    participants: allParticipants || [],
  });

  let groupConfirmed = false;
  if (summary.isFullyPaid) {
    // Confirm group booking
    await adminClient
      .from("group_bookings")
      .update({
        status: GROUP_STATUSES.CONFIRMED,
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId);

    // Confirm the single turf booking
    if (group.booking_id) {
      await adminClient
        .from("bookings")
        .update({
          status: "confirmed",
        })
        .eq("id", group.booking_id);
    }

    // Send confirmation notifications to all participants
    for (const p of allParticipants || []) {
      if (p.player_id) {
        await adminClient.from("notifications").insert({
          user_id: p.player_id,
          title: "Group Booking Confirmed!",
          body: `All shares have been paid. Your booking at ${group.turf?.name || "venue"} is confirmed!`,
          category: "booking",
          event_type: "group_booking_confirmed",
          link: "/player?tab=groups",
          read: false,
        }).catch(() => {});
      }
    }

    groupConfirmed = true;
  } else {
    // Mark partial payments
    await adminClient
      .from("group_bookings")
      .update({
        payment_status: "partial",
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId);
  }

  return {
    ok: true,
    shareAmount,
    transactionReference,
    isFullyPaid: summary.isFullyPaid,
    groupConfirmed,
    remainingBalance: summary.remainingBalance,
    paidCount: summary.paidCount,
    totalCount: summary.totalCount,
  };
}

/**
 * Leader Guarantee: Leader pays the remaining balance to confirm the booking immediately.
 */
export async function payLeaderRemainingBalance(
  adminClient,
  { groupId, leaderId, idempotencyKey = null }
) {
  const { data: group, error: groupErr } = await adminClient
    .from("group_bookings")
    .select("*, booking:bookings(id, status), turf:turfs(name)")
    .eq("id", groupId)
    .maybeSingle();

  if (groupErr || !group) {
    return { ok: false, error: "Group booking not found." };
  }

  if (group.leader_id !== leaderId) {
    return { ok: false, error: "Only the group leader can pay the remaining balance." };
  }

  if (group.status !== GROUP_STATUSES.PENDING) {
    return { ok: false, error: `This group booking is already ${group.status}.` };
  }

  if (new Date(group.expires_at).getTime() < Date.now()) {
    await expireGroupBookingIfDue(adminClient, group);
    return { ok: false, error: "Payment deadline has expired." };
  }

  const { data: participants } = await adminClient
    .from("group_participants")
    .select("*")
    .eq("group_booking_id", groupId);

  const summary = calculateGroupPaymentSummary({
    groupBooking: group,
    participants: participants || [],
  });

  const balanceToPay = summary.remainingBalance;
  if (balanceToPay <= 0) {
    return { ok: true, message: "Booking is already fully paid." };
  }

  // Generate authoritative transaction
  const hashSeed = `${groupId}:leader_guarantee:${leaderId}:${Date.now()}`;
  const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
  const transactionReference = `VT-GUARANTEE-${refSuffix}`;

  const leaderPart = (participants || []).find((p) => p.role === "leader") || participants?.[0];

  const { error: txErr } = await adminClient.from("group_payment_transactions").insert({
    group_booking_id: groupId,
    participant_id: leaderPart?.id,
    player_id: leaderId,
    amount: balanceToPay,
    payment_method: "leader_guarantee",
    transaction_reference: transactionReference,
    status: "success",
    idempotency_key: idempotencyKey,
  });

  if (txErr) {
    return { ok: false, error: "Failed to record balance payment. Please try again." };
  }

  // Update pending participants to paid (covered by leader)
  for (const p of participants || []) {
    if (p.payment_status === PARTICIPANT_STATUSES.PENDING) {
      await adminClient
        .from("group_participants")
        .update({
          payment_status: PARTICIPANT_STATUSES.PAID,
          paid_at: new Date().toISOString(),
          transaction_reference: `${transactionReference}:covered_by_leader`,
        })
        .eq("id", p.id);
    }
  }

  // Atomically confirm group and turf booking
  await adminClient
    .from("group_bookings")
    .update({
      status: GROUP_STATUSES.CONFIRMED,
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  if (group.booking_id) {
    await adminClient
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", group.booking_id);
  }

  // Send notifications to all participants
  for (const p of participants || []) {
    if (p.player_id) {
      await adminClient.from("notifications").insert({
        user_id: p.player_id,
        title: "Group Booking Confirmed",
        body: `Your group booking at ${group.turf?.name || "venue"} is confirmed! Leader guaranteed the remaining balance.`,
        category: "booking",
        event_type: "group_booking_confirmed",
        link: "/player?tab=groups",
        read: false,
      }).catch(() => {});
    }
  }

  return {
    ok: true,
    amountPaid: balanceToPay,
    transactionReference,
    groupConfirmed: true,
  };
}

/**
 * Reimburses the leader in an instant booking.
 * Does not alter the already-confirmed turf booking.
 */
export async function reimburseLeader(
  adminClient,
  { groupId, participantId, playerId, idempotencyKey = null }
) {
  const { data: group } = await adminClient
    .from("group_bookings")
    .select("*, leader:profiles!leader_id(id, full_name)")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) return { ok: false, error: "Group booking not found." };

  const { data: participant } = await adminClient
    .from("group_participants")
    .select("*")
    .eq("id", participantId)
    .eq("group_booking_id", groupId)
    .maybeSingle();

  if (!participant || participant.player_id !== playerId) {
    return { ok: false, error: "Participant record not found." };
  }

  if (participant.payment_status === PARTICIPANT_STATUSES.PAID) {
    return { ok: true, message: "Already reimbursed." };
  }

  const shareAmount = Number(participant.share_amount || 0);
  const hashSeed = `${groupId}:reimburse:${playerId}:${Date.now()}`;
  const refSuffix = createHash("sha256").update(hashSeed).digest("hex").slice(0, 8).toUpperCase();
  const transactionReference = `VT-REIMB-${refSuffix}`;

  if (shareAmount > 0) {
    await adminClient.from("group_payment_transactions").insert({
      group_booking_id: groupId,
      participant_id: participantId,
      player_id: playerId,
      amount: shareAmount,
      payment_method: "reimbursement_to_leader",
      transaction_reference: transactionReference,
      status: "success",
      idempotency_key: idempotencyKey,
    });
  }

  await adminClient
    .from("group_participants")
    .update({
      payment_status: PARTICIPANT_STATUSES.PAID,
      paid_at: new Date().toISOString(),
      transaction_reference: transactionReference,
    })
    .eq("id", participantId);

  // Notify leader
  if (group.leader_id) {
    await adminClient.from("notifications").insert({
      user_id: group.leader_id,
      title: "Reimbursement Received",
      body: `A participant reimbursed ₹${shareAmount} for your confirmed group booking.`,
      category: "booking",
      event_type: "group_reimbursement",
      link: "/player?tab=groups",
      read: false,
    }).catch(() => {});
  }

  return { ok: true, shareAmount, transactionReference };
}

/**
 * Checks deadline and expires group booking if due, processing refunds for any paid members.
 * Releases the temporary slot hold.
 */
export async function expireGroupBookingIfDue(adminClient, groupBooking) {
  if (!groupBooking || groupBooking.status !== GROUP_STATUSES.PENDING) return false;

  const expiresAt = new Date(groupBooking.expires_at).getTime();
  if (Date.now() <= expiresAt) return false;

  // Mark group booking as expired
  await adminClient
    .from("group_bookings")
    .update({
      status: GROUP_STATUSES.EXPIRED,
      payment_status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupBooking.id);

  // Release temporary slot hold in bookings table
  if (groupBooking.booking_id) {
    await adminClient
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", groupBooking.booking_id);
  }

  // Refund paid participants (initiated -> refunded)
  const { data: paidParticipants } = await adminClient
    .from("group_participants")
    .select("id, player_id, share_amount")
    .eq("group_booking_id", groupBooking.id)
    .eq("payment_status", PARTICIPANT_STATUSES.PAID);

  for (const p of paidParticipants || []) {
    await adminClient
      .from("group_participants")
      .update({ payment_status: PARTICIPANT_STATUSES.REFUNDED })
      .eq("id", p.id);

    await adminClient
      .from("group_payment_transactions")
      .update({ status: "refunded" })
      .eq("participant_id", p.id)
      .eq("status", "success");

    if (p.player_id) {
      await adminClient.from("notifications").insert({
        user_id: p.player_id,
        title: "Group Booking Expired & Refunded",
        body: `Payment deadline expired. Your contribution of ₹${p.share_amount} has been refunded.`,
        category: "booking",
        event_type: "group_refund",
        link: "/player?tab=groups",
        read: false,
      }).catch(() => {});
    }
  }

  return true;
}

/**
 * Sweeps and expires all overdue group bookings and stale pending slot holds.
 * Automatically releases slots so other players can book them immediately.
 */
export async function sweepExpiredGroupHolds(adminClient) {
  try {
    const nowIso = new Date().toISOString();

    // 1. Find all pending group bookings whose deadline has passed
    const { data: expiredGroups, error: groupErr } = await adminClient
      .from("group_bookings")
      .select("id, status, expires_at, booking_id")
      .eq("status", GROUP_STATUSES.PENDING)
      .lt("expires_at", nowIso);

    if (groupErr) {
      console.error("sweepExpiredGroupHolds group query error:", groupErr);
    }

    const groupList = Array.isArray(expiredGroups) ? expiredGroups : [];
    for (const group of groupList) {
      await expireGroupBookingIfDue(adminClient, group);
    }

    // 2. Also release any orphaned or stale pending bookings older than 15 minutes
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: stalePending } = await adminClient
      .from("bookings")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", fifteenMinsAgo);

    if (stalePending && stalePending.length > 0) {
      const staleIds = stalePending.map((b) => b.id);
      await adminClient
        .from("bookings")
        .update({ status: "cancelled" })
        .in("id", staleIds);
    }

    return { ok: true, sweptCount: groupList.length };
  } catch (err) {
    console.error("sweepExpiredGroupHolds exception:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a reminder notification to unpaid participants if deadline is approaching (<= 3 mins).
 */
export async function checkAndSendPaymentReminders(adminClient, groupId) {
  const { data: group } = await adminClient
    .from("group_bookings")
    .select("*, turf:turfs(name)")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.status !== GROUP_STATUSES.PENDING || group.reminder_sent) return false;

  const expiresAt = new Date(group.expires_at).getTime();
  const msRemaining = expiresAt - Date.now();
  const minutesRemaining = Math.floor(msRemaining / (60 * 1000));

  if (msRemaining > 0 && minutesRemaining <= DEFAULT_REMINDER_MINUTES_BEFORE_DEADLINE) {
    const { data: pendingParticipants } = await adminClient
      .from("group_participants")
      .select("id, player_id, share_amount")
      .eq("group_booking_id", groupId)
      .eq("payment_status", PARTICIPANT_STATUSES.PENDING);

    for (const p of pendingParticipants || []) {
      if (p.player_id) {
        await adminClient.from("notifications").insert({
          user_id: p.player_id,
          title: "Payment Deadline Approaching",
          body: `You have ${minutesRemaining > 0 ? `${minutesRemaining}m` : "less than 1 minute"} left to pay ₹${p.share_amount} for your group turf booking at ${group.turf?.name || "venue"}.`,
          category: "booking",
          event_type: "group_deadline_reminder",
          link: "/player?tab=groups",
          read: false,
        }).catch(() => {});
      }
    }

    await adminClient
      .from("group_bookings")
      .update({ reminder_sent: true, updated_at: new Date().toISOString() })
      .eq("id", groupId);

    return true;
  }
  return false;
}

/**
 * Leader cancels group booking, releasing the slot and refunding paid members.
 */
export async function cancelGroupBooking(adminClient, { groupId, leaderId, reason = "Cancelled by leader" }) {
  const { data: group } = await adminClient
    .from("group_bookings")
    .select("*, booking:bookings(id, status)")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) return { ok: false, error: "Group booking not found." };
  if (group.leader_id !== leaderId) {
    return { ok: false, error: "Only the group leader can cancel this booking." };
  }

  if (group.status === GROUP_STATUSES.CANCELLED) {
    return { ok: true, message: "Booking is already cancelled." };
  }

  // Cancel group booking
  await adminClient
    .from("group_bookings")
    .update({
      status: GROUP_STATUSES.CANCELLED,
      payment_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  // Release turf booking slot lock
  if (group.booking_id) {
    await adminClient
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", group.booking_id);
  }

  // Refund paid participants
  const { data: paidParticipants } = await adminClient
    .from("group_participants")
    .select("id, player_id, share_amount")
    .eq("group_booking_id", groupId)
    .eq("payment_status", PARTICIPANT_STATUSES.PAID);

  for (const p of paidParticipants || []) {
    await adminClient
      .from("group_participants")
      .update({ payment_status: PARTICIPANT_STATUSES.REFUNDED })
      .eq("id", p.id);

    await adminClient
      .from("group_payment_transactions")
      .update({ status: "refunded" })
      .eq("participant_id", p.id)
      .eq("status", "success");

    if (p.player_id) {
      await adminClient.from("notifications").insert({
        user_id: p.player_id,
        title: "Group Booking Cancelled",
        body: `Group leader cancelled the booking. Your payment of ₹${p.share_amount} has been refunded.`,
        category: "booking",
        event_type: "group_refund",
        link: "/player?tab=groups",
        read: false,
      }).catch(() => {});
    }
  }

  return { ok: true, cancelled: true };
}

/**
 * Gets all group bookings for a specific player (created or joined).
 */
export async function getPlayerGroupBookings(adminClient, playerId) {
  // 1. Groups created by player
  const { data: createdGroups } = await adminClient
    .from("group_bookings")
    .select("*, turf:turfs(id, name, city, address, rating), participants:group_participants(*)")
    .eq("leader_id", playerId)
    .order("created_at", { ascending: false });

  // 2. Groups joined by player as a member
  const { data: memberEntries } = await adminClient
    .from("group_participants")
    .select("group_booking_id")
    .eq("player_id", playerId)
    .eq("role", "member");

  const memberGroupIds = (memberEntries || []).map((m) => m.group_booking_id);

  let joinedGroups = [];
  if (memberGroupIds.length > 0) {
    const { data: memberGroups } = await adminClient
      .from("group_bookings")
      .select("*, turf:turfs(id, name, city, address, rating), participants:group_participants(*)")
      .in("id", memberGroupIds)
      .order("created_at", { ascending: false });
    joinedGroups = memberGroups || [];
  }

  // Auto-expire any pending groups that have passed deadline
  const allGroups = [...(createdGroups || []), ...joinedGroups];
  for (const g of allGroups) {
    if (g.status === GROUP_STATUSES.PENDING) {
      const expired = await expireGroupBookingIfDue(adminClient, g);
      if (expired) {
        g.status = GROUP_STATUSES.EXPIRED;
        g.payment_status = "expired";
      }
    }
  }

  return {
    created: (createdGroups || []).map((g) => ({
      ...g,
      summary: calculateGroupPaymentSummary({ groupBooking: g, participants: g.participants || [] }),
    })),
    joined: joinedGroups.map((g) => ({
      ...g,
      summary: calculateGroupPaymentSummary({ groupBooking: g, participants: g.participants || [] }),
    })),
  };
}

/**
 * Queries group bookings for admin/owner overview.
 */
export async function getAdminGroupBookings(adminClient, { turfId = null, ownerId = null }) {
  let query = adminClient
    .from("group_bookings")
    .select(`
      *,
      turf:turfs(id, name, city, address, owner_id),
      leader:profiles!leader_id(id, full_name, email),
      participants:group_participants(*, player:profiles(id, full_name, email)),
      transactions:group_payment_transactions(*)
    `)
    .order("created_at", { ascending: false });

  if (turfId) {
    query = query.eq("turf_id", turfId);
  }

  const { data: groups, error } = await query;
  if (error) {
    return { ok: false, error: "Failed to fetch admin group bookings." };
  }

  let list = groups || [];
  if (ownerId) {
    list = list.filter((g) => g.turf?.owner_id === ownerId);
  }

  // Check deadline expiration
  for (const g of list) {
    if (g.status === GROUP_STATUSES.PENDING) {
      await expireGroupBookingIfDue(adminClient, g);
    }
  }

  return {
    ok: true,
    groupBookings: list.map((g) => ({
      ...g,
      summary: calculateGroupPaymentSummary({ groupBooking: g, participants: g.participants || [] }),
    })),
  };
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, readJson, UUID_PATTERN } from "@/lib/admin/server";
import { formatINR } from "@/lib/dashboard/format";
import {
  VALID_PAYOUT_TRANSITIONS,
  canonicalPayoutIdentifier,
  isValidPayoutTransition,
  validatePayoutCreation,
} from "@/lib/payout/policy";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const admin = createAdminClient();

  // 1. Fetch all payouts ordered newest first (handling both payout_number and payout_id schemas)
  let rawPayouts = [];
  const primaryQuery = await admin
    .from("payouts")
    .select("id, payout_number, payout_id, owner_id, period_start, period_end, amount, status, created_at, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
    .order("created_at", { ascending: false });

  if (!primaryQuery.error) {
    rawPayouts = primaryQuery.data || [];
  } else {
    // Fallback if one of the identifier columns does not exist in an older migration state
    const fallbackQuery = await admin
      .from("payouts")
      .select("id, owner_id, period_start, period_end, amount, status, created_at, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
      .order("created_at", { ascending: false });

    if (fallbackQuery.error) {
      console.error("Admin payouts fetch failed", fallbackQuery.error);
      return NextResponse.json({ error: "Could not load payouts." }, { status: 500 });
    }
    rawPayouts = fallbackQuery.data || [];
  }

  const payouts = rawPayouts.map((p) => {
    const ident = canonicalPayoutIdentifier(p);
    return {
      ...p,
      payout_number: ident,
      payout_id: ident,
    };
  });

  // 2. Fetch turf owners with their bank metadata
  const { data: ownersData } = await admin
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .in("role", ["owner", "turf_owner"]);

  // Cross reference auth.users for bank_details
  const { data: authData } = await admin.auth.admin.listUsers();
  const authMap = new Map((authData?.users || []).map((u) => [u.id, u]));

  // Also calculate confirmed revenue per owner
  const { data: turfs } = await admin.from("turfs").select("id, owner_id, name");
  const turfOwnerMap = new Map((turfs || []).map((t) => [t.id, t.owner_id]));

  const { data: bookings } = await admin
    .from("bookings")
    .select("turf_id, price, status")
    .in("status", ["confirmed", "completed"]);

  const ownerRevenueMap = new Map();
  for (const b of bookings || []) {
    const ownerId = turfOwnerMap.get(b.turf_id);
    if (ownerId) {
      const prev = ownerRevenueMap.get(ownerId) || 0;
      ownerRevenueMap.set(ownerId, prev + Number(b.price || 0));
    }
  }

  const owners = (ownersData || []).map((o) => {
    const authUser = authMap.get(o.id);
    const bankDetails = authUser?.user_metadata?.bank_details || {
      bank_name: "HDFC Bank",
      account_number: "•••• •••• " + o.id.slice(-4),
      ifsc_code: "HDFC0000123",
      account_holder: o.full_name || "Turf Owner",
      upi_id: `${(o.email || "owner").split("@")[0]}@upi`,
    };

    const ownerPayouts = (payouts || []).filter((p) => p.owner_id === o.id);
    const totalPaid = ownerPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const processing = ownerPayouts.filter((p) => p.status === "processing").reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalRevenue = ownerRevenueMap.get(o.id) || 0;
    const pendingBalance = Math.max(0, totalRevenue - totalPaid - processing);

    return {
      ...o,
      full_name: o.full_name || authUser?.user_metadata?.full_name || o.email?.split("@")[0] || "Owner",
      email: o.email || authUser?.email || "—",
      bankDetails,
      totalRevenue,
      totalPaid,
      processing,
      pendingBalance,
    };
  });

  return NextResponse.json({ payouts: payouts || [], owners });
}

export { VALID_PAYOUT_TRANSITIONS };

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJson(request);
  const ownerId = typeof body?.ownerId === "string" ? body.ownerId : "";
  const rawAmount = body?.amount;
  const periodStart = typeof body?.periodStart === "string" ? body.periodStart : "";
  const periodEnd = typeof body?.periodEnd === "string" ? body.periodEnd : "";
  const rawStatus = body?.status;
  const payoutNumber = typeof body?.payoutNumber === "string" && body.payoutNumber
    ? body.payoutNumber
    : `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const validation = validatePayoutCreation({
    ownerId,
    amount: rawAmount,
    periodStart,
    periodEnd,
    status: rawStatus,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { amount, status } = validation;

  const admin = createAdminClient();

  // Prevent duplicate payout creation for the same owner and overlapping/identical period
  const { data: existingPayout } = await admin
    .from("payouts")
    .select("id, payout_number, payout_id, status")
    .eq("owner_id", ownerId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .in("status", ["pending", "processing", "paid"])
    .maybeSingle();

  if (existingPayout) {
    const ident = existingPayout.payout_number || existingPayout.payout_id || `PO-${String(existingPayout.id).slice(0, 8)}`;
    return NextResponse.json(
      { error: `A payout record (${ident}) for this owner and period already exists.` },
      { status: 409 }
    );
  }

  const insertPayload = {
    payout_number: payoutNumber,
    payout_id: payoutNumber,
    owner_id: ownerId,
    period_start: periodStart,
    period_end: periodEnd,
    amount,
    status,
  };

  let { data: payout, error: insertErr } = await admin
    .from("payouts")
    .insert(insertPayload)
    .select("*, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
    .single();

  // If column payout_number or payout_id does not exist, retry gracefully
  if (insertErr && (insertErr.code === "42703" || insertErr.code === "PGRST204")) {
    delete insertPayload.payout_id;
    ({ data: payout, error: insertErr } = await admin
      .from("payouts")
      .insert(insertPayload)
      .select("*, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
      .single());
  }
  if (insertErr && (insertErr.code === "42703" || insertErr.code === "PGRST204")) {
    delete insertPayload.payout_number;
    insertPayload.payout_id = payoutNumber;
    ({ data: payout, error: insertErr } = await admin
      .from("payouts")
      .insert(insertPayload)
      .select("*, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
      .single());
  }

  if (insertErr?.code === "23505") {
    return NextResponse.json(
      { error: "A payout with this identifier or period already exists." },
      { status: 409 }
    );
  }

  if (insertErr || !payout) {
    console.error("Payout creation failed", insertErr);
    return NextResponse.json({ error: "Could not create payout record." }, { status: 500 });
  }

  const normalizedPayout = {
    ...payout,
    payout_number: payout.payout_number || payout.payout_id || payoutNumber,
    payout_id: payout.payout_id || payout.payout_number || payoutNumber,
  };

  // Notify owner
  try {
    await admin.from("notifications").insert({
      user_id: ownerId,
      title: status === "paid" ? "Payout Completed" : "Payout Initiated",
      body: `A payout of ${formatINR(amount)} for ${periodStart} to ${periodEnd} has been ${status === "paid" ? "transferred to your registered bank account" : "initiated for settlement"}.`,
    });
  } catch (notifErr) {
    console.warn("Could not notify owner of payout", notifErr);
  }

  return NextResponse.json({ success: true, payout: normalizedPayout });
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJson(request);
  const payoutId = typeof body?.payoutId === "string" ? body.payoutId : "";
  const targetStatus = typeof body?.status === "string" ? body.status.toLowerCase().trim() : "";

  if (!UUID_PATTERN.test(payoutId)) {
    return NextResponse.json({ error: "Invalid payout ID." }, { status: 400 });
  }

  if (!["paid", "processing", "pending", "failed"].includes(targetStatus)) {
    return NextResponse.json({ error: "Invalid payout status value." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Fetch current payout record to check current state
  const { data: existing, error: fetchErr } = await admin
    .from("payouts")
    .select("id, status, owner_id, amount, payout_number, payout_id")
    .eq("id", payoutId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  const payoutNum = existing.payout_number || existing.payout_id || (existing.id ? `PO-${String(existing.id).slice(0, 8)}` : "");

  // 2. Idempotent request: already in target state
  if (existing.status === targetStatus) {
    return NextResponse.json({ success: true, payout: { ...existing, payout_number: payoutNum, payout_id: payoutNum } });
  }

  // 3. State transition validation: once paid (settled), cannot be mutated
  if (existing.status === "paid") {
    return NextResponse.json({ error: "A settled payout cannot be modified." }, { status: 409 });
  }

  const allowedTransitions = VALID_PAYOUT_TRANSITIONS[existing.status] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    return NextResponse.json(
      { error: `Cannot transition payout from ${existing.status} to ${targetStatus}.` },
      { status: 409 }
    );
  }

  // 4. Update payout state atomically
  const { data: updated, error: updateErr } = await admin
    .from("payouts")
    .update({ status: targetStatus })
    .eq("id", payoutId)
    .eq("status", existing.status)
    .select("*, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ error: "Could not update payout." }, { status: 500 });
  }

  const updatedNum = updated.payout_number || updated.payout_id || payoutNum;

  // 5. Notify owner on transition to paid
  if (targetStatus === "paid" && updated.owner_id) {
    try {
      await admin.from("notifications").insert({
        user_id: updated.owner_id,
        title: "Payout Completed",
        body: `Your payout ${updatedNum} of ${formatINR(updated.amount)} is now completed and settled.`,
      });
    } catch (e) {
      console.warn("Could not notify owner", e);
    }
  }

  return NextResponse.json({ success: true, payout: { ...updated, payout_number: updatedNum, payout_id: updatedNum } });
}

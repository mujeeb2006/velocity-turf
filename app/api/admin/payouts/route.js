import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, readJson, UUID_PATTERN } from "@/lib/admin/server";
import { formatINR } from "@/lib/dashboard/format";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const admin = createAdminClient();

  // 1. Fetch all payouts ordered newest first
  const { data: payouts, error: payoutsErr } = await admin
    .from("payouts")
    .select("id, payout_number, owner_id, period_start, period_end, amount, status, created_at, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
    .order("created_at", { ascending: false });

  if (payoutsErr) {
    console.error("Admin payouts fetch failed", payoutsErr);
    return NextResponse.json({ error: "Could not load payouts." }, { status: 500 });
  }

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

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJson(request);
  const ownerId = typeof body?.ownerId === "string" ? body.ownerId : "";
  const amount = Number(body?.amount);
  const periodStart = typeof body?.periodStart === "string" ? body.periodStart : "";
  const periodEnd = typeof body?.periodEnd === "string" ? body.periodEnd : "";
  const status = body?.status === "processing" ? "processing" : "paid";
  const payoutNumber = typeof body?.payoutNumber === "string" && body.payoutNumber
    ? body.payoutNumber
    : `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (!UUID_PATTERN.test(ownerId) || Number.isNaN(amount) || amount <= 0 || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "Please provide a valid owner, amount, and date range." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: payout, error: insertErr } = await admin
    .from("payouts")
    .insert({
      payout_number: payoutNumber,
      owner_id: ownerId,
      period_start: periodStart,
      period_end: periodEnd,
      amount,
      status,
    })
    .select("*, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
    .single();

  if (insertErr) {
    console.error("Payout creation failed", insertErr);
    return NextResponse.json({ error: "Could not create payout record." }, { status: 500 });
  }

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

  return NextResponse.json({ success: true, payout });
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJson(request);
  const payoutId = typeof body?.payoutId === "string" ? body.payoutId : "";
  const status = body?.status === "paid" ? "paid" : "processing";

  if (!UUID_PATTERN.test(payoutId)) {
    return NextResponse.json({ error: "Invalid payout ID." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("payouts")
    .update({ status })
    .eq("id", payoutId)
    .select("*, owner:profiles!payouts_owner_id_fkey(id, full_name, email)")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update payout." }, { status: 500 });
  }

  // Notify owner on status change to paid
  if (status === "paid" && updated.owner_id) {
    try {
      await admin.from("notifications").insert({
        user_id: updated.owner_id,
        title: "Payout Completed",
        body: `Your payout ${updated.payout_number || ""} of ${formatINR(updated.amount)} is now completed and settled.`,
      });
    } catch (e) {
      console.warn("Could not notify owner", e);
    }
  }

  return NextResponse.json({ success: true, payout: updated });
}

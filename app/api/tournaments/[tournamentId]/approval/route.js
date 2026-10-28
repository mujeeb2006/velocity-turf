import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { Errors, ok } from "@/lib/api-response";

export async function POST(request, { params }) {
  const profile = await getProfile();
  if (!profile?.id) {
    return Errors.unauthorized("Sign in required.");
  }

  const tournamentId = params.tournamentId;
  if (!UUID_PATTERN.test(tournamentId)) {
    return Errors.badRequest("Invalid tournament ID.");
  }

  const body = await readJson(request);
  const decision = body?.decision; // "approve" or "reject"
  const rejectionReason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";

  if (decision !== "approve" && decision !== "reject") {
    return Errors.badRequest("Decision must be either 'approve' or 'reject'.");
  }

  const admin = createAdminClient();
  const { data: tour, error: tourErr } = await admin
    .from("tournaments")
    .select("*, turf:turfs(id, name, owner_id)")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tourErr || !tour) {
    return Errors.notFound("Tournament not found.");
  }

  const isTurfOwner = tour.turf?.owner_id === profile.id;
  const isAdmin = profile.role === "admin";

  if (!isTurfOwner && !isAdmin) {
    return Errors.forbidden("Only the turf venue owner or a platform admin can review tournament approval.");
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (decision === "approve") {
    if (isTurfOwner) updates.turf_approval_status = "approved";
    if (isAdmin) updates.admin_approval_status = "approved";

    // If both approvals are satisfied, open the tournament
    const willBeTurfApproved = isTurfOwner ? true : tour.turf_approval_status === "approved";
    const willBeAdminApproved = isAdmin ? true : tour.admin_approval_status === "approved";

    if (willBeTurfApproved && willBeAdminApproved) {
      updates.status = "open";
    }
  } else {
    // Reject
    if (isTurfOwner) updates.turf_approval_status = "rejected";
    if (isAdmin) updates.admin_approval_status = "rejected";
    updates.status = "cancelled";
    updates.rejection_reason = rejectionReason || "Venue or platform requirements not met.";
  }

  const { data: updated, error: updErr } = await admin
    .from("tournaments")
    .update(updates)
    .eq("id", tournamentId)
    .select("*")
    .single();

  if (updErr) {
    return Errors.internal("Failed to update tournament approval.");
  }

  // Notify organizer
  if (tour.organizer_id) {
    try {
      await admin.from("notifications").insert({
        user_id: tour.organizer_id,
        title: `Tournament ${decision === "approve" ? "Approved" : "Rejected"}`,
        body: decision === "approve"
          ? `Your tournament "${tour.title}" has been approved and is now open for registrations!`
          : `Your tournament "${tour.title}" was rejected. Reason: ${updates.rejection_reason || "None provided"}.`,
      });
    } catch (notifErr) {
      console.warn("Could not send organizer approval notification:", notifErr);
    }
  }

  return ok({ tournament: updated });
}

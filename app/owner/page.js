import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRoleRedirect } from "@/lib/auth/guards";
import OwnerDashboardClient from "./OwnerDashboardClient";

export default async function OwnerPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  let effectiveProfile = profile;
  if (profile.role !== "owner" && profile.role !== "admin" && profile.role !== "staff") {
    // Check if user is an active venue staff member
    try {
      const admin = createAdminClient();
      const { data: staffMember } = await admin
        .from("venue_staff")
        .select("id, role, status")
        .eq("user_id", profile.id)
        .eq("status", "active")
        .maybeSingle();

      if (staffMember) {
        effectiveProfile = { ...profile, role: "staff", staffRole: staffMember.role };
      }
    } catch {
      // ignore lookup error and proceed to standard guard check
    }
  }

  const redirectTo = resolveRoleRedirect(effectiveProfile, "owner");
  if (redirectTo) redirect(redirectTo);

  return <OwnerDashboardClient profile={effectiveProfile} />;
}

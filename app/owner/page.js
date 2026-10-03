import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { resolveRoleRedirect } from "@/lib/auth/guards";
import OwnerDashboardClient from "./OwnerDashboardClient";

export default async function OwnerPage() {
  const profile = await getProfile();
  const redirectTo = resolveRoleRedirect(profile, "owner");

  if (redirectTo) redirect(redirectTo);

  return <OwnerDashboardClient profile={profile} />;
}

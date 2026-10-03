import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { resolveRoleRedirect } from "@/lib/auth/guards";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const profile = await getProfile();
  const redirectTo = resolveRoleRedirect(profile, "admin");

  if (redirectTo) redirect(redirectTo);

  return <AdminDashboardClient profile={profile} />;
}

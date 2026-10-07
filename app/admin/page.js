import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { resolveRoleRedirect } from "@/lib/auth/guards";
import { loadAdminUsers } from "@/lib/admin/server";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getProfile();
  const redirectTo = resolveRoleRedirect(profile, "admin");

  if (redirectTo) redirect(redirectTo);

  // Users come from the server because authenticated clients can't read
  // profiles.email. A failure here shouldn't block the rest of the dashboard.
  let initialUsers = [];
  let usersError = false;
  try {
    initialUsers = await loadAdminUsers();
  } catch (error) {
    console.error("Admin page could not load users", error);
    usersError = true;
  }

  return <AdminDashboardClient profile={profile} initialUsers={initialUsers} usersError={usersError} />;
}

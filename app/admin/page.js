import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const profile = await getProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/unauthorized");

  return <AdminDashboardClient profile={profile} />;
}

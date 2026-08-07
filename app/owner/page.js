import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import OwnerDashboardClient from "./OwnerDashboardClient";

export default async function OwnerPage() {
  const profile = await getProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/unauthorized");

  return <OwnerDashboardClient profile={profile} />;
}

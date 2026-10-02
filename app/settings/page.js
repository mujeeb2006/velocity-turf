import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import AccountSettingsClient from "./AccountSettingsClient";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return <AccountSettingsClient profile={profile} />;
}
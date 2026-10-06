import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import PlayerAppClient from "./player/PlayerAppClient";

export default async function RootPage() {
  const profile = await getProfile();

  if (!profile) return <PlayerAppClient profile={null} />;
  const role = normalizeUserRole(profile.role);
  if (role === "admin") redirect("/admin");
  if (role === "owner") redirect("/owner");
  redirect("/player");
}

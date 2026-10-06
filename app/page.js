import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import PlayerAppClient from "./player/PlayerAppClient";

export default async function RootPage() {
  const profile = await getProfile();

  if (!profile) return <PlayerAppClient profile={null} />;
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "owner") redirect("/owner");
  redirect("/player");
}

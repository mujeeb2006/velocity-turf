import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import PlayerAppClient from "./PlayerAppClient";

export default async function PlayerPage() {
  const profile = await getProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "player") redirect("/unauthorized");

  return <PlayerAppClient profile={profile} />;
}

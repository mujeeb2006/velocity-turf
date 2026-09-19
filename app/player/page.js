import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import PlayerAppClient from "./PlayerAppClient";

export default async function PlayerPage() {
  const profile = await getProfile();

  // No account yet? Let them browse as a guest — PlayerAppClient prompts
  // for signup only when they try to actually book or join something.
  if (profile && profile.role !== "player") redirect("/unauthorized");

  return <PlayerAppClient profile={profile} />;
}

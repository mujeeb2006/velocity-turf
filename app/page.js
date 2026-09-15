import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import LandingClient from "./LandingClient";

export default async function RootPage() {
  const profile = await getProfile();

  if (!profile) return <LandingClient />;
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "owner") redirect("/owner");
  redirect("/player");
}

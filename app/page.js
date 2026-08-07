import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";

export default async function RootPage() {
  const profile = await getProfile();

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "owner") redirect("/owner");
  redirect("/player");
}

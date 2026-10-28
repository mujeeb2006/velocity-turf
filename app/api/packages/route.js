import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";

export async function GET() {
  const admin = createAdminClient();

  const { data: packages, error } = await admin
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    if (error.code === "PGRST205") {
      // Table doesn't exist in Supabase yet (pending migration 20261035_teams_tournaments_packages.sql)
      return ok({ packages: [] });
    }
    console.error("Fetch packages error:", error);
    return Errors.internal("Could not fetch sports packages.");
  }

  const formatted = (packages || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    totalSessions: p.total_sessions,
    validityDays: p.validity_days,
    eligibleSports: p.eligible_sports || [],
    eligibleTurfs: p.eligible_turfs || [],
    maxSessionsPerDay: p.max_sessions_per_day,
    restrictions: p.restrictions || {},
    pricePerSession: p.total_sessions ? Math.round(Number(p.price) / p.total_sessions) : Number(p.price),
  }));

  return ok({ packages: formatted });
}

import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const admin = createAdminClient();

  const { data: games, error } = await admin
    .from("matches")
    .select(`
      *,
      turf:turfs (
        id,
        name,
        city,
        address,
        sports,
        owner_id
      ),
      creator:profiles!matches_creator_id_fkey (
        id,
        full_name,
        role
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin games query failed:", error);
    return Errors.internal("Failed to load community games for review.");
  }

  // Load owner profiles for any missing creator joins
  const ownerIds = [...new Set((games || []).map((g) => g.turf?.owner_id).filter(Boolean))];
  let ownerMap = new Map();
  if (ownerIds.length) {
    const { data: owners } = await admin
      .from("profiles")
      .select("id, full_name, role, email")
      .in("id", ownerIds);

    if (owners) {
      ownerMap = new Map(owners.map((o) => [o.id, o]));
    }
  }

  const enrichedGames = (games || []).map((g) => {
    const owner = ownerMap.get(g.turf?.owner_id) || g.creator || null;
    return {
      ...g,
      owner_name: owner?.full_name || "Owner",
      owner_email: owner?.email || "",
    };
  });

  return ok({ games: enrichedGames });
}

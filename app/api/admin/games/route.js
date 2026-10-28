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
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin games query failed:", error);
    return Errors.internal("Failed to load community games for review.");
  }

  // Load profiles for creators/hosts and owners
  const userIds = [
    ...new Set([
      ...(games || []).map((g) => g.host_id || g.creator_id).filter(Boolean),
      ...(games || []).map((g) => g.turf?.owner_id).filter(Boolean),
    ]),
  ];
  let userMap = new Map();
  if (userIds.length) {
    const { data: users } = await admin
      .from("profiles")
      .select("id, full_name, role, email")
      .in("id", userIds);

    if (users) {
      userMap = new Map(users.map((u) => [u.id, u]));
    }
  }

  const enrichedGames = (games || []).map((g) => {
    const creator = userMap.get(g.host_id || g.creator_id) || null;
    const owner = userMap.get(g.turf?.owner_id) || creator || null;
    return {
      ...g,
      title: g.title || `${g.sport} Match`,
      description: g.description || "",
      creator,
      owner_name: owner?.full_name || "Owner",
      owner_email: owner?.email || "",
    };
  });

  return ok({ games: enrichedGames });
}

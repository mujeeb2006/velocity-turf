import { createAdminClient } from "@/lib/supabase/admin";
import { Errors, ok } from "@/lib/api-response";
import { dateKey } from "@/lib/dashboard/analytics";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  const turfId = searchParams.get("turfId");
  const date = searchParams.get("date");
  const timeOfDay = searchParams.get("timeOfDay"); // "morning", "afternoon", "evening", "night"

  const admin = createAdminClient();
  const today = dateKey();

  let query = admin
    .from("matches")
    .select(`
      id,
      title,
      description,
      sport,
      match_date,
      start_time,
      end_time,
      max_players,
      participant_count,
      price_per_player,
      skill_level,
      status,
      approval_status,
      turf:turfs (
        id,
        name,
        city,
        address,
        sports,
        status,
        archived_at
      )
    `)
    .eq("approval_status", "approved")
    .in("status", ["open", "full"])
    .gte("match_date", today)
    .order("match_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (turfId) {
    query = query.eq("turf_id", turfId);
  }

  if (sport && sport !== "all") {
    query = query.eq("sport", sport);
  }

  if (date) {
    query = query.eq("match_date", date);
  }

  let { data: rawGames, error } = await query;

  if (error && (error.code === "42703" || error.message?.includes("does not exist") || error.code === "PGRST204")) {
    // Graceful schema fallback if migration 20261022 columns are not yet on remote table
    let baseQuery = admin
      .from("matches")
      .select(`
        id,
        sport,
        match_date,
        start_time,
        max_players,
        skill_level,
        status,
        turf:turfs (
          id,
          name,
          city,
          address,
          sports,
          status,
          archived_at
        )
      `)
      .in("status", ["open", "full"])
      .gte("match_date", today)
      .order("match_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (turfId) baseQuery = baseQuery.eq("turf_id", turfId);
    if (sport && sport !== "all") baseQuery = baseQuery.eq("sport", sport);
    if (date) baseQuery = baseQuery.eq("match_date", date);

    const baseRes = await baseQuery;
    if (!baseRes.error && baseRes.data) {
      const matchIds = baseRes.data.map((m) => m.id);
      const { data: pRows } = await admin
        .from("match_participants")
        .select("match_id")
        .in("match_id", matchIds);

      const pCounts = (pRows || []).reduce((acc, row) => {
        acc[row.match_id] = (acc[row.match_id] || 0) + 1;
        return acc;
      }, {});

      rawGames = baseRes.data.map((g) => ({
        ...g,
        title: `${g.sport} Match`,
        description: "Community friendly match open to all players.",
        participant_count: pCounts[g.id] || 0,
        price_per_player: 150,
        approval_status: "approved",
      }));
      error = null;
    }
  }

  if (error) {
    console.error("Player games query failed:", error);
    return Errors.internal("Could not load community games.");
  }

  // Filter out any matches whose turf is archived or not live
  let games = (rawGames || []).filter(
    (g) => g.turf && g.turf.status === "live" && !g.turf.archived_at
  );

  // Apply time of day filter if specified
  if (timeOfDay && timeOfDay !== "all") {
    games = games.filter((g) => {
      const hour = parseInt(String(g.start_time || "").slice(0, 2), 10);
      if (Number.isNaN(hour)) return true;
      if (timeOfDay === "morning") return hour >= 5 && hour < 12;
      if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
      if (timeOfDay === "evening") return hour >= 17 && hour < 21;
      if (timeOfDay === "night") return hour >= 21 || hour < 5;
      return true;
    });
  }

  const formatted = games.map((g) => {
    const spotsLeft = Math.max(0, (g.max_players || 0) - (g.participant_count || 0));
    return {
      id: g.id,
      title: g.title || `${g.sport} Game`,
      description: g.description || "",
      sport: g.sport,
      turf_id: g.turf.id,
      turf_name: g.turf.name,
      turf_city: g.turf.city,
      turf_address: g.turf.address,
      date: g.match_date,
      start_time: g.start_time,
      end_time: g.end_time,
      price_per_player: Number(g.price_per_player ?? 0),
      max_players: g.max_players,
      participant_count: g.participant_count,
      spots_left: spotsLeft,
      skill: g.skill_level || "Any",
      status: g.status,
      is_full: spotsLeft === 0 || g.status === "full",
    };
  });

  return ok({ games: formatted });
}

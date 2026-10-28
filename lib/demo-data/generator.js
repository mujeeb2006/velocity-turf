// lib/demo-data/generator.js
// Enterprise demo-data generator and reset engine for Velocity Turf.
// Strictly isolates demo data from real users, bookings, payments, and payouts.

import {
  DEMO_DOMAIN,
  DEMO_TAG,
  DEMO_OWNERS,
  DEMO_PLAYERS,
  DEMO_TURFS,
  DEMO_TEAMS,
  DEMO_COMMUNITY_MATCHES,
  DEMO_TOURNAMENTS,
  DEMO_REVIEWS,
  DEMO_DISPUTES,
  isDemoEmail,
  isDemoRecord,
} from "./dataset.js";

// Helper for local date strings
function getOffsetDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export async function getDemoDataCounts(admin) {
  const [
    turfsRes,
    bookingsRes,
    profilesRes,
    matchesRes,
    teamsRes,
    tournamentsRes,
    reviewsRes,
    payoutsRes,
    disputesRes,
    packagesRes,
  ] = await Promise.all([
    admin.from("turfs").select("id, name, owner_id", { count: "exact" }),
    admin.from("bookings").select("id, note, turf_id", { count: "exact" }),
    admin.from("profiles").select("id, email, full_name, role", { count: "exact" }),
    admin.from("matches").select("id, turf_id, host_id", { count: "exact" }),
    admin.from("teams").select("id, name", { count: "exact" }),
    admin.from("tournaments").select("id, title", { count: "exact" }),
    admin.from("reviews").select("id, text", { count: "exact" }),
    admin.from("payouts").select("id, payout_number", { count: "exact" }),
    admin.from("disputes").select("id, ticket_number, issue", { count: "exact" }),
    admin.from("packages").select("id, name", { count: "exact" }),
  ]);

  const countSummary = (list = [], isDemoFn) => {
    let demo = 0;
    for (const item of list) {
      if (isDemoFn(item)) demo++;
    }
    return {
      total: list.length,
      demo,
      real: list.length - demo,
    };
  };

  const turfsList = turfsRes.data || [];
  const bookingsList = bookingsRes.data || [];
  const profilesList = profilesRes.data || [];
  const matchesList = matchesRes.data || [];
  const teamsList = teamsRes.data || [];
  const tournamentsList = tournamentsRes.data || [];
  const reviewsList = reviewsRes.data || [];
  const payoutsList = payoutsRes.data || [];
  const disputesList = disputesRes.data || [];
  const packagesList = packagesRes.data || [];

  const demoTurfIdSet = new Set(turfsList.filter((t) => t.name?.includes(DEMO_TAG)).map((t) => t.id));
  const demoUserIdSet = new Set(profilesList.filter((p) => isDemoEmail(p.email) || p.full_name?.includes(DEMO_TAG)).map((p) => p.id));

  return {
    turfs: countSummary(turfsList, (t) => t.name?.includes(DEMO_TAG)),
    bookings: countSummary(bookingsList, (b) => b.note?.includes(DEMO_TAG)),
    users: countSummary(profilesList, (p) => isDemoEmail(p.email) || p.full_name?.includes(DEMO_TAG)),
    matches: countSummary(matchesList, (m) => demoTurfIdSet.has(m.turf_id) || demoUserIdSet.has(m.host_id)),
    teams: countSummary(teamsList, (t) => t.name?.includes(DEMO_TAG)),
    tournaments: countSummary(tournamentsList, (t) => t.title?.includes(DEMO_TAG)),
    reviews: countSummary(reviewsList, (r) => r.text?.includes(DEMO_TAG)),
    payouts: countSummary(payoutsList, (p) => p.payout_number?.startsWith("DEMO-")),
    disputes: countSummary(disputesList, (d) => d.ticket_number?.startsWith("DEMO-") || d.issue?.includes(DEMO_TAG)),
    packages: countSummary(packagesList, (pk) => pk.name?.includes(DEMO_TAG)),
  };
}

export async function resetDemoData(admin) {
  const result = {
    deleted: {},
    errors: [],
  };

  try {
    // 1. Identify all demo auth users
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const demoAuthUsers = (authUsers?.users || []).filter((u) => isDemoEmail(u.email));
    const demoUserIds = demoAuthUsers.map((u) => u.id);

    // 2. Identify demo turfs
    const { data: demoTurfs } = await admin.from("turfs").select("id").ilike("name", `%${DEMO_TAG}%`);
    const demoTurfIds = (demoTurfs || []).map((t) => t.id);

    // 3. Identify all demo bookings (by note, by demo turf, or by demo player)
    const [bRes1, bRes2] = await Promise.all([
      admin.from("bookings").select("id").ilike("note", `%${DEMO_TAG}%`),
      demoTurfIds.length > 0 ? admin.from("bookings").select("id").in("turf_id", demoTurfIds) : { data: [] },
    ]);
    const allDemoBookingIdSet = new Set([
      ...(bRes1.data || []).map((b) => b.id),
      ...(bRes2.data || []).map((b) => b.id),
    ]);
    const demoBookingIds = Array.from(allDemoBookingIdSet);

    // 4. Delete notifications for demo users
    if (demoUserIds.length > 0) {
      const { count } = await admin.from("notifications").delete({ count: "exact" }).in("user_id", demoUserIds);
      result.deleted.notifications = count || 0;
    }

    // 5. Delete reviews for demo bookings or text starting with DEMO
    if (demoBookingIds.length > 0) {
      await admin.from("reviews").delete().in("booking_id", demoBookingIds);
    }
    const { count: revCount } = await admin.from("reviews").delete({ count: "exact" }).ilike("text", `%${DEMO_TAG}%`);
    result.deleted.reviews = revCount || 0;

    // 6. Delete disputes for demo bookings
    if (demoBookingIds.length > 0) {
      await admin.from("disputes").delete().in("booking_id", demoBookingIds);
    }
    const { count: dispCount } = await admin.from("disputes").delete({ count: "exact" }).like("ticket_number", "DEMO-%");
    result.deleted.disputes = dispCount || 0;

    // 7. Delete tournament fixtures & registrations for demo tournaments
    const { data: demoTournaments } = await admin.from("tournaments").select("id").ilike("title", `%${DEMO_TAG}%`);
    const demoTournamentIds = (demoTournaments || []).map((t) => t.id);

    if (demoTournamentIds.length > 0) {
      await admin.from("tournament_fixtures").delete().in("tournament_id", demoTournamentIds);
      await admin.from("tournament_registrations").delete().in("tournament_id", demoTournamentIds);
      const { count: tourCount } = await admin.from("tournaments").delete({ count: "exact" }).in("id", demoTournamentIds);
      result.deleted.tournaments = tourCount || 0;
    }

    // 8. Delete match participants & matches
    let demoMatchIds = [];
    if (demoTurfIds.length > 0 || demoUserIds.length > 0) {
      const [mRes1, mRes2] = await Promise.all([
        demoTurfIds.length > 0 ? admin.from("matches").select("id").in("turf_id", demoTurfIds) : { data: [] },
        demoUserIds.length > 0 ? admin.from("matches").select("id").in("host_id", demoUserIds) : { data: [] },
      ]);
      const mIdSet = new Set([
        ...(mRes1.data || []).map((m) => m.id),
        ...(mRes2.data || []).map((m) => m.id),
      ]);
      demoMatchIds = Array.from(mIdSet);
    }

    if (demoMatchIds.length > 0) {
      await admin.from("match_participants").delete().in("match_id", demoMatchIds);
      const { count: matchCount } = await admin.from("matches").delete({ count: "exact" }).in("id", demoMatchIds);
      result.deleted.matches = matchCount || 0;
    }

    // 9. Delete team members, invites, and teams
    const { data: demoTeams } = await admin.from("teams").select("id").ilike("name", `%${DEMO_TAG}%`);
    const demoTeamIds = (demoTeams || []).map((t) => t.id);

    if (demoTeamIds.length > 0) {
      await admin.from("team_members").delete().in("team_id", demoTeamIds);
      await admin.from("team_invites").delete().in("team_id", demoTeamIds);
      const { count: teamCount } = await admin.from("teams").delete({ count: "exact" }).in("id", demoTeamIds);
      result.deleted.teams = teamCount || 0;
    }

    // 10. Delete package redemptions and user packages for demo users
    if (demoUserIds.length > 0) {
      await admin.from("package_redemptions").delete().in("user_id", demoUserIds);
      await admin.from("user_packages").delete().in("user_id", demoUserIds);
    }
    const { count: pkgCount } = await admin.from("packages").delete({ count: "exact" }).ilike("name", `%${DEMO_TAG}%`);
    result.deleted.packages = pkgCount || 0;

    // 11. Delete demo bookings and blocked slots (MUST delete booking_audit_log first due to FK restrict)
    if (demoBookingIds.length > 0) {
      await admin.from("booking_audit_log").delete().in("booking_id", demoBookingIds);
      await admin.from("bookings").delete().in("id", demoBookingIds);
    }
    if (demoTurfIds.length > 0) {
      await admin.from("blocked_slots").delete().in("turf_id", demoTurfIds);
      const { data: remainingTurfBookings } = await admin.from("bookings").select("id").in("turf_id", demoTurfIds);
      if (remainingTurfBookings && remainingTurfBookings.length > 0) {
        const bIds = remainingTurfBookings.map((b) => b.id);
        await admin.from("booking_audit_log").delete().in("booking_id", bIds);
        await admin.from("bookings").delete().in("id", bIds);
      }
    }
    result.deleted.bookings = demoBookingIds.length;

    // 12. Delete payouts for demo owners
    const { count: payCount } = await admin.from("payouts").delete({ count: "exact" }).like("payout_number", "DEMO-%");
    result.deleted.payouts = payCount || 0;

    // 13. Delete demo turfs
    if (demoTurfIds.length > 0) {
      const { count: turfCount } = await admin.from("turfs").delete({ count: "exact" }).in("id", demoTurfIds);
      result.deleted.turfs = turfCount || 0;
    }

    // 14. Delete demo auth users (cascades to profiles)
    let deletedUsersCount = 0;
    for (const u of demoAuthUsers) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (!error) deletedUsersCount++;
    }
    result.deleted.users = deletedUsersCount;

    return { ok: true, result };
  } catch (err) {
    console.error("resetDemoData failed:", err);
    return { ok: false, error: err.message, result };
  }
}

export async function generateDemoData(admin, { size = "medium", categories = null } = {}) {
  // Determine sizing counts
  let turfCount = 14;
  let ownerCount = 4;
  let playerCount = 8;
  let matchCount = 4;
  let teamCount = 4;
  let tourCount = 2;
  let bookingsPerTurf = 3;

  if (size === "small") {
    turfCount = 8;
    ownerCount = 3;
    playerCount = 6;
    matchCount = 2;
    teamCount = 3;
    tourCount = 1;
    bookingsPerTurf = 2;
  } else if (size === "large") {
    turfCount = 18;
    ownerCount = 5;
    playerCount = 12;
    matchCount = 5;
    teamCount = 6;
    tourCount = 3;
    bookingsPerTurf = 4;
  }

  const selectedCategories = Array.isArray(categories) && categories.length > 0
    ? new Set(categories)
    : new Set(["users", "turfs", "bookings", "matches", "teams", "tournaments", "packages", "reviews", "payouts", "disputes", "notifications"]);

  // Always reset previous demo data to ensure a clean state
  await resetDemoData(admin);

  const created = {
    owners: 0,
    players: 0,
    turfs: 0,
    bookings: 0,
    matches: 0,
    teams: 0,
    tournaments: 0,
    reviews: 0,
    payouts: 0,
    disputes: 0,
    notifications: 0,
  };

  const userMap = new Map(); // key -> { id, email, full_name }
  const turfMap = new Map(); // key -> turf record
  const teamMap = new Map(); // key -> team record
  const bookingList = [];    // created booking records

  // 1. Create Demo Owners
  const ownersToCreate = DEMO_OWNERS.slice(0, ownerCount);
  for (const ownerDef of ownersToCreate) {
    const { data: userRes, error } = await admin.auth.admin.createUser({
      email: ownerDef.email,
      password: "VelocityDemo2026!",
      email_confirm: true,
      user_metadata: { full_name: ownerDef.full_name, role: "owner", is_demo: true },
    });
    if (error) {
      console.warn("Failed to create demo owner:", ownerDef.email, error);
      continue;
    }
    const uid = userRes.user.id;
    await admin.from("profiles").update({ role: "owner", full_name: ownerDef.full_name }).eq("id", uid);
    userMap.set(ownerDef.key, { id: uid, email: ownerDef.email, full_name: ownerDef.full_name, role: "owner" });
    created.owners++;
  }

  // 2. Create Demo Players
  const playersToCreate = DEMO_PLAYERS.slice(0, playerCount);
  for (const playerDef of playersToCreate) {
    const { data: userRes, error } = await admin.auth.admin.createUser({
      email: playerDef.email,
      password: "VelocityDemo2026!",
      email_confirm: true,
      user_metadata: { full_name: playerDef.full_name, role: "player", is_demo: true },
    });
    if (error) {
      console.warn("Failed to create demo player:", playerDef.email, error);
      continue;
    }
    const uid = userRes.user.id;
    await admin.from("profiles").update({ role: "player", full_name: playerDef.full_name }).eq("id", uid);
    userMap.set(playerDef.key, { id: uid, email: playerDef.email, full_name: playerDef.full_name, role: "player" });
    created.players++;
  }

  const allPlayerIds = Array.from(userMap.values()).filter((u) => u.role === "player").map((u) => u.id);
  const firstOwner = Array.from(userMap.values()).find((u) => u.role === "owner");

  // 3. Create Demo Turfs
  if (selectedCategories.has("turfs")) {
    const turfsToCreate = DEMO_TURFS.slice(0, turfCount);
    for (const turfDef of turfsToCreate) {
      const owner = userMap.get(turfDef.owner_key) || firstOwner;
      if (!owner) continue;

      const { data: turf, error: turfErr } = await admin.from("turfs").insert({
        owner_id: owner.id,
        name: turfDef.name,
        address: turfDef.address,
        city: turfDef.city,
        sports: turfDef.sports,
        amenities: turfDef.amenities,
        image: turfDef.image,
        base_price: turfDef.base_price,
        peak_price: turfDef.peak_price,
        open_time: turfDef.open_time,
        close_time: turfDef.close_time,
        rating: turfDef.rating,
        review_count: turfDef.review_count,
        status: turfDef.status,
        approved_at: turfDef.status === "live" ? new Date().toISOString() : null,
      }).select().single();

      if (turfErr) {
        console.warn("Turf insert error:", turfDef.name, turfErr);
      } else if (turf) {
        turfMap.set(turfDef.key, turf);
        created.turfs++;
      }
    }
  }

  // 4. Create Demo Bookings & Schedule
  // We create confirmed bookings for today/future, and completed bookings for past dates
  if (selectedCategories.has("bookings") && turfMap.size > 0 && allPlayerIds.length > 0) {
    const liveTurfs = Array.from(turfMap.values()).filter((t) => t.status === "live");
    const availableSlots = ["06:00:00", "07:00:00", "08:00:00", "09:00:00", "10:00:00", "11:00:00", "15:00:00", "17:00:00", "19:00:00", "20:00:00", "21:00:00"];

    for (const turf of liveTurfs) {
      const primarySport = turf.sports?.[0] || "Football";

      // 1. Upcoming booking (tomorrow / in 2 days)
      try {
        const tomorrowStr = getOffsetDateStr(1);
        const playerTomorrow = allPlayerIds[Math.floor(Math.random() * allPlayerIds.length)];
        const { data: b1 } = await admin.from("bookings").insert({
          turf_id: turf.id,
          player_id: playerTomorrow,
          booking_date: tomorrowStr,
          start_time: "19:00:00",
          sport: primarySport,
          players_count: 10,
          price: turf.base_price,
          note: `${DEMO_TAG} Evening team practice`,
          status: "confirmed",
          payment_status: "paid",
        }).select().single();

        if (b1) {
          bookingList.push(b1);
          created.bookings++;
        }
      } catch (e) {
        console.warn("Booking 1 insert warning:", e.message);
      }

      // 2. Today's booking
      try {
        const todayStr = getOffsetDateStr(0);
        const playerToday = allPlayerIds[Math.floor(Math.random() * allPlayerIds.length)];
        const { data: b2 } = await admin.from("bookings").insert({
          turf_id: turf.id,
          player_id: playerToday,
          booking_date: todayStr,
          start_time: "20:00:00",
          sport: primarySport,
          players_count: 8,
          price: turf.peak_price || turf.base_price,
          note: `${DEMO_TAG} Prime time game`,
          status: "confirmed",
          payment_status: "paid",
        }).select().single();

        if (b2) {
          bookingList.push(b2);
          created.bookings++;
        }
      } catch (e) {
        console.warn("Booking 2 insert warning:", e.message);
      }

      // 3. Past completed booking (inserted for today, then updated to past date for revenue analytics)
      try {
        const todayStr = getOffsetDateStr(0);
        const pastPlayer = allPlayerIds[Math.floor(Math.random() * allPlayerIds.length)];
        const { data: b3 } = await admin.from("bookings").insert({
          turf_id: turf.id,
          player_id: pastPlayer,
          booking_date: todayStr,
          start_time: "08:00:00",
          sport: primarySport,
          players_count: 10,
          price: turf.base_price,
          note: `${DEMO_TAG} Completed weekend fixture`,
          status: "confirmed",
          payment_status: "paid",
        }).select().single();

        if (b3) {
          const pastDaysAgo = (liveTurfs.indexOf(turf) % 20) + 2; // 2 to 22 days ago
          const pastDateStr = getOffsetDateStr(-pastDaysAgo);
          await admin.from("bookings").update({
            booking_date: pastDateStr,
            status: "completed",
          }).eq("id", b3.id);

          bookingList.push({ ...b3, booking_date: pastDateStr, status: "completed" });
          created.bookings++;
        }
      } catch (e) {
        console.warn("Booking 3 insert warning:", e.message);
      }
    }
  }

  // 5. Create Demo Reviews
  if (selectedCategories.has("reviews") && bookingList.length > 0) {
    const completedBookings = bookingList.filter((b) => b.status === "completed");
    for (const revDef of DEMO_REVIEWS) {
      const turf = turfMap.get(revDef.turf_key);
      const player = userMap.get(revDef.player_key);
      if (!turf || !player) continue;

      // Find a completed booking for this turf or use one of the completed bookings
      const matchingBooking = completedBookings.find((b) => b.turf_id === turf.id) || completedBookings[0];
      if (!matchingBooking) continue;

      const { data: rev, error: revErr } = await admin.from("reviews").insert({
        turf_id: turf.id,
        player_id: player.id,
        booking_id: matchingBooking.id,
        rating: revDef.rating,
        text: revDef.text,
      }).select().single();

      if (!revErr && rev) {
        created.reviews++;
      }
    }
  }

  // 6. Create Demo Teams
  if (selectedCategories.has("teams")) {
    const teamsToCreate = DEMO_TEAMS.slice(0, teamCount);
    for (const teamDef of teamsToCreate) {
      const captain = userMap.get(teamDef.captain_key);
      if (!captain) continue;

      const { data: team, error: teamErr } = await admin.from("teams").insert({
        captain_id: captain.id,
        name: teamDef.name,
        sport: teamDef.sport,
        logo_url: teamDef.logo_url,
        description: teamDef.description,
      }).select().single();

      if (!teamErr && team) {
        teamMap.set(teamDef.key, team);
        created.teams++;

        // Add captain and members
        await admin.from("team_members").insert({
          team_id: team.id,
          player_id: captain.id,
          role: "captain",
          status: "active",
        });

        for (const mKey of teamDef.member_keys) {
          const memberUser = userMap.get(mKey);
          if (memberUser && memberUser.id !== captain.id) {
            await admin.from("team_members").insert({
              team_id: team.id,
              player_id: memberUser.id,
              role: "member",
              status: "active",
            });
          }
        }
      }
    }
  }

  // 7. Create Demo Community Matches
  if (selectedCategories.has("matches") && turfMap.size > 0) {
    const matchesToCreate = DEMO_COMMUNITY_MATCHES.slice(0, matchCount);
    for (const matchDef of matchesToCreate) {
      const turf = turfMap.get(matchDef.turf_key);
      const host = userMap.get(matchDef.creator_key);
      if (!turf || !host) continue;

      const matchDate = getOffsetDateStr(matchDef.time_offset_days);

      const { data: match, error: matchErr } = await admin.from("matches").insert({
        turf_id: turf.id,
        host_id: host.id,
        sport: matchDef.sport,
        match_date: matchDate,
        start_time: matchDef.start_time,
        max_players: matchDef.max_players,
        skill_level: (matchDef.skill_level || "intermediate").toLowerCase(),
        status: "open",
      }).select().single();

      if (!matchErr && match) {
        created.matches++;

        // Add participants
        const participants = matchDef.participant_keys || [];
        for (const pKey of participants) {
          const participantUser = userMap.get(pKey);
          if (participantUser && participantUser.id !== host.id) {
            await admin.from("match_participants").insert({
              match_id: match.id,
              player_id: participantUser.id,
            });
          }
        }
      }
    }
  }

  // 8. Create Demo Tournaments, Registrations & Fixtures
  if (selectedCategories.has("tournaments") && turfMap.size > 0) {
    const tournamentsToCreate = DEMO_TOURNAMENTS.slice(0, tourCount);
    for (const tourDef of tournamentsToCreate) {
      const organizer = userMap.get(tourDef.organizer_key) || firstOwner;
      const turf = turfMap.get(tourDef.turf_key);
      if (!organizer || !turf) continue;

      const startDate = getOffsetDateStr(tourDef.days_to_start);
      const endDate = getOffsetDateStr(tourDef.days_to_start + tourDef.duration_days);
      const deadline = new Date(Date.now() + (tourDef.days_to_start - 2) * 86400000).toISOString();

      const { data: tour, error: tourErr } = await admin.from("tournaments").insert({
        organizer_id: organizer.id,
        turf_id: turf.id,
        title: tourDef.title,
        description: tourDef.description,
        sport: tourDef.sport,
        format: tourDef.format,
        team_size: tourDef.team_size,
        max_teams: tourDef.max_teams,
        entry_fee: tourDef.entry_fee,
        platform_fee: tourDef.platform_fee,
        prize_pool: tourDef.prize_pool,
        prize_description: tourDef.prize_description,
        rules: tourDef.rules,
        registration_deadline: deadline,
        start_date: startDate,
        end_date: endDate,
        turf_approval_status: "approved",
        admin_approval_status: "approved",
        status: tourDef.status,
      }).select().single();

      if (!tourErr && tour) {
        created.tournaments++;

        // Add registrations
        const regRecords = [];
        for (const regDef of tourDef.registrations) {
          const team = regDef.team_key ? teamMap.get(regDef.team_key) : null;
          const regBy = team ? team.captain_id : (allPlayerIds[0] || organizer.id);

          const { data: reg } = await admin.from("tournament_registrations").insert({
            tournament_id: tour.id,
            team_id: team?.id || null,
            registered_by: regBy,
            team_name: regDef.name || regDef.team_name,
            payment_status: "paid",
            amount_paid: regDef.paid,
            approval_status: "approved",
          }).select().single();

          if (reg) regRecords.push(reg);
        }

        // Add Round 1 fixtures if we have at least 2 registrations
        if (regRecords.length >= 2) {
          const r1Date = startDate;
          for (let i = 0; i < Math.floor(regRecords.length / 2); i++) {
            const home = regRecords[i * 2];
            const away = regRecords[i * 2 + 1];
            await admin.from("tournament_fixtures").insert({
              tournament_id: tour.id,
              round: 1,
              match_number: i + 1,
              home_registration_id: home.id,
              away_registration_id: away.id,
              status: "scheduled",
              match_date: r1Date,
              start_time: `${10 + i * 2}:00:00`,
            });
          }
        }
      }
    }
  }

  // 9. Create Demo User Passes / Packages
  if (selectedCategories.has("packages") && allPlayerIds.length > 0) {
    const { data: existingPackages } = await admin.from("packages").select("*").limit(3);
    if (existingPackages && existingPackages.length > 0) {
      for (let i = 0; i < Math.min(allPlayerIds.length, 3); i++) {
        const pkg = existingPackages[i % existingPackages.length];
        const pId = allPlayerIds[i];
        const expiresAt = new Date(Date.now() + pkg.validity_days * 86400000).toISOString();

        const { data: userPkg } = await admin.from("user_packages").insert({
          user_id: pId,
          package_id: pkg.id,
          total_sessions: pkg.total_sessions,
          remaining_sessions: pkg.total_sessions - 1,
          price_paid: pkg.price,
          transaction_reference: `DEMO-PASS-${Date.now().toString(36).toUpperCase()}-${i}`,
          payment_status: "paid",
          status: "active",
          expires_at: expiresAt,
        }).select().single();

        if (userPkg) {
          await admin.from("package_redemptions").insert({
            user_package_id: userPkg.id,
            user_id: pId,
            action: "redeem",
            sessions_delta: -1,
            remaining_after: pkg.total_sessions - 1,
            notes: `${DEMO_TAG} Initial slot redemption`,
          });
        }
      }
    }
  }

  // 10. Create Demo Disputes
  if (selectedCategories.has("disputes") && bookingList.length > 0) {
    for (const dispDef of DEMO_DISPUTES) {
      const turf = turfMap.get(dispDef.turf_key);
      const player = userMap.get(dispDef.player_key);
      if (!turf || !player) continue;

      const matchingBooking = bookingList.find((b) => b.turf_id === turf.id) || bookingList[0];
      if (!matchingBooking) continue;

      const { data: disp, error: dispErr } = await admin.from("disputes").insert({
        ticket_number: dispDef.ticket_number,
        booking_id: matchingBooking.id,
        turf_id: turf.id,
        raised_by: player.id,
        issue: dispDef.issue,
        amount: dispDef.amount,
        status: dispDef.status,
        resolved_at: dispDef.status === "resolved" ? new Date().toISOString() : null,
      }).select().single();

      if (!dispErr && disp) {
        created.disputes++;
      }
    }
  }

  // 11. Create Demo Payouts
  if (selectedCategories.has("payouts") && userMap.size > 0) {
    const demoOwners = Array.from(userMap.values()).filter((u) => u.role === "owner");
    let pNum = 1;
    for (const owner of demoOwners) {
      // 1 Paid payout
      await admin.from("payouts").insert({
        payout_number: `DEMO-PO-202610-00${pNum++}`,
        owner_id: owner.id,
        period_start: getOffsetDateStr(-28),
        period_end: getOffsetDateStr(-14),
        amount: 18500 + pNum * 2500,
        status: "paid",
      });
      created.payouts++;

      // 1 Processing payout
      await admin.from("payouts").insert({
        payout_number: `DEMO-PO-202610-00${pNum++}`,
        owner_id: owner.id,
        period_start: getOffsetDateStr(-14),
        period_end: getOffsetDateStr(-1),
        amount: 24200 + pNum * 1800,
        status: "processing",
      });
      created.payouts++;
    }
  }

  // 12. Create Demo Notifications
  if (selectedCategories.has("notifications") && userMap.size > 0) {
    const sampleUsers = Array.from(userMap.values());
    for (const u of sampleUsers) {
      await admin.from("notifications").insert([
        {
          user_id: u.id,
          title: `${DEMO_TAG} Booking Confirmed`,
          body: `Your slot reservation for Football at Dribble Arena HSR Layout has been confirmed.`,
          read: true,
        },
        {
          user_id: u.id,
          title: `${DEMO_TAG} Upcoming Game Reminder`,
          body: `Reminder: Your match kicks off tomorrow at 07:00 PM. Please arrive 15 minutes early!`,
          read: false,
        },
      ]);
      created.notifications += 2;
    }
  }

  return {
    ok: true,
    size,
    created,
  };
}

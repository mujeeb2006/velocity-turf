export function normalizeAdminRole(role = "") {
  const normalized = String(role).trim().toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "owner" || normalized === "turf_owner" || normalized === "turf owner") return "Turf Owner";
  return "Player";
}

export function filterUsers(users = [], query = "") {
  const normalizedQuery = String(query).trim().toLowerCase();
  if (!normalizedQuery) return users;

  return users.filter((user) =>
    [user.name, user.role, user.email].some((value) =>
      String(value || "").toLowerCase().includes(normalizedQuery),
    ),
  );
}

export function getUserBookingCount(bookings = [], userId = "") {
  return bookings.filter((booking) => booking.player_id === userId).length;
}

// Sum of confirmed/completed booking value for a player.
export function getUserSpend(bookings = [], userId = "") {
  return bookings
    .filter((b) => b.player_id === userId && (b.status === "confirmed" || b.status === "completed"))
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);
}

export function filterUsersByRole(users = [], role = "all") {
  if (role === "all") return users;
  return users.filter((user) => user.role === role);
}

export function countUsersByRole(users = []) {
  const counts = { all: users.length, Player: 0, "Turf Owner": 0, Admin: 0 };
  for (const user of users) if (user.role in counts) counts[user.role] += 1;
  return counts;
}

export function filterTurfs(turfs = [], { query = "", status = "all" } = {}) {
  const q = String(query).trim().toLowerCase();
  return turfs.filter((turf) => {
    if (status !== "all" && turf.status !== status) return false;
    if (!q) return true;
    return [turf.name, turf.owner, turf.city].some((v) => String(v || "").toLowerCase().includes(q));
  });
}

// Stable, null-safe sort for table rows. Strings compare case-insensitively.
export function sortRows(rows = [], key, dir = "asc") {
  if (!key) return rows;
  const factor = dir === "desc" ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = a.row[key];
      const bv = b.row[key];
      let result;
      if (typeof av === "number" && typeof bv === "number") result = av - bv;
      else result = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base", numeric: true });
      return result * factor || a.index - b.index;
    })
    .map(({ row }) => row);
}

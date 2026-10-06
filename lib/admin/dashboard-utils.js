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

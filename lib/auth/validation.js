export function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

export function normalizeUserRole(value = "") {
  const role = String(value).trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "owner" || role === "turf_owner" || role === "turf owner") return "owner";
  return "player";
}

export function normalizeSignupRole() {
  return "player";
}

export function isValidEmail(value = "") {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(value = "") {
  const password = String(value).trim();
  return password.length >= 8 && password.length > 0;
}

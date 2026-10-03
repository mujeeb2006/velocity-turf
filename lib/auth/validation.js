export function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

export function isValidEmail(value = "") {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(value = "") {
  const password = String(value).trim();
  return password.length >= 6 && password.length > 0;
}

import { normalizeUserRole } from "./validation.js";

export function getPortalHome(profile) {
  if (!profile) return "/login";

  const role = normalizeUserRole(profile.role);
  const homeByRole = {
    admin: "/admin",
    owner: "/owner",
    staff: "/owner",
    player: "/player",
  };

  return homeByRole[role] || "/player";
}

export function getRoleAccessError(profile, requiredRole) {
  if (!profile) return { redirectTo: "/login" };

  const role = normalizeUserRole(profile.role);
  const normalizedRequiredRole = normalizeUserRole(requiredRole);

  if (normalizedRequiredRole) {
    if (normalizedRequiredRole === "owner") {
      if (role !== "owner" && role !== "staff") {
        return { redirectTo: "/unauthorized" };
      }
    } else if (role !== normalizedRequiredRole) {
      return { redirectTo: "/unauthorized" };
    }
  }
  return { redirectTo: null };
}

export function resolveRoleRedirect(profile, requiredRole) {
  const { redirectTo } = getRoleAccessError(profile, requiredRole);
  return redirectTo;
}

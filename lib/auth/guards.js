export function getPortalHome(profile) {
  if (!profile) return "/login";

  const homeByRole = {
    admin: "/admin",
    owner: "/owner",
    player: "/player",
  };

  return homeByRole[profile.role] || "/player";
}

export function getRoleAccessError(profile, requiredRole) {
  if (!profile) return { redirectTo: "/login" };
  if (requiredRole && profile.role !== requiredRole) {
    return { redirectTo: "/unauthorized" };
  }
  return { redirectTo: null };
}

export function resolveRoleRedirect(profile, requiredRole) {
  const { redirectTo } = getRoleAccessError(profile, requiredRole);
  return redirectTo;
}

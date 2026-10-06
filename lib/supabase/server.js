import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { normalizeUserRole } from "@/lib/auth/validation";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component - safe to ignore because
          // middleware.js already refreshes the session on each request.
        }
      },
    },
  });
}

// Looks up the signed-in user's profile (id, email, full_name, role).
// Returns null if nobody is signed in.
export async function getProfile() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("getProfile(): auth.getUser() failed", userError);
  }
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("getProfile() failed for user", user.id, error);
  }

  if (!profile) return null;

  const normalizedRole = normalizeUserRole(profile.role);
  return { ...profile, role: normalizedRole, email: user.email };
}

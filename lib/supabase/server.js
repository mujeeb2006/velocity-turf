import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    }
  );
}

// Looks up the signed-in user's profile (id, email, full_name, role).
// Returns null if nobody is signed in.
export async function getProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    // Surface this in Vercel's function logs instead of silently
    // returning null, so an RLS/DB issue is visible instead of just
    // looking like "not logged in".
    console.error("getProfile() failed for user", user.id, error);
  }

  return profile ? { ...profile, email: user.email } : null;
}

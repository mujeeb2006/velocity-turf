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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("getProfile(): auth.getUser() failed", userError);
  }
  if (!user) {
    console.error("getProfile(): no user on this request (cookie not read as a valid session)");
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("getProfile() failed for user", user.id, error);
  }

  return profile ? { ...profile, email: user.email } : null;
}

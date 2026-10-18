import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this file from a Client Component -
// the service role key bypasses Row Level Security entirely.
// Use it only inside Server Components / Route Handlers, and only
// after you've already confirmed the current user's role is "admin".
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment."
    );
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );
}

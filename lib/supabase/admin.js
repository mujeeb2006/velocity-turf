import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this file from a Client Component -
// the service role key bypasses Row Level Security entirely.
// Use it only inside Server Components / Route Handlers, and only
// after you've already confirmed the current user's role is "admin".
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

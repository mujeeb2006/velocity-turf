import test from "node:test";
import assert from "node:assert/strict";
import { getSupabaseEnv } from "../lib/supabase/env.js";
import { createAdminClient } from "../lib/supabase/admin.js";

test("getSupabaseEnv throws actionable error when public Supabase variables are missing", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    assert.throws(
      () => getSupabaseEnv(),
      /Missing Supabase environment variables.*NEXT_PUBLIC_SUPABASE_URL/i
    );

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.throws(
      () => getSupabaseEnv(),
      /Missing Supabase environment variables.*NEXT_PUBLIC_SUPABASE_ANON_KEY/i
    );
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origAnon;
  }
});

test("createAdminClient throws actionable error when service role key is missing", () => {
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(
      () => createAdminClient(),
      /Missing Supabase admin environment variables.*SUPABASE_SERVICE_ROLE_KEY/i
    );
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});

test("Supabase configuration does not leak service role key in client env", () => {
  assert.equal(typeof getSupabaseEnv().serviceRoleKey, "undefined");
  assert.ok(!("serviceRoleKey" in getSupabaseEnv()));
});

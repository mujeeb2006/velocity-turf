import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role");

  if (code) {
    const supabase = createClient();

    // Direct raw test, bypassing the SDK
    const testCall = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
    });
    console.log("DIRECT FETCH STATUS:", testCall.status);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("EXCHANGE ERROR:", error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data?.user) {
      if (role === "owner" || role === "player") {
        await supabase.from("profiles").update({ role }).eq("id", data.user.id);
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
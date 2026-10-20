import { NextResponse } from "next/server";
import { requireAdmin, readJson } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail, isValidEmail } from "@/lib/auth/validation";
import { getSiteUrl } from "@/lib/auth/url";

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await readJson(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const linkType = String(body.linkType || "signin").toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const siteUrl = getSiteUrl(request);
  const admin = createAdminClient();

  // 1. Direct sign-in link (takes owner to login page with pre-filled email and /owner redirect)
  if (linkType === "signin") {
    const directUrl = `${siteUrl}/login?next=%2Fowner&email=${encodeURIComponent(email)}`;
    return NextResponse.json({
      success: true,
      link: directUrl,
      linkType: "signin",
      email,
      message: "Direct owner sign-in link generated successfully.",
    });
  }

  // 2. One-time secure sign-in magic link (for existing turf owner passwordless / recovery access)
  if (linkType === "magiclink" || linkType === "recovery") {
    const redirectTo = `${siteUrl}/auth/callback?next=/owner`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      console.error("Magic link generation failed:", error);
      return NextResponse.json(
        { error: error?.message || "Could not generate secure sign-in link for this user." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      link: data.properties.action_link,
      linkType: "magiclink",
      email,
      message: "One-time secure access link generated successfully. Link expires in 24 hours.",
    });
  }

  // 3. New owner invitation link (allows setting password and landing on Owner Dashboard)
  if (linkType === "invite") {
    const redirectTo = `${siteUrl}/auth/callback?next=/auth/set-password`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      console.error("Invitation link generation failed:", error);
      return NextResponse.json(
        { error: error?.message || "Could not generate invitation link." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      link: data.properties.action_link,
      linkType: "invite",
      email,
      message: "Owner invitation link generated successfully. Link expires in 24 hours.",
    });
  }

  return NextResponse.json({ error: "Invalid link type requested." }, { status: 400 });
}

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
  const requestedType = String(body.linkType || "auto").toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const siteUrl = getSiteUrl(request);
  const admin = createAdminClient();

  // 1. Inspect actual Supabase Auth account state
  let authUser = null;
  try {
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers();
    if (!listErr && listData?.users) {
      authUser = listData.users.find((u) => normalizeEmail(u.email) === email) || null;
    }
  } catch (err) {
    console.warn("Could not query auth user for access link:", err);
  }

  // 2. Inspect application profile
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("email", email)
    .maybeSingle();

  // Determine whether the user has completed registration and confirmed a password
  const isConfirmed = Boolean(authUser?.confirmed_at);
  const isPendingInvite = Boolean(authUser && !authUser.confirmed_at);
  const hasNoAuthAccount = !authUser;

  // Setup redirect URL target for password creation
  const setupRedirectTo = `${siteUrl}/auth/callback?next=/auth/setup-password`;

  // 3. Handle explicit or automatic link generation based on actual account state

  // A. If the user is unconfirmed or setup is explicitly requested, generate a password setup link
  if (
    requestedType === "setup" ||
    requestedType === "invite" ||
    (requestedType === "signin" && (isPendingInvite || hasNoAuthAccount)) ||
    (requestedType === "auto" && !isConfirmed)
  ) {
    let actionLink = null;

    // If user does not exist in Auth, invite them
    if (hasNoAuthAccount) {
      const { data: inviteData, error: inviteErr } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { role: "owner", full_name: profile?.full_name || email.split("@")[0] },
          redirectTo: setupRedirectTo,
        },
      });

      if (inviteErr || !inviteData?.properties?.action_link) {
        return NextResponse.json(
          { error: inviteErr?.message || "Could not generate owner setup link." },
          { status: 400 }
        );
      }
      actionLink = inviteData.properties.action_link;
    } else {
      // User exists in Auth: generate link using 'invite' if unconfirmed, or 'recovery' if confirmed
      let linkRes = null;
      if (isPendingInvite) {
        linkRes = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            data: { role: "owner" },
            redirectTo: setupRedirectTo,
          },
        });
      }

      // If invite fails or user already confirmed, generate recovery link to safely establish password
      if (!linkRes || linkRes.error || !linkRes.data?.properties?.action_link) {
        linkRes = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: setupRedirectTo },
        });
      }

      if (linkRes.error || !linkRes.data?.properties?.action_link) {
        return NextResponse.json(
          { error: linkRes.error?.message || "Could not generate account setup link." },
          { status: 400 }
        );
      }
      actionLink = linkRes.data.properties.action_link;
    }

    // Ensure role metadata is in app_metadata
    if (authUser?.id || profile?.id) {
      const targetId = authUser?.id || profile?.id;
      try {
        await admin.auth.admin.updateUserById(targetId, {
          app_metadata: { role: "owner" },
          user_metadata: { role: "owner" },
        });
      } catch (metaErr) {
        console.warn("Could not sync app_metadata role:", metaErr);
      }
    }

    return NextResponse.json({
      success: true,
      link: actionLink,
      linkType: "setup",
      accountState: isConfirmed ? "confirmed" : "pending_password",
      email,
      message: isConfirmed
        ? "Password setup/reset link generated successfully. Link expires in 24 hours."
        : "Account setup link generated successfully. The owner has not created a password yet and will be guided to set one.",
    });
  }

  // B. Existing Turf Owner with confirmed account requesting direct sign-in link
  if (requestedType === "signin") {
    const directUrl = `${siteUrl}/login?next=%2Fowner&email=${encodeURIComponent(email)}`;
    return NextResponse.json({
      success: true,
      link: directUrl,
      linkType: "signin",
      accountState: "confirmed",
      email,
      message: "Direct owner sign-in link generated successfully.",
    });
  }

  // C. One-time secure sign-in magic link for existing confirmed owner
  if (requestedType === "magiclink") {
    if (!isConfirmed && isPendingInvite) {
      // Unconfirmed owner cannot sign in via normal magiclink without setting password first
      // Fallback securely to setup link
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo: setupRedirectTo },
      });
      if (!linkErr && linkData?.properties?.action_link) {
        return NextResponse.json({
          success: true,
          link: linkData.properties.action_link,
          linkType: "setup",
          accountState: "pending_password",
          email,
          message:
            "This owner has not set up a password yet. An account setup link was generated instead.",
        });
      }
    }

    const redirectTo = `${siteUrl}/auth/callback?next=/owner`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { error: error?.message || "Could not generate secure sign-in link for this user." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      link: data.properties.action_link,
      linkType: "magiclink",
      accountState: "confirmed",
      email,
      message: "One-time secure access link generated successfully. Link expires in 24 hours.",
    });
  }

  // D. Password recovery link
  if (requestedType === "recovery" || requestedType === "reset") {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: setupRedirectTo },
    });

    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { error: error?.message || "Could not generate password reset link." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      link: data.properties.action_link,
      linkType: "recovery",
      accountState: isConfirmed ? "confirmed" : "pending_password",
      email,
      message: "Password reset link generated successfully. Link expires in 24 hours.",
    });
  }

  // Default: if confirmed, direct signin link; otherwise setup link
  if (isConfirmed) {
    const directUrl = `${siteUrl}/login?next=%2Fowner&email=${encodeURIComponent(email)}`;
    return NextResponse.json({
      success: true,
      link: directUrl,
      linkType: "signin",
      accountState: "confirmed",
      email,
      message: "Direct owner sign-in link generated successfully.",
    });
  }

  // Fallback to setup link
  const { data: defaultData } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: setupRedirectTo },
  });

  return NextResponse.json({
    success: true,
    link: defaultData?.properties?.action_link || `${siteUrl}/auth/setup-password`,
    linkType: "setup",
    accountState: "pending_password",
    email,
    message: "Owner setup link generated successfully.",
  });
}

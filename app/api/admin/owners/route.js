import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole, normalizeEmail, isValidEmail } from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/auth/url";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (normalizeUserRole(profile.role) !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = normalizeEmail(body.email);
  const requestedRole = normalizeUserRole(body.role || "owner");
  const generateLinkOnly = Boolean(body.generateLinkOnly);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const siteUrl = getSiteUrl(request);
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/setup-password`;

  // Check auth user state and existing profile
  let authUser = null;
  try {
    const { data: listData } = await admin.auth.admin.listUsers();
    authUser = listData?.users?.find((u) => normalizeEmail(u.email) === email) || null;
  } catch (err) {
    console.warn("Could not check auth user state in owners route:", err);
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("email", email)
    .maybeSingle();

  const isConfirmed = Boolean(authUser?.confirmed_at);
  const isPending = Boolean(authUser && !authUser.confirmed_at);

  if (existingProfile) {
    const existingRole = normalizeUserRole(existingProfile.role);
    if (existingRole === "owner") {
      // If the owner has NOT completed password setup, allow generating a replacement invitation
      if (isPending || !isConfirmed) {
        if (generateLinkOnly) {
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              data: { full_name: fullName || existingProfile.full_name, role: "owner" },
              redirectTo,
            },
          });

          if (!linkErr && linkData?.properties?.action_link) {
            return NextResponse.json({
              success: true,
              link: linkData.properties.action_link,
              message: "Replacement invitation link generated for pending owner.",
            });
          }
        } else {
          const { error: reinviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
            data: { full_name: fullName || existingProfile.full_name, role: "owner" },
            redirectTo,
          });

          if (!reinviteErr) {
            return NextResponse.json({
              success: true,
              message: "Replacement invitation sent to owner's email.",
            });
          }
        }
      }

      return NextResponse.json(
        {
          alreadyExists: true,
          isOwner: true,
          user: existingProfile,
          error: "This email belongs to an existing Turf Owner with an active account. Use 'Get Link' in User Management to share sign-in or reset links.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        alreadyExists: true,
        canPromote: true,
        user: existingProfile,
        error: `"${email}" is already registered as a Player. You can change their role to Turf Owner directly in the user list.`,
      },
      { status: 409 }
    );
  }

  let actionLink = null;

  if (generateLinkOnly) {
    // Generate secure one-time invite link without emailing
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: fullName, role: requestedRole },
        redirectTo,
      },
    });

    if (linkErr || !linkData?.user) {
      return NextResponse.json({ error: linkErr?.message || "Could not generate invitation link." }, { status: 400 });
    }

    actionLink = linkData.properties?.action_link;

    // Set app_metadata
    try {
      await admin.auth.admin.updateUserById(linkData.user.id, {
        app_metadata: { role: requestedRole },
        user_metadata: { full_name: fullName, role: requestedRole },
      });
    } catch (metaErr) {
      console.warn("Could not set app_metadata on invited user:", metaErr);
    }

    // Upsert profile
    await admin.from("profiles").upsert(
      {
        id: linkData.user.id,
        email,
        full_name: fullName || email.split("@")[0],
        role: requestedRole,
      },
      { onConflict: "id" }
    );

    return NextResponse.json({
      success: true,
      link: actionLink,
      message: "Invitation link generated successfully.",
    });
  }

  // Standard email invitation via Supabase
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: requestedRole },
    redirectTo,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Could not send the invitation." }, { status: 400 });
  }

  // Set tamper-proof app_metadata on the auth user record
  try {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: requestedRole },
      user_metadata: { full_name: fullName, role: requestedRole },
    });
  } catch (metaErr) {
    console.warn("Could not set app_metadata on invited user:", metaErr);
  }

  // Idempotently create or update the profile with owner role
  const { error: roleError } = await admin
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName || email.split("@")[0],
        role: requestedRole,
      },
      { onConflict: "id" }
    );

  if (roleError) {
    console.error("The account could not be assigned the owner role:", roleError);
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "The account could not be assigned the owner role." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Invitation sent successfully.",
    user: { id: data.user.id, email, full_name: fullName, role: requestedRole },
  });
}

export async function DELETE(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (normalizeUserRole(profile.role) !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "User ID is required." }, { status: 400 });

  const admin = createAdminClient();

  // Verify user is an unconfirmed pending invite before allowing deletion
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (authUser?.user?.confirmed_at) {
    return NextResponse.json(
      { error: "Cannot revoke invitation: user has already activated and confirmed their account." },
      { status: 400 }
    );
  }

  // Delete from profiles and auth
  await admin.from("profiles").delete().eq("id", userId);
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error("Failed to delete invited user from auth:", delErr);
    return NextResponse.json({ error: delErr.message || "Could not revoke invitation." }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Invitation revoked successfully." });
}
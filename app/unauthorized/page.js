import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";
import { getPortalHome } from "@/lib/auth/guards";
import AuthShell from "../auth-shell";
import { COLORS as V } from "@/lib/design-tokens";

export default async function UnauthorizedPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const home = getPortalHome(profile);

  return (
    <AuthShell title="Wrong portal" subtitle={`Your account is registered as a ${profile.role}`}>
      <p style={{ color: V.chalkDim, fontSize: 14, textAlign: "center", marginBottom: 20 }}>
        You don't have access to that dashboard with this account.
      </p>
      <Link
        href={home}
        style={{
          display: "block",
          textAlign: "center",
          padding: "13px",
          borderRadius: 14,
          background: V.flood,
          color: V.chalk,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
        }}
      >
        Take me to my dashboard →
      </Link>
    </AuthShell>
  );
}

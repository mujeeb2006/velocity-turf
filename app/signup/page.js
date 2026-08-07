"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "../auth-shell";
import { errorStyle } from "../auth-styles";

export default function SignupPage() {
  const supabase = createClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join Velocity Turf with your Google account">
      {error && <div style={errorStyle}>{error}</div>}

      <button onClick={handleGoogleSignup} disabled={loading} style={googleButtonStyle}>
        <GoogleIcon />
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>

      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 14, textAlign: "center" }}>
        You'll start as a Player. You can switch to Turf Owner from your profile later.
      </p>

      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13.5, marginTop: 20, textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#0EA5E9", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

const googleButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "13px",
  borderRadius: 12,
  background: "#fff",
  color: "#1f1f1f",
  fontWeight: 700,
  fontSize: 14.5,
  border: "none",
  cursor: "pointer",
  fontFamily: "'Exo 2', sans-serif",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.6 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.9-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 19 12.5 24 12.5c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.6 3.5 24 3.5c-7.4 0-13.7 4.2-16.9 10.4z"/>
      <path fill="#4CAF50" d="M24 44.5c5.5 0 10.3-1.9 14-5.1l-6.5-5.4c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 40.3 16.4 44.5 24 44.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.4C41.4 35.6 44.5 30.3 44.5 24c0-1.2-.1-2.4-.9-3.5z"/>
    </svg>
  );
}
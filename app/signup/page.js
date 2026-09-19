"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "../auth-shell";
import { inputStyle, buttonStyle, errorStyle, linkStyle, roleStyle, roleActiveStyle } from "../auth-styles";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (data?.user) {
      await supabase
        .from("profiles")
        .update({ role, full_name: fullName })
        .eq("id", data.user.id);
    }

    setLoading(false);

    if (data?.session) {
      // Hard navigation, same reasoning as login: guarantees the server
      // sees the fresh session cookie instead of a stale route cache.
      window.location.href = "/";
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <AuthShell title="Check your email" subtitle="We've sent you a confirmation link">
        <p style={{ color: "rgba(245,247,242,0.6)", fontSize: 14.5, textAlign: "center", fontFamily: "'Manrope', sans-serif" }}>
          Click the link in your email to activate your account, then come back and sign in.
        </p>
        <Link href="/login" style={{ ...buttonStyle, display: "block", textAlign: "center", marginTop: 22, textDecoration: "none", boxSizing: "border-box" }}>
          Go to login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Sign up for Velocity Turf">
      {error && <div style={errorStyle}>{error}</div>}

      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setRole("player")}
            style={role === "player" ? roleActiveStyle : roleStyle}
          >
            Player
          </button>
          <button
            type="button"
            onClick={() => setRole("owner")}
            style={role === "owner" ? roleActiveStyle : roleStyle}
          >
            Turf owner
          </button>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p style={{ color: "rgba(245,247,242,0.4)", fontSize: 13.5, marginTop: 22, textAlign: "center", fontFamily: "'Manrope', sans-serif" }}>
        Already have an account?{" "}
        <Link href="/login" style={linkStyle}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "../auth-shell";
import { buttonStyle, errorStyle } from "../auth-styles";

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

    // If email confirmation is off, Supabase gives us a session right away.
    if (data?.user) {
      await supabase
        .from("profiles")
        .update({ role, full_name: fullName })
        .eq("id", data.user.id);
    }

    setLoading(false);

    if (data?.session) {
      router.push("/");
      router.refresh();
    } else {
      // Email confirmation is required before they can log in.
      setDone(true);
    }
  }

  if (done) {
    return (
      <AuthShell title="Check your email" subtitle="We've sent you a confirmation link">
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14.5, textAlign: "center" }}>
          Click the link in your email to activate your account, then come back and sign in.
        </p>
        <Link href="/login" style={{ ...buttonStyle, display: "block", textAlign: "center", marginTop: 20, textDecoration: "none" }}>
          Go to Login
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

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
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
            Turf Owner
          </button>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13.5, marginTop: 20, textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#0EA5E9", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 14.5,
  marginBottom: 14,
  fontFamily: "'Exo 2', sans-serif",
  boxSizing: "border-box",
};

const roleStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.6)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Exo 2', sans-serif",
};

const roleActiveStyle = {
  ...roleStyle,
  background: "#0EA5E9",
  border: "1px solid #0EA5E9",
  color: "#fff",
};
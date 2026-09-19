"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "../auth-shell";
import { inputStyle, buttonStyle, errorStyle, linkStyle } from "../auth-styles";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // A hard navigation (not router.push) forces a brand-new request,
      // so the server is guaranteed to see the freshly-set session cookie
      // instead of racing a stale client-side route cache.
      window.location.href = "/";
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Velocity Turf account">
      {error && <div style={errorStyle}>{error}</div>}

      <form onSubmit={handleLogin}>
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ color: "rgba(245,247,242,0.4)", fontSize: 13.5, marginTop: 22, textAlign: "center", fontFamily: "'Manrope', sans-serif" }}>
        Don't have an account?{" "}
        <Link href="/signup" style={linkStyle}>
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

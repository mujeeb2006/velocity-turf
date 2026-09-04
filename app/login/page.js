"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "../auth-shell";
import { buttonStyle, errorStyle } from "../auth-styles";

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
      router.push("/");
      router.refresh();
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
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13.5, marginTop: 20, textAlign: "center" }}>
        Don't have an account?{" "}
        <Link href="/signup" style={{ color: "#0EA5E9", fontWeight: 600 }}>
          Sign up
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
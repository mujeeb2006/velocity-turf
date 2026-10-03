"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeEmail, normalizeSignupRole, isValidEmail, isStrongPassword } from "@/lib/auth/validation";
import AuthShell from "../auth-shell";
import { inputStyle, buttonStyle, errorStyle, linkStyle } from "../auth-styles";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    const trimmedFullName = fullName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (!trimmedFullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);

    const selectedRole = normalizeSignupRole(role);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedFullName,
          role: selectedRole,
        },
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
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
    <AuthShell title={role === "owner" ? "Join as a turf owner" : "Join as a player"} subtitle={role === "owner" ? "Create your owner account to list and manage turfs" : "Create your player account to find and book a pitch"}>
      {error && <div role="alert" style={{ ...errorStyle, marginBottom: 18 }}>{error}</div>}

      <form onSubmit={handleSignup} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="signup-role" style={{ color: "rgba(245,247,242,0.72)", fontSize: 13, fontFamily: "'Manrope', sans-serif" }}>I am signing up as</label>
          <select
            id="signup-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px", background: "rgba(15, 20, 24, 0.92)" }}
          >
            <option value="player">Player</option>
            <option value="owner">Turf owner</option>
          </select>
        </div>
        <input
          type="text"
          aria-label="Full name"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px" }}
        />
        <input
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px" }}
        />
        <input
          type="password"
          aria-label="Password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px" }}
        />
        <input
          type="password"
          aria-label="Confirm password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px" }}
        />

        <button type="submit" disabled={loading} style={{ ...buttonStyle, width: "100%", minHeight: 50, marginTop: 4, borderRadius: 10, fontSize: 15 }}>
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <p style={{ color: "rgba(245,247,242,0.52)", fontSize: 13.5, lineHeight: 1.6, marginTop: 22, textAlign: "center", fontFamily: "'Manrope', sans-serif" }}>
        Already have an account?{" "}
        <Link href="/login" style={linkStyle}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

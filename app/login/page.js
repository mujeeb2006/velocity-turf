"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeEmail, isValidEmail, isStrongPassword } from "@/lib/auth/validation";
import AuthShell from "../auth-shell";
import { inputStyle, buttonStyle, errorStyle, linkStyle } from "../auth-styles";
import { COLORS as V } from "@/lib/design-tokens";

import { sanitizeRedirectPath } from "@/lib/auth/url";
import {
  buildResumeHref,
  decodeBookingIntent,
  encodeBookingIntent,
  getStoredBookingIntent,
  saveBookingIntent,
} from "@/lib/booking/intent";

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const urlError = searchParams?.get("error");
  const rawIntentParam = searchParams?.get("bookingIntent");
  const rawNextParam = searchParams?.get("next");
  // searchParams.get() already decodes; decoding again can throw on a literal "%".
  const [error, setError] = useState(urlError || "");
  const [loading, setLoading] = useState(false);
  const [bookingIntent, setBookingIntent] = useState(null);

  useEffect(() => {
    const decoded = decodeBookingIntent(rawIntentParam) || getStoredBookingIntent();
    if (decoded) {
      setBookingIntent(decoded);
      saveBookingIntent(decoded);
    }
  }, [rawIntentParam]);

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return; // ignore double submits
    setError("");

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    let signInError = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      signInError = result.error;
    } catch {
      setLoading(false);
      setError("We couldn't reach the server. Check your connection and try again.");
      return; // booking intent stays in state + sessionStorage
    }

    if (signInError) {
      setLoading(false);
      const message = signInError.message.toLowerCase();
      if (message.includes("invalid login credentials")) {
        setError(
          "Invalid login credentials. If you are an invited turf owner, please click the invitation link in your email to set your password."
        );
      } else if (message.includes("email not confirmed")) {
        setError("Please confirm your email first. Open the verification link we sent you, then sign in.");
      } else {
        setError(signInError.message);
      }
      return; // booking intent is kept so the user can retry
    }

    // Hard navigation ensures the session cookie is fresh on the server.
    // Signing in never creates a booking: "/" routes players to /player with
    // the intent (the booking modal reopens for explicit confirmation) and
    // owners/admins to their own dashboards.
    if (bookingIntent) {
      window.location.href = buildResumeHref(bookingIntent);
    } else if (rawNextParam) {
      window.location.href = sanitizeRedirectPath(rawNextParam, "/");
    } else {
      window.location.href = "/";
    }
  }

  const signupHref = bookingIntent
    ? `/signup?bookingIntent=${encodeBookingIntent(bookingIntent)}${rawNextParam ? `&next=${encodeURIComponent(rawNextParam)}` : ""}`
    : (rawNextParam ? `/signup?next=${encodeURIComponent(rawNextParam)}` : "/signup");

  return (
    <AuthShell
      title="Welcome back"
      subtitle={bookingIntent ? "Sign in to complete your booking." : "Sign in and book your next game."}
    >
      {bookingIntent && (
        <div
          role="status"
          style={{
            background: "rgba(31, 155, 108, 0.12)",
            border: `1px solid ${V.flood}55`,
            borderRadius: 12,
            padding: "11px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>⚡</span>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "'Manrope', sans-serif" }}>
              Resuming your booking
            </div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2, fontFamily: "'Manrope', sans-serif" }}>
              {bookingIntent.turfName || "Selected pitch"} · {bookingIntent.bookingDate} at {bookingIntent.timeLabel || bookingIntent.startTime}
            </div>
          </div>
        </div>
      )}

      {error && <div role="alert" style={{ ...errorStyle, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
        <input
          type="email"
          aria-label="Email address"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={inputStyle}
        />
        <input
          type="password"
          aria-label="Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={inputStyle}
        />
        <button type="submit" disabled={loading} aria-busy={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "progress" : "pointer" }}>
          {loading ? "Signing in…" : (bookingIntent ? "Sign in & Continue Booking →" : "Sign in")}
        </button>
      </form>

      <div style={{ marginTop: 22, textAlign: "center", display: "grid", gap: 8 }}>
        <p style={{ color: V.chalkDim, fontSize: 13.5, margin: 0, fontFamily: "'Manrope', sans-serif" }}>
          New here?{" "}
          <Link href={signupHref} style={linkStyle}>
            Create your account
          </Link>
        </p>
        <p style={{ color: V.chalkFaint, fontSize: 12.5, margin: 0, fontFamily: "'Manrope', sans-serif" }}>
          Invited turf owner? Check your email to set your password.
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Welcome back" subtitle="Sign in and book your next game.">
          <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.6)" }}>
            Loading…
          </div>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

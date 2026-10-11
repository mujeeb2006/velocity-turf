"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeEmail, normalizeSignupRole, isValidEmail, isStrongPassword } from "@/lib/auth/validation";
import { sanitizeRedirectPath } from "@/lib/auth/url";
import {
  decodeBookingIntent,
  encodeBookingIntent,
  getStoredBookingIntent,
  saveBookingIntent,
} from "@/lib/booking/intent";
import AuthShell from "../auth-shell";
import { inputStyle, buttonStyle, errorStyle, linkStyle } from "../auth-styles";
import { COLORS as V } from "@/lib/design-tokens";

function SignupForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const rawIntentParam = searchParams?.get("bookingIntent");
  const rawNextParam = searchParams?.get("next");
  const [bookingIntent, setBookingIntent] = useState(null);

  useEffect(() => {
    const decoded = decodeBookingIntent(rawIntentParam) || getStoredBookingIntent();
    if (decoded) {
      setBookingIntent(decoded);
      saveBookingIntent(decoded);
    }
  }, [rawIntentParam]);

  const targetReturnUrl = bookingIntent
    ? `/player?resumeBooking=${encodeBookingIntent(bookingIntent)}`
    : sanitizeRedirectPath(rawNextParam, "/");

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
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);

    const emailRedirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetReturnUrl)}`
      : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: trimmedFullName,
          role: normalizeSignupRole(),
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
      // Direct session granted
      window.location.href = targetReturnUrl;
    } else {
      setDone(true);
    }
  }

  const loginHref = bookingIntent
    ? `/login?bookingIntent=${encodeBookingIntent(bookingIntent)}${rawNextParam ? `&next=${encodeURIComponent(rawNextParam)}` : ""}`
    : (rawNextParam ? `/login?next=${encodeURIComponent(rawNextParam)}` : "/login");

  if (done) {
    return (
      <AuthShell title="Check your inbox" subtitle="One more step to activate your account">
        <p style={{ color: V.chalkDim, fontSize: 14.5, textAlign: "center", fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>
          Open the confirmation link sent to <strong>{email}</strong>.
          {bookingIntent && (
            <span style={{ display: "block", marginTop: 8, color: "#22C55E", fontWeight: 700 }}>
              Your selected slot at {bookingIntent.turfName || "your turf"} will be ready to confirm!
            </span>
          )}
        </p>
        <Link
          href={loginHref}
          style={{
            ...buttonStyle,
            display: "block",
            textAlign: "center",
            marginTop: 22,
            textDecoration: "none",
            boxSizing: "border-box",
          }}
        >
          {bookingIntent ? "Go to Sign in & Continue Booking →" : "Go to sign in"}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign up"
      subtitle={bookingIntent ? "Create an account to complete your booking." : "Join in a minute and book your first game."}
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

      {error && <div role="alert" style={{ ...errorStyle, marginBottom: 18 }}>{error}</div>}

      <form onSubmit={handleSignup} style={{ display: "grid", gap: 14 }}>
        <p style={{ color: V.chalkDim, fontSize: 13, lineHeight: 1.5, fontFamily: "'Manrope', sans-serif", margin: 0 }}>
          Player accounts are open to everyone. Turf owner access is provided by an administrator.
        </p>
        <input
          type="text"
          aria-label="Full name"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px", boxSizing: "border-box" }}
        />
        <input
          type="email"
          aria-label="Email address"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px", boxSizing: "border-box" }}
        />
        <input
          type="password"
          aria-label="Password"
          placeholder="Create a password (at least 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px", boxSizing: "border-box" }}
        />
        <input
          type="password"
          aria-label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          style={{ ...inputStyle, width: "100%", minHeight: 48, borderRadius: 10, padding: "13px 15px", boxSizing: "border-box" }}
        />

        <button type="submit" disabled={loading} style={{ ...buttonStyle, width: "100%", minHeight: 50, marginTop: 4, borderRadius: 10, fontSize: 15 }}>
          {loading ? "Creating account…" : (bookingIntent ? "Sign up & Continue Booking →" : "Sign up")}
        </button>
      </form>

      <p style={{ color: V.chalkDim, fontSize: 13.5, lineHeight: 1.6, marginTop: 22, textAlign: "center", fontFamily: "'Manrope', sans-serif" }}>
        Already have an account?{" "}
        <Link href={loginHref} style={linkStyle}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign up" subtitle="Join in a minute and book your first game.">
          <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.6)" }}>
            Loading…
          </div>
        </AuthShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

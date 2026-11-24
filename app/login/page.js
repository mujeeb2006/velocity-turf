"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword, isValidEmail, normalizeEmail } from "@/lib/auth/validation";
import { sanitizeRedirectPath } from "@/lib/auth/url";
import AuthShell from "@/app/auth-shell";
import {
  inputStyle,
  buttonStyle,
  errorStyle,
  linkStyle,
  successStyle,
} from "@/app/auth-styles";
import { COLORS as V } from "@/lib/design-tokens";
import { ArrowRight, Calendar, SportIcon, Eye, EyeOff } from "@/components/ui/icons";
import {
  buildResumeHref,
  decodeBookingIntent,
  encodeBookingIntent,
  getStoredBookingIntent,
  saveBookingIntent,
} from "@/lib/booking/intent";
import {
  buildResumeMatchHref,
  decodeMatchIntent,
  encodeMatchIntent,
  getStoredMatchIntent,
  saveMatchIntent,
} from "@/lib/match/intent";

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const urlError = searchParams?.get("error");
  const rawBookingIntentParam = searchParams?.get("bookingIntent");
  const rawMatchIntentParam = searchParams?.get("matchIntent");
  const rawNextParam = searchParams?.get("next");
  const [error, setError] = useState(urlError || "");
  const [successInfo, setSuccessInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingIntent, setBookingIntent] = useState(null);
  const [matchIntent, setMatchIntent] = useState(null);

  // Modes: "login" | "forgot" | "resendInvite"
  const [mode, setMode] = useState("login");
  const [resetEmail, setResetEmail] = useState(emailParam);
  const [inviteEmail, setInviteEmail] = useState(emailParam);

  useEffect(() => {
    const decodedBooking = decodeBookingIntent(rawBookingIntentParam) || getStoredBookingIntent();
    if (decodedBooking) {
      setBookingIntent(decodedBooking);
      saveBookingIntent(decodedBooking);
    }
    const decodedMatch = decodeMatchIntent(rawMatchIntentParam) || getStoredMatchIntent();
    if (decodedMatch) {
      setMatchIntent(decodedMatch);
      saveMatchIntent(decodedMatch);
    }
  }, [rawBookingIntentParam, rawMatchIntentParam]);

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return; // ignore double submits
    setError("");
    setSuccessInfo("");

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
      return;
    }

    if (signInError) {
      setLoading(false);
      const message = signInError.message.toLowerCase();
      if (message.includes("invalid login credentials")) {
        setError(
          "Invalid email or password. Please verify your credentials and try again."
        );
      } else if (message.includes("email not confirmed")) {
        setError("Please confirm your email first. Open the verification link we sent you, then sign in.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    // Hard navigation ensures the session cookie is fresh on the server.
    if (matchIntent) {
      window.location.href = buildResumeMatchHref(matchIntent);
    } else if (bookingIntent) {
      window.location.href = buildResumeHref(bookingIntent);
    } else if (rawNextParam) {
      window.location.href = sanitizeRedirectPath(rawNextParam, "/");
    } else {
      window.location.href = "/";
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccessInfo("");

    const targetEmail = normalizeEmail(resetEmail || email);
    if (!isValidEmail(targetEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Failed to request password reset.");
        return;
      }
      setSuccessInfo(
        data.message || "If an account exists for this email, we have sent password reset instructions."
      );
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  }

  async function handleResendInvite(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccessInfo("");

    const targetEmail = normalizeEmail(inviteEmail || email);
    if (!isValidEmail(targetEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Failed to resend activation link.");
        return;
      }
      setSuccessInfo(
        data.message || "If this email belongs to an invited Turf Owner, a new invitation has been sent."
      );
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  }

  const signupHref = matchIntent
    ? `/signup?matchIntent=${encodeMatchIntent(matchIntent)}${rawNextParam ? `&next=${encodeURIComponent(rawNextParam)}` : ""}`
    : (bookingIntent
      ? `/signup?bookingIntent=${encodeBookingIntent(bookingIntent)}${rawNextParam ? `&next=${encodeURIComponent(rawNextParam)}` : ""}`
      : (rawNextParam ? `/signup?next=${encodeURIComponent(rawNextParam)}` : "/signup"));

  const subtitleText =
    mode === "forgot"
      ? "Enter your email to receive password reset instructions."
      : mode === "resendInvite"
        ? "Enter your email to receive a replacement activation link."
        : matchIntent
          ? "Sign in to confirm your spot in the match."
          : (bookingIntent ? "Sign in to complete your booking." : "Sign in and book your next game.");

  const titleText =
    mode === "forgot"
      ? "Reset Password"
      : mode === "resendInvite"
        ? "Owner Activation"
        : "Welcome back";

  return (
    <AuthShell
      title={titleText}
      subtitle={subtitleText}
    >
      {matchIntent && mode === "login" && (
        <div
          role="status"
          style={{
            background: "rgba(14, 165, 233, 0.12)",
            border: "1px solid rgba(14, 165, 233, 0.35)",
            borderRadius: 12,
            padding: "11px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(14, 165, 233, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SportIcon sport={matchIntent.sport} size={18} color="#38BDF8" />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-body)" }}>
              Resuming game participation
            </div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2, fontFamily: "var(--font-body)" }}>
              {matchIntent.sport} match at {matchIntent.turfName} · {matchIntent.date} at {matchIntent.time}
            </div>
          </div>
        </div>
      )}

      {bookingIntent && !matchIntent && mode === "login" && (
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
            gap: 12,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(200, 245, 66, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calendar size={18} color={V.flood} />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-body)" }}>
              Resuming your booking
            </div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2, fontFamily: "var(--font-body)" }}>
              {bookingIntent.turfName || "Selected pitch"} · {bookingIntent.bookingDate} at {bookingIntent.timeLabel || bookingIntent.startTime}
            </div>
          </div>
        </div>
      )}

      {error && <div role="alert" style={{ ...errorStyle, marginBottom: 16 }}>{error}</div>}
      {successInfo && <div role="status" style={{ ...successStyle, marginBottom: 16, textAlign: "center" }}>{successInfo}</div>}

      {/* Mode 1: Standard Login Form */}
      {mode === "login" && (
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#172B4D" }}>Email address</label>
            <input
              type="email"
              aria-label="Email address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#172B4D" }}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                aria-label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  ...inputStyle,
                  width: "100%",
                  boxSizing: "border-box",
                  paddingRight: password.length > 0 ? 44 : (inputStyle.paddingRight || 15),
                }}
              />
              {password.length > 0 && (
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 8,
                    color: "#718096",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessInfo("");
                setResetEmail(email);
                setMode("forgot");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#1769E8",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{
              ...buttonStyle,
              background: "#C8F542",
              color: "#111C2E",
              fontWeight: 800,
              fontSize: 15,
              padding: "14px",
              borderRadius: 12,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "progress" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "none",
            }}
          >
            {loading ? (
              "Signing in…"
            ) : bookingIntent ? (
              <>
                <span>Sign in & Continue Booking</span>
                <ArrowRight size={16} />
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      )}

      {/* Mode 2: Forgot Password Form */}
      {mode === "forgot" && (
        <form onSubmit={handleResetPassword} style={{ display: "grid", gap: 14 }}>
          <input
            type="email"
            aria-label="Email address"
            placeholder="Enter your registered email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #158051, #0EA5E9)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Sending instructions…" : "Send Password Reset Link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccessInfo("");
              setMode("login");
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            ← Back to Sign In
          </button>
        </form>
      )}

      {/* Mode 3: Resend Owner Activation Link */}
      {mode === "resendInvite" && (
        <form onSubmit={handleResendInvite} style={{ display: "grid", gap: 14 }}>
          <input
            type="email"
            aria-label="Owner email address"
            placeholder="Enter your owner email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #158051, #0EA5E9)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Sending activation link…" : "Resend Owner Activation Link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccessInfo("");
              setMode("login");
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            ← Back to Sign In
          </button>
        </form>
      )}

      {/* Bottom Guidance */}
      {mode === "login" && (
        <div style={{ marginTop: 22, textAlign: "center", display: "grid", gap: 10 }}>
          <p style={{ color: V.chalkDim, fontSize: 13.5, margin: 0, fontFamily: "var(--font-body)" }}>
            New here?{" "}
            <Link href={signupHref} style={linkStyle}>
              Create your account
            </Link>
          </p>
          <div style={{ color: V.chalkFaint, fontSize: 12.5, margin: 0, fontFamily: "var(--font-body)" }}>
            Invited turf owner?{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessInfo("");
                setInviteEmail(email);
                setMode("resendInvite");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#1769E8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Need a new activation link?
            </button>
          </div>
        </div>
      )}
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

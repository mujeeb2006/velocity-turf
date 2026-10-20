"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword } from "@/lib/auth/validation";
import AuthShell from "@/app/auth-shell";
import {
  inputStyle,
  buttonStyle,
  errorStyle,
  successStyle,
  linkStyle,
} from "@/app/auth-styles";
import { COLORS as V, FONT_BODY } from "@/lib/design-tokens";

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Status can be: 'verifying' | 'ready' | 'submitting' | 'success' | 'invalid' | 'error'
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function checkInvitation() {
      // 1. Check for URL query param errors (e.g. from Supabase verify redirect)
      const queryError = searchParams?.get("error");
      const queryErrorDesc = searchParams?.get("error_description");
      if (queryError) {
        if (!isMounted) return;
        setStatus("invalid");
        setErrorMessage(
          queryErrorDesc || queryError || "This invitation link is invalid or has expired."
        );
        return;
      }

      // 2. Check for hash fragment errors or implicit tokens (e.g. #error=access_denied or #access_token=...)
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get("error");
        const hashErrorDesc = hashParams.get("error_description");
        if (hashError) {
          if (!isMounted) return;
          setStatus("invalid");
          setErrorMessage(
            hashErrorDesc || hashError || "This invitation link is invalid or has expired."
          );
          return;
        }

        // Implicit flow fallback: establish session from hash tokens
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (error) {
              console.warn("Failed to set session from hash fragment:", error);
            } else if (data?.user) {
              if (!isMounted) return;
              setUserEmail(data.user.email || "");
              setStatus("ready");
              return;
            }
          } catch (e) {
            console.warn("Error processing hash token:", e);
          }
        }
      }

      // 3. Check for existing active session (PKCE or server-established cookies)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          if (!isMounted) return;
          setUserEmail(session.user.email || "");
          setStatus("ready");
          return;
        }

        // Listen for async auth state change (e.g. when cookies load or token refreshes)
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (newSession?.user && isMounted) {
              setUserEmail(newSession.user.email || "");
              setStatus("ready");
            }
          }
        );

        // Give a grace window for async session establishment
        const timer = setTimeout(async () => {
          if (!isMounted) return;
          const { data: freshSession } = await supabase.auth.getSession();
          if (freshSession?.session?.user) {
            setUserEmail(freshSession.session.user.email || "");
            setStatus("ready");
          } else {
            setStatus("invalid");
            setErrorMessage(
              "No active invitation session found. Please open the link directly from your invitation email or contact your administrator."
            );
          }
        }, 1200);

        return () => {
          clearTimeout(timer);
          authListener?.subscription?.unsubscribe();
        };
      } catch (err) {
        if (!isMounted) return;
        setStatus("invalid");
        setErrorMessage(
          "Could not verify your invitation. Please check your connection or request a replacement invitation."
        );
      }
    }

    checkInvitation();

    return () => {
      isMounted = false;
    };
  }, [searchParams, supabase]);

  async function handleSetPassword(e) {
    e.preventDefault();
    setErrorMessage("");

    if (!isStrongPassword(password)) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    setStatus("submitting");

    try {
      // 1. Update the password on the authenticated invitation session
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setStatus("error");
        setErrorMessage(updateError.message || "Failed to update your password. Please try again.");
        return;
      }

      // 2. Finalize server-side role confirmation and profile activation
      const response = await fetch("/api/auth/complete-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Server confirmation notice:", errorData.error);
      }

      setStatus("success");

      // Smooth transition into the Owner Dashboard
      setTimeout(() => {
        window.location.href = "/owner";
      }, 1600);
    } catch (err) {
      console.error("Failed to complete password setup:", err);
      setStatus("error");
      setErrorMessage(
        "A network or server error occurred while activating your account. Please try again."
      );
    }
  }

  // --- RENDER STATES ---

  // 1. Verifying State
  if (status === "verifying") {
    return (
      <AuthShell
        title="Validating your invitation"
        subtitle="Verifying your secure invitation and preparing your workspace…"
      >
        <div style={{ textAlign: "center", padding: "32px 12px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 18px",
              borderRadius: "50%",
              border: `3px solid rgba(14, 165, 233, 0.2)`,
              borderTopColor: "#0EA5E9",
              animation: "spin 0.85s linear infinite",
            }}
          />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 13.5,
              fontFamily: FONT_BODY,
            }}
          >
            Establishing authenticated owner session…
          </p>
        </div>
      </AuthShell>
    );
  }

  // 2. Invalid or Expired Invitation
  if (status === "invalid") {
    return (
      <AuthShell
        title="Invitation Expired or Invalid"
        subtitle="We could not verify this invitation link."
      >
        <div
          role="alert"
          style={{
            ...errorStyle,
            marginBottom: 20,
            lineHeight: 1.55,
            padding: "14px 16px",
            fontSize: 13.5,
          }}
        >
          {errorMessage ||
            "This invitation link is invalid, expired, or has already been used."}
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 24,
            textAlign: "center",
            fontFamily: FONT_BODY,
          }}
        >
          For security, invitation links are single-use and expire within 24 hours.
          Please contact your Velocity Turf platform administrator to issue a fresh invitation link.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <Link
            href="/login"
            style={{
              ...buttonStyle,
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            Go to Sign In
          </Link>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
              textAlign: "center",
              marginTop: 4,
              fontFamily: FONT_BODY,
            }}
          >
            Need help? Reach out to support or your system administrator.
          </p>
        </div>
      </AuthShell>
    );
  }

  // 3. Success State
  if (status === "success") {
    return (
      <AuthShell
        title="Account Activated!"
        subtitle="Your turf owner account is ready."
      >
        <div
          role="status"
          style={{
            ...successStyle,
            marginBottom: 24,
            padding: "20px 16px",
            textAlign: "center",
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8, color: "#22C55E" }}>✓</div>
          <strong style={{ fontSize: 16 }}>Welcome to Velocity Turf!</strong>
          <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: 13 }}>
            Your password has been securely saved. Redirecting to your Owner Dashboard…
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/owner";
          }}
          style={{
            ...buttonStyle,
            width: "100%",
            background: "linear-gradient(135deg, #158051, #0EA5E9)",
          }}
        >
          Enter Owner Dashboard →
        </button>
      </AuthShell>
    );
  }

  // 4. Setup Form State (ready, submitting, error)
  return (
    <AuthShell
      title="Set Up Your Owner Account"
      subtitle="Create your password to activate your owner workspace and manage your turfs."
    >
      {userEmail && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(14,165,233,0.1)",
            border: "1px solid rgba(14,165,233,0.25)",
            padding: "7px 14px",
            borderRadius: 20,
            fontSize: 13,
            color: "#38BDF8",
            margin: "0 auto 18px",
            width: "100%",
            boxSizing: "border-box",
            justifyContent: "center",
            fontFamily: FONT_BODY,
          }}
        >
          <span>👤</span>
          <span>Owner account: <strong>{userEmail}</strong></span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            ...errorStyle,
            marginBottom: 16,
            lineHeight: 1.5,
            fontSize: 13,
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSetPassword} style={{ display: "grid", gap: 15 }}>
        {/* New Password */}
        <div style={{ display: "grid", gap: 6 }}>
          <label
            htmlFor="setup-owner-password"
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              fontFamily: FONT_BODY,
              fontWeight: 600,
            }}
          >
            New Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="setup-owner-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
                paddingRight: 56,
              }}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 8px",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ display: "grid", gap: 6 }}>
          <label
            htmlFor="setup-owner-confirm-password"
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              fontFamily: FONT_BODY,
              fontWeight: 600,
            }}
          >
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="setup-owner-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
                paddingRight: 56,
              }}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 8px",
              }}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Validation indicators */}
        <div style={{ display: "grid", gap: 4, marginTop: 2 }}>
          {password.length > 0 && (
            <div
              style={{
                fontSize: 12,
                color: isStrongPassword(password) ? "#22C55E" : "rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: FONT_BODY,
              }}
            >
              <span>{isStrongPassword(password) ? "✓" : "○"}</span>
              <span>At least 8 characters</span>
            </div>
          )}
          {confirmPassword.length > 0 && (
            <div
              style={{
                fontSize: 12,
                color: password === confirmPassword ? "#22C55E" : "#EF4444",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: FONT_BODY,
              }}
            >
              <span>{password === confirmPassword ? "✓" : "✕"}</span>
              <span>{password === confirmPassword ? "Passwords match" : "Passwords do not match"}</span>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            ...buttonStyle,
            width: "100%",
            marginTop: 6,
            cursor: status === "submitting" ? "not-allowed" : "pointer",
            opacity: status === "submitting" ? 0.7 : 1,
            background: "linear-gradient(135deg, #158051, #0EA5E9)",
          }}
        >
          {status === "submitting"
            ? "Activating account…"
            : "Activate Account & Enter Dashboard"}
        </button>
      </form>

      {status === "error" && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setStatus("ready")}
            style={{
              background: "none",
              border: "none",
              color: "#38BDF8",
              cursor: "pointer",
              fontSize: 13,
              textDecoration: "underline",
            }}
          >
            Try submitting again
          </button>
        </div>
      )}

      <p
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 12.5,
          marginTop: 22,
          textAlign: "center",
          fontFamily: FONT_BODY,
        }}
      >
        Already set your password?{" "}
        <Link href="/login" style={linkStyle}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          title="Validating your invitation"
          subtitle="Verifying your secure invitation and preparing your workspace…"
        >
          <div style={{ textAlign: "center", padding: "30px 10px", color: "rgba(255,255,255,0.7)" }}>
            Loading…
          </div>
        </AuthShell>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  );
}

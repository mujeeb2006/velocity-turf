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

function SetPasswordForm() {
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
          queryErrorDesc || queryError || "This invitation is invalid or expired."
        );
        return;
      }

      // 2. Check for hash fragment errors (e.g. #error=access_denied&error_code=otp_expired)
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get("error");
        const hashErrorDesc = hashParams.get("error_description");
        if (hashError) {
          if (!isMounted) return;
          setStatus("invalid");
          setErrorMessage(
            hashErrorDesc || hashError || "This invitation is invalid or expired."
          );
          return;
        }

        // Check if access_token exists in hash (implicit flow fallback)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (error) {
              console.warn("Failed to set session from hash:", error);
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

      // 3. Check for existing active session (PKCE or existing cookies)
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          if (!isMounted) return;
          setUserEmail(session.user.email || "");
          setStatus("ready");
          return;
        }

        // Also listen to onAuthStateChange in case session is being processed asynchronously
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (newSession?.user && isMounted) {
              setUserEmail(newSession.user.email || "");
              setStatus("ready");
            }
          }
        );

        // Give a short grace period (1.2s) for async PKCE / token processing
        const timer = setTimeout(async () => {
          if (!isMounted) return;
          const { data: freshSession } = await supabase.auth.getSession();
          if (freshSession?.session?.user) {
            setUserEmail(freshSession.session.user.email || "");
            setStatus("ready");
          } else {
            setStatus("invalid");
            setErrorMessage(
              "This invitation is invalid or expired. Please ask the administrator to send a new invitation."
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
          "Could not verify your invitation. Please check your connection or request a new invitation."
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
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    setStatus("submitting");

    try {
      // 1. Update the password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setStatus("error");
        setErrorMessage(updateError.message || "Failed to set your password.");
        return;
      }

      // 2. Finalize server-side activation and role assignment
      const response = await fetch("/api/auth/complete-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If password was already updated, log warning but don't hard-fail if profile is active
        console.warn("Server confirmation notice:", errorData.error);
      }

      setStatus("success");

      // Auto redirect to owner dashboard after a short celebratory moment
      setTimeout(() => {
        window.location.href = "/owner";
      }, 1800);
    } catch (err) {
      console.error("Failed to set password:", err);
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
        subtitle="Verifying your secure link and preparing your owner workspace…"
      >
        <div style={{ textAlign: "center", padding: "30px 10px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 20px",
              borderRadius: "50%",
              border: `3px solid rgba(14, 165, 233, 0.2)`,
              borderTopColor: "#0EA5E9",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <style>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
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
        title="Invalid or expired invitation"
        subtitle="We could not verify your invitation link."
      >
        <div
          role="alert"
          style={{
            ...errorStyle,
            marginBottom: 20,
            lineHeight: 1.5,
            padding: "14px 16px",
          }}
        >
          {errorMessage ||
            "This invitation is invalid or expired. Please ask the administrator to send a new invitation."}
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 24,
            textAlign: "center",
            fontFamily: FONT_BODY,
          }}
        >
          Invitation links can only be used once and expire after 24 hours. Contact
          your platform administrator to issue a fresh invite to your email.
        </p>

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
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  // 3. Success State
  if (status === "success") {
    return (
      <AuthShell
        title="Account activated!"
        subtitle="Your owner account has been activated successfully."
      >
        <div
          role="status"
          style={{
            ...successStyle,
            marginBottom: 24,
            padding: "16px",
            textAlign: "center",
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
          <strong>Welcome to Velocity Turf!</strong>
          <p style={{ margin: "6px 0 0", opacity: 0.9 }}>
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
          Go to Owner Dashboard →
        </button>
      </AuthShell>
    );
  }

  // 4. Password Setup Form (ready, submitting, error)
  return (
    <AuthShell
      title="Create your password"
      subtitle="Create your owner account password to activate your access."
    >
      {userEmail && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(14,165,233,0.12)",
            border: "1px solid rgba(14,165,233,0.3)",
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 12.5,
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
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSetPassword} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label
            htmlFor="owner-password"
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 13,
              fontFamily: FONT_BODY,
              fontWeight: 600,
            }}
          >
            New Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="owner-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
                paddingRight: 44,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                padding: 4,
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label
            htmlFor="owner-confirm-password"
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 13,
              fontFamily: FONT_BODY,
              fontWeight: 600,
            }}
          >
            Confirm Password
          </label>
          <input
            id="owner-confirm-password"
            type={showPassword ? "text" : "password"}
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
            }}
          />
        </div>

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
            <span>At least 8 characters long</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            ...buttonStyle,
            width: "100%",
            marginTop: 8,
            cursor: status === "submitting" ? "not-allowed" : "pointer",
            opacity: status === "submitting" ? 0.7 : 1,
          }}
        >
          {status === "submitting"
            ? "Activating account…"
            : "Activate account & enter dashboard"}
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
          color: "rgba(255,255,255,0.4)",
          fontSize: 12.5,
          marginTop: 22,
          textAlign: "center",
          fontFamily: FONT_BODY,
        }}
      >
        Already have an active account?{" "}
        <Link href="/login" style={linkStyle}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          title="Validating your invitation"
          subtitle="Verifying your secure link and preparing your owner workspace…"
        >
          <div style={{ textAlign: "center", padding: "30px 10px", color: "rgba(255,255,255,0.7)" }}>
            Loading…
          </div>
        </AuthShell>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}


"use client";

import { useEffect } from "react";
import { COLORS as V } from "@/lib/design-tokens";

export default function GlobalErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("[VelocityTurf App Error Caught]:", error);
  }, [error]);

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected application error occurred.";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: V.pitchDark,
        color: V.chalk,
        fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        role="alert"
        style={{
          background: V.pitchCardRaised,
          border: `1px solid ${V.lineStrong}`,
          borderRadius: 20,
          padding: "40px 32px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            color: V.danger,
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          !
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 10px",
            color: V.chalk,
            letterSpacing: -0.3,
          }}
        >
          Application Error
        </h1>

        <p
          style={{
            fontSize: 14,
            color: V.chalkDim,
            lineHeight: 1.5,
            margin: "0 0 24px",
            wordBreak: "break-word",
          }}
        >
          Velocity Turf encountered an issue while rendering this view. Your session and account data are intact.
        </p>

        {process.env.NODE_ENV !== "production" && (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: `1px solid ${V.line}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12,
              color: V.chalkFaint,
              textAlign: "left",
              fontFamily: "monospace",
              marginBottom: 20,
              maxHeight: 120,
              overflowY: "auto",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: V.flood,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            style={{
              background: "transparent",
              color: V.chalkDim,
              border: `1px solid ${V.line}`,
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

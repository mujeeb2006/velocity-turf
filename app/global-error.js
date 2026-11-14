"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[VelocityTurf Fatal Root Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#0c1316",
          color: "#f5f8fa",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 440,
            padding: 32,
            textAlign: "center",
            background: "#131c20",
            border: "1px solid #233138",
            borderRadius: 16,
          }}
        >
          <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>System Temporarily Unavailable</h2>
          <p style={{ fontSize: 14, color: "#8b9ea7", lineHeight: 1.5, margin: "0 0 24px" }}>
            Velocity Turf encountered an unexpected startup issue. Please try reloading.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#2ab97a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload Velocity Turf
          </button>
        </div>
      </body>
    </html>
  );
}

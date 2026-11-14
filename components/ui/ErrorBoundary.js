"use client";

import React from "react";
import { COLORS as V } from "../../lib/design-tokens.js";

/**
 * Enterprise Error Boundary component for Velocity Turf.
 * Prevents client-side application crashes from causing a blank page ("White Screen of Death").
 * Catches unhandled rendering errors in child components, logs diagnostic information,
 * and presents an on-brand, recoverable fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[VelocityTurf ErrorBoundary] Component tree exception:", error, errorInfo);
    this.setState({ errorInfo });
    if (typeof this.props.onError === "function") {
      try {
        this.props.onError(error, errorInfo);
      } catch (err) {
        console.warn("ErrorBoundary onError callback failed:", err);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onReset === "function") {
      try {
        this.props.onReset();
      } catch (err) {
        console.warn("ErrorBoundary onReset callback failed:", err);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback({ error: this.state.error, reset: this.handleReset });
        }
        return this.props.fallback;
      }

      const errorMessage =
        this.state.error instanceof Error
          ? this.state.error.message
          : typeof this.state.error === "string"
            ? this.state.error
            : "An unexpected error occurred in this view.";

      const isCompact = Boolean(this.props.compact);

      return React.createElement(
        "div",
        {
          role: "alert",
          style: {
            background: "rgba(239, 68, 68, 0.05)",
            border: `1px solid ${V.danger}44`,
            borderRadius: isCompact ? 12 : 16,
            padding: isCompact ? "16px 20px" : "32px 24px",
            textAlign: "center",
            margin: isCompact ? "12px 0" : "24px 0",
            maxWidth: isCompact ? 500 : 640,
            marginLeft: "auto",
            marginRight: "auto",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              width: isCompact ? 36 : 48,
              height: isCompact ? 36 : 48,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: V.danger,
              fontSize: isCompact ? 18 : 22,
              fontWeight: 800,
            },
          },
          "!"
        ),
        React.createElement(
          "h3",
          {
            style: {
              color: V.chalk,
              fontSize: isCompact ? 15 : 17,
              fontWeight: 700,
              margin: "0 0 6px",
              fontFamily: "inherit",
            },
          },
          this.props.title || "This section encountered an unexpected issue"
        ),
        React.createElement(
          "p",
          {
            style: {
              color: V.chalkDim,
              fontSize: isCompact ? 12.5 : 13.5,
              margin: "0 auto 18px",
              maxWidth: 480,
              lineHeight: 1.5,
              wordBreak: "break-word",
            },
          },
          errorMessage
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: this.handleReset,
              style: {
                background: V.flood,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              },
            },
            "Try reloading this section"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                if (typeof window !== "undefined") window.location.reload();
              },
              style: {
                background: "transparent",
                color: V.chalkDim,
                border: `1px solid ${V.line}`,
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              },
            },
            "Reload page"
          )
        )
      );
    }

    return this.props.children;
  }
}

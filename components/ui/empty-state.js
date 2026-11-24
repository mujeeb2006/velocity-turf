"use client";

// Shared "nothing here yet" panel. Used instead of bare text so every
// empty list (no requests, no disputes, no search results, etc.) looks
// consistent across Player / Owner / Admin.

import React from "react";
import { COLORS as V } from "@/lib/design-tokens";
import { Icon } from "@/components/ui/icons";

export function EmptyState({ icon = "inbox", title, subtitle, action, accent = "#0EA5E9", compact = false, style = {} }) {
  const renderedIcon = React.isValidElement(icon) ? (
    icon
  ) : (
    <Icon name={icon} emoji={typeof icon === "string" ? icon : undefined} size={compact ? 22 : 26} color={accent} />
  );

  return (
    <div
      style={{
        background: V.pitchCard,
        border: `1px solid ${V.line}`,
        borderRadius: compact ? 12 : 16,
        padding: compact ? "28px 20px" : "44px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: compact ? 5 : 6,
        ...style,
      }}
    >
      <div
        style={{
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: "50%",
          background: accent + "14",
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: compact ? 6 : 10,
          color: accent,
        }}
      >
        {renderedIcon}
      </div>
      <div style={{ color: V.chalk, fontWeight: 800, fontSize: compact ? 15 : 16, fontFamily: "var(--font-body)" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ color: V.chalkDim, fontSize: compact ? 12.5 : 13, maxWidth: compact ? 480 : 340, lineHeight: 1.45 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: compact ? 10 : 12 }}>{action}</div>}
    </div>
  );
}

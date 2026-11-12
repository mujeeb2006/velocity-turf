"use client";

// Shared "nothing here yet" panel. Used instead of bare text so every
// empty list (no requests, no disputes, no search results, etc.) looks
// consistent across Player / Owner / Admin.

import React from "react";
import { COLORS as V } from "@/lib/design-tokens";
import { Icon } from "@/components/ui/icons";

export function EmptyState({ icon = "inbox", title, subtitle, action, accent = "#0EA5E9" }) {
  const renderedIcon = React.isValidElement(icon) ? (
    icon
  ) : (
    <Icon name={icon} emoji={typeof icon === "string" ? icon : undefined} size={26} color={accent} />
  );

  return (
    <div
      style={{
        background: V.pitchCard,
        border: `1px solid ${V.line}`,
        borderRadius: 16,
        padding: "44px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: accent + "14",
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
          color: accent,
        }}
      >
        {renderedIcon}
      </div>
      <div style={{ color: V.chalk, fontWeight: 800, fontSize: 16, fontFamily: "'Manrope', sans-serif" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ color: V.chalkDim, fontSize: 13, maxWidth: 340, lineHeight: 1.5 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// Shared "nothing here yet" panel. Used instead of bare text so every
// empty list (no requests, no disputes, no search results, etc.) looks
// consistent across Player / Owner / Admin.

import { COLORS as V } from "@/lib/design-tokens";

export function EmptyState({ icon = "📭", title, subtitle, action, accent = "#0EA5E9" }) {
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
          fontSize: 24,
          marginBottom: 10,
        }}
      >
        {icon}
      </div>
      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 15.5, fontFamily: "'Exo 2', sans-serif" }}>
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

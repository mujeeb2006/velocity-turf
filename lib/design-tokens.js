// Design identity: "floodlit night match" — deep pitch-side surfaces with
// distinct stadium-light accents for navigation, activity, and status.

export const COLORS = {
  // Light premium baseline for the app, with green as the accent.
  pitch: "#F4F7F2",
  pitchCard: "#FFFFFF",
  pitchCardRaised: "#F7F9F6",
  line: "rgba(17,24,39,0.08)",
  lineStrong: "rgba(17,24,39,0.16)",

  // Text
  chalk: "#162128",
  chalkDim: "rgba(22, 33, 40, 0.72)",
  chalkFaint: "rgba(22, 33, 40, 0.64)",

  // Brand anchor and supporting accent colors.
  flood: "#1B9E66",
  floodButton: "#158051", // High contrast (4.75:1 on #ffffff) for primary filled buttons
  floodDim: "rgba(27, 158, 102, 0.12)",
  aqua: "#16A38B",
  sky: "#2563EB",
  coral: "#EA580C",
  violet: "#7C3AED",

  // Semantic status colors with WCAG compliant contrast
  confirmed: "#158051",
  pending: "#B45309",
  danger: "#DC2626",
  info: "#1D4ED8",
  declined: "#DC2626",
  cancelled: "#4B5563",
  completed: "#047857",
  refunded: "#6D28D9",
};

export const NAV_ACCENTS = [COLORS.flood, COLORS.aqua, COLORS.sky, COLORS.coral, COLORS.violet];

export const FONT_DISPLAY = "'Barlow Condensed', sans-serif";  // headlines, big numbers, scores
export const FONT_BODY = "'Manrope', sans-serif";         // everything else
export const FONT_DATA = "'Space Mono', monospace";       // prices, timers, tabular data only

// Card treatment: a hairline border on a slightly-raised panel, no soft
// grey box-shadow (that's the generic SaaS tell). Glow is reserved for
// the accent only, applied deliberately, not on every hover.
export function panel(raised = false) {
  return {
    background: raised ? COLORS.pitchCardRaised : COLORS.pitchCard,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 14,
  };
}

export function floodGlow(strength = 0.25) {
  return `0 0 40px rgba(27,158,102,${strength})`;
}

// Three semantic button kinds — primary (filled, high emphasis), secondary
// (outlined), icon (square, icon-only) — at three sizes. Minimum 44px
// touch target height on md and lg sizes for mobile accessibility.
export const BUTTON_SIZES = {
  sm: { padding: "8px 14px", fontSize: 13, radius: 8, minHeight: 36 },
  md: { padding: "12px 20px", fontSize: 14, radius: 10, minHeight: 44 },
  lg: { padding: "14px 26px", fontSize: 15, radius: 12, minHeight: 48 },
};

export function buttonStyle(variant = "primary", size = "md", disabled = false) {
  const s = BUTTON_SIZES[size] || BUTTON_SIZES.md;
  const base = {
    padding: s.padding,
    fontSize: s.fontSize,
    borderRadius: s.radius,
    minHeight: s.minHeight,
    fontWeight: 700,
    fontFamily: FONT_BODY,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "background 0.2s, opacity 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    boxSizing: "border-box",
  };
  if (variant === "primary") {
    return { ...base, background: COLORS.floodButton, color: "#ffffff", border: "1px solid transparent" };
  }
  if (variant === "secondary") {
    return { ...base, background: COLORS.pitchCard, color: COLORS.chalk, border: `1px solid ${COLORS.lineStrong}` };
  }
  if (variant === "danger") {
    return { ...base, background: "rgba(220, 38, 38, 0.08)", color: COLORS.danger, border: "1px solid rgba(220, 38, 38, 0.28)" };
  }
  if (variant === "ghost") {
    return { ...base, background: "transparent", color: COLORS.chalkDim, border: "1px solid transparent" };
  }
  // icon: square, icon-only
  return {
    ...base,
    background: COLORS.pitchCard,
    color: COLORS.chalk,
    border: `1px solid ${COLORS.lineStrong}`,
    padding: 0,
    width: s.minHeight,
    height: s.minHeight,
  };
}

export function statusBadge(status) {
  const norm = String(status || "").toLowerCase();
  const config = {
    confirmed: { color: COLORS.confirmed, bg: "rgba(21, 128, 81, 0.1)", label: "Confirmed", glyph: "✓" },
    completed: { color: COLORS.completed, bg: "rgba(4, 120, 87, 0.1)", label: "Completed", glyph: "✓" },
    pending: { color: COLORS.pending, bg: "rgba(180, 83, 9, 0.1)", label: "Awaiting Confirmation", glyph: "⏳" },
    declined: { color: COLORS.declined, bg: "rgba(220, 38, 38, 0.1)", label: "Declined", glyph: "✕" },
    rejected: { color: COLORS.declined, bg: "rgba(220, 38, 38, 0.1)", label: "Rejected", glyph: "✕" },
    cancelled: { color: COLORS.cancelled, bg: "rgba(75, 85, 99, 0.1)", label: "Cancelled", glyph: "—" },
    refunded: { color: COLORS.refunded, bg: "rgba(109, 40, 217, 0.1)", label: "Refunded", glyph: "↩" },
    processing: { color: COLORS.pending, bg: "rgba(180, 83, 9, 0.1)", label: "Processing", glyph: "⏳" },
    live: { color: COLORS.confirmed, bg: "rgba(21, 128, 81, 0.1)", label: "Live", glyph: "●" },
  }[norm] || { color: COLORS.chalkDim, bg: "rgba(22, 33, 40, 0.08)", label: status || "Unknown", glyph: "•" };

  return config;
}

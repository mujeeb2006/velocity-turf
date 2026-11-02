// Design identity: Vibrant, colourful, energetic sports-tech platform.
// Primary sky blue: #18A8E0, Electric blue: #1769E8, Cyan: #48D6E8, Lime green: #C8F542
// Light blue: #EAF7FF, Soft mint: #E9F9ED, White: #FFFFFF, Main text: #172B4D, Secondary text: #718096, Light grey: #F4F7FA

export const VIBRANT_PALETTE = {
  primaryBlue: "#1769E8",
  skyBlue: "#18A8E0",
  cyan: "#48D6E8",
  limeGreen: "#C8F542",
  lightBlue: "#EAF7FF",
  softMint: "#E9F9ED",
  lightLavender: "#F1EEFF",
  lightOrange: "#FFF2E5",
  white: "#FFFFFF",
  mainText: "#172B4D",
  secondaryText: "#718096",
  border: "#E5EDF5",
  lightGrey: "#F4F7FA",
};

export const SAAS_PALETTE = VIBRANT_PALETTE;

export const COLORS = {
  // Vibrant Canvas Baseline (No Dark Mode)
  pitch: "#FFFFFF",
  pitchCard: "#FFFFFF",
  pitchCardRaised: "#F4F7FA",
  lightBlue: "#EAF7FF",
  softMint: "#E9F9ED",
  lightLavender: "#F1EEFF",
  lightOrange: "#FFF2E5",
  lightGrey: "#F4F7FA",
  white: "#FFFFFF",
  line: "#E5EDF5",
  lineStrong: "rgba(23, 105, 232, 0.22)",

  // Typography
  chalk: "#172B4D",
  chalkDim: "#718096",
  chalkFaint: "rgba(113, 128, 150, 0.75)",

  // Brand Accents
  flood: "#C8F542", // Lime green
  floodButton: "#C8F542", // Dark text #172B4D on lime green
  floodDim: "rgba(200, 245, 66, 0.25)",
  aqua: "#48D6E8", // Cyan
  sky: "#18A8E0",  // Primary sky blue
  electric: "#1769E8", // Electric blue
  coral: "#FF5E36",
  violet: "#7C3AED",

  // Status Colors
  confirmed: "#10B981",
  pending: "#F59E0B",
  danger: "#EF4444",
  info: "#18A8E0",
  declined: "#EF4444",
  cancelled: "#718096",
  completed: "#10B981",
  refunded: "#7C3AED",
};

export const SUPERHERO_TOKENS = {
  skyBlue: "#18A8E0",
  electricBlue: "#1769E8",
  cyan: "#48D6E8",
  limeGreen: "#C8F542",
  lightBlue: "#EAF7FF",
  softMint: "#E9F9ED",
  lightLavender: "#F1EEFF",
  lightOrange: "#FFF2E5",
  white: "#FFFFFF",
  mainText: "#172B4D",
  secondaryText: "#718096",
  border: "#E5EDF5",
  heroGradient: "linear-gradient(135deg, #18A8E0 0%, #1769E8 100%)",
};

export const NAV_ACCENTS = [COLORS.flood, COLORS.aqua, COLORS.sky, COLORS.coral, COLORS.violet];

export const FONT_DISPLAY = "'Barlow Condensed', sans-serif";  // headlines, big numbers, scores
export const FONT_BODY = "'Manrope', sans-serif";         // everything else
export const FONT_DATA = "'Space Mono', monospace";       // prices, timers, tabular data only

// Card treatment: clean light card with soft shadow and subtle border
export function panel(raised = false) {
  return {
    background: raised ? "#F4F7FA" : "#FFFFFF",
    border: "1px solid #E5EDF5",
    borderRadius: 16,
    boxShadow: raised
      ? "0 12px 28px rgba(23, 105, 232, 0.09), 0 2px 6px rgba(0, 0, 0, 0.04)"
      : "0 4px 16px rgba(23, 105, 232, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)",
  };
}

export function floodGlow(strength = 0.35) {
  return `0 0 25px rgba(200, 245, 66, ${strength}), 0 0 10px rgba(72, 214, 232, ${strength * 0.5})`;
}

// Three semantic button kinds — primary (lime green with dark text), secondary
// (clean white with border), icon (square, styled) — with touch accessibility.
export const BUTTON_SIZES = {
  sm: { padding: "8px 16px", fontSize: 13, radius: 8, minHeight: 36 },
  md: { padding: "12px 22px", fontSize: 14, radius: 10, minHeight: 44 },
  lg: { padding: "14px 28px", fontSize: 15, radius: 12, minHeight: 48 },
};

export function buttonStyle(variant = "primary", size = "md", disabled = false) {
  const s = BUTTON_SIZES[size] || BUTTON_SIZES.md;
  const base = {
    padding: s.padding,
    fontSize: s.fontSize,
    borderRadius: s.radius,
    minHeight: s.minHeight,
    fontWeight: 800,
    fontFamily: FONT_BODY,
    letterSpacing: "0.02em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "background 0.2s, opacity 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    boxSizing: "border-box",
  };
  if (variant === "primary") {
    return {
      ...base,
      background: COLORS.floodButton,
      color: "#172B4D",
      border: "none",
      boxShadow: disabled ? "none" : "0 4px 14px rgba(200, 245, 66, 0.45)",
    };
  }
  if (variant === "secondary") {
    return {
      ...base,
      background: "#FFFFFF",
      color: COLORS.chalk,
      border: "1px solid #E5EDF5",
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      background: "#FFF2F2",
      color: "#EF4444",
      border: "1px solid rgba(239, 68, 68, 0.25)",
      boxShadow: "none",
    };
  }
  if (variant === "ghost") {
    return {
      ...base,
      background: "transparent",
      color: COLORS.chalkDim,
      border: "1px solid transparent",
    };
  }
  // icon: square, icon-only
  return {
    ...base,
    background: "#FFFFFF",
    color: COLORS.chalk,
    border: "1px solid #E5EDF5",
    padding: 0,
    width: s.minHeight,
    height: s.minHeight,
  };
}

export function statusBadge(status) {
  const norm = String(status || "").toLowerCase();
  const config = {
    confirmed: { color: COLORS.confirmed, bg: "rgba(34, 197, 94, 0.14)", label: "Confirmed", glyph: "✓" },
    completed: { color: COLORS.completed, bg: "rgba(16, 185, 129, 0.14)", label: "Completed", glyph: "✓" },
    pending: { color: COLORS.pending, bg: "rgba(245, 158, 11, 0.14)", label: "Awaiting Confirmation", glyph: "⏳" },
    declined: { color: COLORS.declined, bg: "rgba(239, 68, 68, 0.14)", label: "Declined", glyph: "✕" },
    rejected: { color: COLORS.declined, bg: "rgba(239, 68, 68, 0.14)", label: "Rejected", glyph: "✕" },
    cancelled: { color: COLORS.cancelled, bg: "rgba(100, 116, 139, 0.16)", label: "Cancelled", glyph: "—" },
    refunded: { color: COLORS.refunded, bg: "rgba(168, 85, 247, 0.16)", label: "Refunded", glyph: "↩" },
    processing: { color: COLORS.pending, bg: "rgba(245, 158, 11, 0.14)", label: "Processing", glyph: "⏳" },
    live: { color: COLORS.flood, bg: "rgba(204, 255, 0, 0.14)", label: "Live", glyph: "●" },
  }[norm] || { color: COLORS.chalkDim, bg: "rgba(240, 246, 252, 0.08)", label: status || "Unknown", glyph: "•" };

  return config;
}

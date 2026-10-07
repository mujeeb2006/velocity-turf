// Design identity: "floodlit night match" — deep pitch-side surfaces with
// distinct stadium-light accents for navigation, activity, and status.

export const COLORS = {
  // Light premium baseline for the app, with green as the accent.
  pitch: "#F4F7F2",
  pitchCard: "#FFFFFF",
  pitchCardRaised: "#F7F9F6",
  line: "rgba(17,24,39,0.08)",
  lineStrong: "rgba(17,24,39,0.14)",

  // Text
  chalk: "#162128",
  chalkDim: "rgba(22, 33, 40, 0.68)",
  chalkFaint: "rgba(22, 33, 40, 0.64)",

  // Brand anchor and supporting accent colors.
  flood: "#1FAE71",
  floodDim: "rgba(31, 174, 113, 0.12)",
  aqua: "#2CC8A6",
  sky: "#3D7BFF",
  coral: "#FF8A78",
  violet: "#8C6CFF",

  // Semantic status colors.
  confirmed: "#2AAE7A",
  pending: "#F0B64D",
  danger: "#E45D5D",
  info: "#5B87F5",
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
  return `0 0 40px rgba(212,255,79,${strength})`;
}

// Three semantic button kinds — primary (filled, high emphasis), secondary
// (outlined), icon (square, icon-only) — at three sizes. Every button in
// the app should route through this instead of hand-rolling padding/radius
// combinations, which is how the app drifted to 8+ distinct button styles.
export const BUTTON_SIZES = {
  sm: { padding: "8px 14px", fontSize: 12.5, radius: 8 },
  md: { padding: "12px 20px", fontSize: 13.5, radius: 10 },
  lg: { padding: "14px 26px", fontSize: 14.5, radius: 12 },
};

export function buttonStyle(variant = "primary", size = "md") {
  const s = BUTTON_SIZES[size];
  const base = {
    padding: s.padding,
    fontSize: s.fontSize,
    borderRadius: s.radius,
    fontWeight: 800,
    fontFamily: FONT_BODY,
    cursor: "pointer",
    transition: "opacity 0.2s, border-color 0.2s",
  };
  if (variant === "primary") {
    return { ...base, background: COLORS.flood, color: "#ffffff", border: "none" };
  }
  if (variant === "secondary") {
    return { ...base, background: "transparent", color: COLORS.chalk, border: `1px solid ${COLORS.line}` };
  }
  // icon: square, icon-only, no label padding
  return {
    ...base, background: "transparent", color: COLORS.chalk, border: `1px solid ${COLORS.line}`,
    padding: 0, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
  };
}

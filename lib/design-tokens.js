// Design identity: "floodlit night match" — a turf booking app should look
// and feel like standing pitch-side under stadium lights, not like generic
// SaaS. One deliberate accent (floodlight lime), a green-black night sky,
// condensed athletic display type for headlines/scores, clean body type
// for everything read at length.

export const COLORS = {
  // Base — green-black night, not neutral tech-black
  pitch: "#070D0A",
  pitchCard: "#0E1712",
  pitchCardRaised: "#121D17",
  line: "rgba(245,247,242,0.08)",
  lineStrong: "rgba(245,247,242,0.16)",

  // Text
  chalk: "#F5F7F2",
  chalkDim: "rgba(245,247,242,0.55)",
  chalkFaint: "rgba(245,247,242,0.32)",

  // The one accent — used sparingly, for the single most important thing
  // on a given screen: a primary action, a live indicator, a key number.
  flood: "#D4FF4F",
  floodDim: "rgba(212,255,79,0.12)",

  // Semantic status only — never decorative
  confirmed: "#4ADE80",
  pending: "#F5A623",
  danger: "#F0554A",
  info: "#5CA8E8",
};

export const FONT_DISPLAY = "'Bebas Neue', sans-serif";  // headlines, big numbers, scores
export const FONT_BODY = "'Manrope', sans-serif";         // everything else
export const FONT_DATA = "'JetBrains Mono', monospace";   // prices, timers, tabular data only

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

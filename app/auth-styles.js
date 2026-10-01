import { COLORS as V, FONT_BODY } from "@/lib/design-tokens";

export const inputStyle = {
  background: V.pitchCardRaised,
  border: `1px solid ${V.line}`,
  borderRadius: 12,
  padding: "12px 14px",
  color: V.chalk,
  fontSize: 14,
  fontFamily: FONT_BODY,
  outline: "none",
};

export const selectStyle = { ...inputStyle };

export const buttonStyle = {
  marginTop: 6,
  padding: "13px",
  borderRadius: 12,
  background: V.flood,
  border: "none",
  color: V.pitch,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: FONT_BODY,
};

export const errorStyle = {
  background: "rgba(240,85,74,0.1)",
  border: `1px solid ${V.danger}55`,
  color: V.danger,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: FONT_BODY,
};

export const successStyle = {
  background: V.floodDim,
  border: `1px solid ${V.flood}55`,
  color: V.flood,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: FONT_BODY,
};

export const linkStyle = {
  color: V.flood,
  fontWeight: 700,
  textDecoration: "none",
};

export const roleStyle = {
  flex: 1,
  padding: "11px",
  borderRadius: 10,
  background: "transparent",
  border: `1px solid ${V.line}`,
  color: V.chalkDim,
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: FONT_BODY,
  transition: "border-color 0.2s, color 0.2s",
};

export const roleActiveStyle = {
  ...roleStyle,
  background: V.floodDim,
  border: `1px solid ${V.flood}`,
  color: V.flood,
};

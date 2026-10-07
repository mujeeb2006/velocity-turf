import { COLORS as V, FONT_BODY } from "@/lib/design-tokens";

export const inputStyle = {
  background: "#ffffff",
  border: "1px solid rgba(17, 24, 39, 0.12)",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#172126",
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
  color: V.chalk,
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
  background: "#f7f9f5",
  border: "1px solid rgba(17, 24, 39, 0.12)",
  color: "#4b5d58",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: FONT_BODY,
  transition: "border-color 0.2s, color 0.2s",
};

export const roleActiveStyle = {
  ...roleStyle,
  background: "rgba(31, 155, 108, 0.08)",
  border: "1px solid rgba(31, 155, 108, 0.35)",
  color: "#146e4f",
};

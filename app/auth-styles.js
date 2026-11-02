import { COLORS as V, FONT_BODY } from "@/lib/design-tokens";

export const inputStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5EDF5",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#172B4D",
  fontSize: 14,
  fontFamily: FONT_BODY,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

export const selectStyle = { ...inputStyle };

export const buttonStyle = {
  marginTop: 6,
  padding: "13px",
  borderRadius: 12,
  background: "#C8F542",
  border: "none",
  color: "#172B4D",
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: FONT_BODY,
  boxShadow: "0 4px 14px rgba(200, 245, 66, 0.45)",
  transition: "transform 0.15s, box-shadow 0.2s",
};

export const errorStyle = {
  background: "#FFF2F2",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#EF4444",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: FONT_BODY,
};

export const successStyle = {
  background: "#E9F9ED",
  border: "1px solid rgba(16, 185, 129, 0.3)",
  color: "#10B981",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: FONT_BODY,
};

export const linkStyle = {
  color: "#1769E8",
  fontWeight: 800,
  textDecoration: "none",
};

export const roleStyle = {
  flex: 1,
  padding: "11px",
  borderRadius: 10,
  background: "#F4F7FA",
  border: "1px solid #E5EDF5",
  color: "#718096",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: FONT_BODY,
  transition: "border-color 0.2s, color 0.2s, background 0.2s",
};

export const roleActiveStyle = {
  ...roleStyle,
  background: "#EAF7FF",
  border: "1px solid rgba(23, 105, 232, 0.35)",
  color: "#1769E8",
};

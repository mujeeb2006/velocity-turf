// components/ui/demo-badge.js
"use client";

import { formatDemoName } from "@/lib/demo-data/dataset";
export { formatDemoName };

export function DemoBadge({ style = {} }) {
  return (
    <span
      className="vt-demo-pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: "#F1EEFF",
        color: "#1769E8",
        border: "1px solid rgba(23, 105, 232, 0.2)",
        verticalAlign: "middle",
        ...style,
      }}
    >
      Demo
    </span>
  );
}

export function DemoNameWithBadge({ name, style = {} }) {
  const { clean, isDemo } = formatDemoName(name);
  if (!isDemo) return <span style={style}>{name}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      <span>{clean}</span>
      <DemoBadge />
    </span>
  );
}

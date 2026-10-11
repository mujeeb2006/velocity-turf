import { COLORS as V } from "@/lib/design-tokens";

// Shared skeleton/shimmer primitives used while dashboard data loads.
// Keyframes are defined in globals.css (.skeleton-shimmer) so this
// component is free of imperative DOM manipulation and hydration risk.

export function Skeleton({ width = "100%", height = 14, radius = 8, style = {} }) {
  return (
    <div
      className="vt-skeleton"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

// A generic card-shaped skeleton: matches the glass-card padding used across
// the app (stat cards, turf cards, list rows).
export function SkeletonCard({ lines = 3 }) {
  return (
    <div
      style={{
        background: V.pitchCard,
        border: `1px solid ${V.line}`,
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Skeleton width={36} height={36} radius={10} />
      <Skeleton width="60%" height={20} />
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "40%" : "85%"} height={12} />
      ))}
    </div>
  );
}

// A skeleton for a single horizontal list/table row.
export function SkeletonRow({ columns = 4 }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "16px 20px",
        borderBottom: `1px solid ${V.line}`,
      }}
    >
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} width={i === 0 ? "22%" : "14%"} height={12} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 3, minColWidth = 300 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
        gap: 20,
      }}
    >
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

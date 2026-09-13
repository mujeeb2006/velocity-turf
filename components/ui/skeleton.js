// Shared skeleton/shimmer primitives used while dashboard data "loads".
// Kept dependency-free (no hooks) so it can be dropped into any client component.

const shimmerKeyframes = `
  @keyframes skeletonShimmer {
    0% { background-position: -300px 0; }
    100% { background-position: 300px 0; }
  }
`;

let injected = false;
function ensureKeyframes() {
  if (injected || typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.setAttribute("data-skeleton-keyframes", "true");
  tag.innerHTML = shimmerKeyframes;
  if (!document.head.querySelector("style[data-skeleton-keyframes]")) {
    document.head.appendChild(tag);
  }
  injected = true;
}

export function Skeleton({ width = "100%", height = 14, radius = 8, style = {} }) {
  ensureKeyframes();
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.05) 63%)",
        backgroundSize: "600px 100%",
        animation: "skeletonShimmer 1.4s ease infinite",
        ...style,
      }}
    />
  );
}

// A generic card-shaped skeleton: matches the glass-card padding used across
// the app (stat cards, turf cards, list rows).
export function SkeletonCard({ lines = 3, height = 160 }) {
  return (
    <div
      style={{
        background: "rgba(13, 21, 38, 0.75)",
        border: "1px solid rgba(14,165,233,0.15)",
        borderRadius: 18,
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
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} width={i === 0 ? "22%" : "14%"} height={12} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 3, cardHeight = 160, minColWidth = 300 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
        gap: 20,
      }}
    >
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} height={cardHeight} />
      ))}
    </div>
  );
}

// Medal emoji (🥈 🥉) render as blank boxes on a lot of Windows/Android
// browser+font combos, which made the leaderboard look broken for those
// users even though the data was fine. This renders rank badges as plain
// SVG so they look identical everywhere.

const RANK_STYLES = {
  1: { bg: "#FBBF24", fg: "#050A14", ring: "#FBBF24" },
  2: { bg: "#CBD5E1", fg: "#050A14", ring: "#CBD5E1" },
  3: { bg: "#D97706", fg: "#050A14", ring: "#D97706" },
};

export function RankBadge({ rank, size = 28 }) {
  const style = RANK_STYLES[rank];

  if (!style) {
    // Ranks below the podium: simple numbered circle.
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.42,
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${style.bg}, ${style.bg}cc)`,
        boxShadow: `0 0 0 2px ${style.ring}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill={style.fg} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l2.39 5.51 5.99.52-4.53 3.96 1.37 5.86L12 15.9l-5.22 2.95 1.37-5.86-4.53-3.96 5.99-.52L12 2z" />
      </svg>
    </div>
  );
}

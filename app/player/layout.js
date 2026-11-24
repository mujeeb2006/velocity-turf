export const viewport = {
  themeColor: "#1769E8",
};

export const metadata = {
  title: "Velocity Turf Player",
  description: "Velocity Turf Player App - Instant Turf Slot Booking, Community Matches, and Live Sports",
  manifest: "/manifest-player.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VT Player",
  },
  icons: {
    icon: [
      { url: "/icons/player/icon.svg", type: "image/svg+xml" },
      { url: "/icons/player/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/player/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/player/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function PlayerLayout({ children }) {
  return <>{children}</>;
}

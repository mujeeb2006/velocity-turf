export const viewport = {
  themeColor: "#1769E8",
};

export const metadata = {
  title: "Install Velocity Turf Player",
  description: "Install the Velocity Turf Player App on your home screen or desktop.",
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

export default function InstallPlayerLayout({ children }) {
  return <>{children}</>;
}

export const viewport = {
  themeColor: "#0E7050",
};

export const metadata = {
  title: "Install Velocity Turf Owner",
  description: "Install the Velocity Turf Venue Manager App on your home screen or desktop.",
  manifest: "/manifest-owner.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VT Owner",
  },
  icons: {
    icon: [
      { url: "/icons/owner/icon.svg", type: "image/svg+xml" },
      { url: "/icons/owner/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/owner/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/owner/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function InstallOwnerLayout({ children }) {
  return <>{children}</>;
}

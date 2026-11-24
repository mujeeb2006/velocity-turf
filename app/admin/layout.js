export const viewport = {
  themeColor: "#172B4D",
};

export const metadata = {
  title: "Velocity Turf Admin",
  description: "Velocity Turf Administrator Console - Platform Governance, Approvals, Bookings & Financial Settlement",
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VT Admin",
  },
  icons: {
    icon: [
      { url: "/icons/admin/icon.svg", type: "image/svg+xml" },
      { url: "/icons/admin/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/admin/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/admin/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function AdminLayout({ children }) {
  return <>{children}</>;
}

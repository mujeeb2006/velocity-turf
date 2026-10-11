import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { PwaRegister } from "@/components/PwaRegister";

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e161a" },
    { media: "(prefers-color-scheme: light)", color: "#2ab97a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: "Velocity Turf - Premium Turf Booking",
  description: "Book turfs, manage listings, and organize sports matches with real-time slot scheduling.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Velocity Turf",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Exo+2:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Fallback meta tags for legacy WebKit / Android browsers */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Velocity Turf" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .then(function(reg) {
                    console.log('[PWA] Early SW registration success:', reg.scope);
                  })
                  .catch(function(err) {
                    console.error('[PWA] Early SW registration failed:', err);
                  });
              }
            `,
          }}
        />
      </head>
      <body>
        <PwaRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

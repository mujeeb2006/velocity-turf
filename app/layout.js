import "./globals.css";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { PwaRegister } from "@/components/PwaRegister";
import { NavigationScrollHandler } from "@/components/NavigationScrollHandler";

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e161a" },
    { media: "(prefers-color-scheme: light)", color: "#2ab97a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
              window.__velocityTurfInstallPromptListener = true;
              window.addEventListener('beforeinstallprompt', function(event) {
                event.preventDefault();
                window.__velocityTurfInstallPrompt = event;
                window.dispatchEvent(new Event('velocityturf:beforeinstallprompt'));
              });
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                var path = window.location.pathname;
                var swScript = '/sw.js';
                var swScope = '/';
                if (path.startsWith('/admin') || path.startsWith('/install/admin')) {
                  swScript = '/sw-admin.js';
                  swScope = '/admin';
                } else if (path.startsWith('/owner') || path.startsWith('/install/owner')) {
                  swScript = '/sw-owner.js';
                  swScope = '/owner';
                } else if (path.startsWith('/player') || path.startsWith('/install/player')) {
                  swScript = '/sw-player.js';
                  swScope = '/player';
                }
                navigator.serviceWorker.register(swScript, { scope: swScope })
                  .then(function(reg) {
                    console.log('[PWA] Scoped SW registration success:', swScript, reg.scope);
                  })
                  .catch(function(err) {
                    console.error('[PWA] Scoped SW registration failed:', err);
                  });
              }
            `,
          }}
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationScrollHandler />
        </Suspense>
        <PwaRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

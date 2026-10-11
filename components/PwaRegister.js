"use client";

import { useEffect, useState } from "react";

import BrandMark from "@/components/brand-mark";

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already launched in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 1. Immediately register Service Worker
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          console.log("[PWA] Service Worker registered:", reg.scope);

          // Force update check
          if (reg.update) {
            reg.update();
          }
        } catch (err) {
          console.error("[PWA] Service Worker registration failed:", err);
        }
      };

      // If document is already complete, execute immediately
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW, { once: true });
        // Fallback in case load already fired
        setTimeout(registerSW, 500);
      }
    }

    // 2. Intercept beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      console.log("[PWA] Captured beforeinstallprompt event!");
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    // 3. Listen for app installed event
    const handleAppInstalled = () => {
      console.log("[PWA] App successfully installed!");
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Fallback: If on mobile/desktop and prompt not triggered after 2s, show in-app banner
    const timer = setTimeout(() => {
      if (!isStandalone) {
        setIsVisible(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log("[PWA] User choice:", choice.outcome);
      if (choice.outcome === "accepted") {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } else {
      // If browser hasn't provided prompt yet (e.g. desktop manual install or iOS Safari)
      alert(
        "To install Velocity Turf:\n\n• On Chrome/Edge: Click the Install icon (computer with down arrow) on the right side of the address bar above.\n• On iOS Safari: Tap Share (⎋) -> 'Add to Home Screen'."
      );
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (isInstalled || isDismissed || !isVisible) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Install Velocity Turf Application"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        width: "calc(100% - 32px)",
        maxWidth: "520px",
        background: "rgba(14, 22, 26, 0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(42, 185, 122, 0.35)",
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: "0 16px 36px -6px rgba(0, 0, 0, 0.7), 0 0 24px rgba(42, 185, 122, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        animation: "pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        color: "#ffffff",
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
        {/* Official Brand Logo Mark */}
        <div
          style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BrandMark size={44} />
        </div>

        {/* Text Details */}
        <div style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Velocity Turf App
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(212, 255, 79, 0.15)",
                color: "#d4ff4f",
                border: "1px solid rgba(212, 255, 79, 0.3)",
              }}
            >
              Fast & Offline
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(243, 245, 241, 0.72)",
              margin: "2px 0 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Install for 1-tap bookings & instant slot alerts
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          style={{
            background: "#2ab97a",
            color: "#0e161a",
            border: "none",
            borderRadius: "10px",
            padding: "9px 15px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 8px rgba(42, 185, 122, 0.3)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#24a46c")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2ab97a")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Install
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          style={{
            background: "transparent",
            color: "rgba(243, 245, 241, 0.5)",
            border: "none",
            cursor: "pointer",
            padding: "6px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(243, 245, 241, 0.5)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <style jsx global>{`
        @keyframes pwaSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}

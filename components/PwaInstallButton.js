"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches === true ||
    window.navigator?.standalone === true ||
    document.referrer?.startsWith("android-app://") === true
  );
}

function getManualMethod() {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) {
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR/i.test(ua);
    return isSafari ? "ios" : "ios-other";
  }
  if (/Android/i.test(ua) && /Firefox|Fennec/i.test(ua)) return "firefox-android";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Chrome|Chromium|CriOS|OPR\/|Opera/i.test(ua)) return "chromium";
  return "generic";
}

const APP_META = {
  admin: {
    title: "Velocity Turf Admin",
    shortName: "VT Admin",
    icon: "/icons/admin/icon.svg",
    badge: "ADMIN",
    themeColor: "#172B4D",
    accentColor: "#F59E0B",
    textColor: "#FFFFFF",
    dashboardPath: "/admin",
    roleNotice: "Requires verified Admin credentials",
  },
  owner: {
    title: "Velocity Turf Owner",
    shortName: "VT Owner",
    icon: "/icons/owner/icon.svg",
    badge: "OWNER",
    themeColor: "#0E7050",
    accentColor: "#C8F542",
    textColor: "#FFFFFF",
    dashboardPath: "/owner",
    roleNotice: "Requires verified Turf Owner credentials",
  },
  player: {
    title: "Velocity Turf Player",
    shortName: "VT Player",
    icon: "/icons/player/icon.svg",
    badge: "PLAYER",
    themeColor: "#1769E8",
    accentColor: "#C8F542",
    textColor: "#FFFFFF",
    dashboardPath: "/player",
    roleNotice: "Available for all registered players",
  },
};

export function PwaInstallButton({
  role = "player",
  variant = "pill", // "pill" | "button" | "card" | "banner"
  onInstalled,
  className = "",
  style = {},
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const meta = APP_META[role] || APP_META.player;

  useEffect(() => {
    setInstalled(isStandalone());

    const prompt = window.__velocityTurfInstallPrompt || null;
    if (prompt) setDeferredPrompt(prompt);

    const handlePrompt = (e) => {
      e?.preventDefault?.();
      const p = window.__velocityTurfInstallPrompt || e.detail || e;
      window.__velocityTurfInstallPrompt = p;
      setDeferredPrompt(p);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      window.__velocityTurfInstallPrompt = null;
      setShowModal(false);
      onInstalled?.();
    };

    window.addEventListener("velocityturf:beforeinstallprompt", handlePrompt);
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("velocityturf:beforeinstallprompt", handlePrompt);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [onInstalled]);

  async function handleTriggerInstall() {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
      } catch (err) {
        console.warn("PWA install error", err);
        setShowModal(true);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
        window.__velocityTurfInstallPrompt = null;
      }
    } else {
      setShowModal(true);
    }
  }

  const manualMethod = getManualMethod();
  const instructions = {
    ios: "Tap the Share icon (square with arrow up at the bottom of Safari), then scroll down and tap 'Add to Home Screen'.",
    "ios-other": "Open this link in Apple Safari to install: Tap Share → 'Add to Home Screen'.",
    "firefox-android": "Tap the browser menu (⋮) next to the address bar, then select 'Install' or 'Add to Home screen'.",
    samsung: "Tap the browser menu (☰) at the bottom, then choose 'Add page to' → 'Home screen'.",
    edge: "Click the App Available icon in the address bar or open menu (...) → Apps → 'Install this site as an app'.",
    chromium: "Click the Install icon in the browser address bar or tap the menu (⋮) → 'Install App'.",
    generic: "Open your browser's menu and look for 'Install App' or 'Add to Home Screen'.",
  }[manualMethod] || "Open your browser menu and choose 'Install' or 'Add to Home Screen'.";

  if (installed) {
    if (variant === "pill" || variant === "button") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "#10B981",
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            ...style,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          App Installed
        </span>
      );
    }
    return null;
  }

  return (
    <>
      {variant === "pill" && (
        <button
          type="button"
          onClick={handleTriggerInstall}
          disabled={isInstalling}
          className={className}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 800,
            color: meta.textColor,
            background: meta.themeColor,
            border: `1px solid ${meta.accentColor}`,
            padding: "6px 14px",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transition: "all 0.15s ease",
            ...style,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Install {meta.shortName}</span>
        </button>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={handleTriggerInstall}
          disabled={isInstalling}
          className={className}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 14.5,
            fontWeight: 800,
            color: "#111C2E",
            background: "#C8F542",
            border: "none",
            padding: "12px 24px",
            borderRadius: 14,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(200, 245, 66, 0.35)",
            transition: "all 0.15s ease",
            ...style,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>{isInstalling ? "Installing…" : `Install ${meta.title}`}</span>
        </button>
      )}

      {variant === "card" && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5EDF5",
            borderRadius: 20,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            ...style,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={meta.icon} alt={meta.title} width={48} height={48} style={{ borderRadius: 12 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#172B4D" }}>{meta.title}</div>
              <div style={{ fontSize: 12, color: "#718096" }}>{meta.roleNotice}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTriggerInstall}
            disabled={isInstalling}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              background: "#C8F542",
              color: "#111C2E",
              fontWeight: 800,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Install App on Home Screen</span>
          </button>
        </div>
      )}

      {/* Manual Installation Instructions Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 28, 46, 0.72)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 24,
              padding: "28px 24px",
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              border: "1px solid #E5EDF5",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#F0F4F8",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#718096",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <img src={meta.icon} alt={meta.title} width={52} height={52} style={{ borderRadius: 14 }} />
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: meta.themeColor,
                    color: meta.accentColor,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  {meta.badge}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#172B4D", margin: 0 }}>
                  Install {meta.title}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#4A5568", lineHeight: 1.55, margin: "0 0 16px" }}>
              Install this progressive web app for quick home-screen access, full-screen offline reliability, and fast performance.
            </p>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "#1769E8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                How to install on your device:
              </div>
              <div style={{ fontSize: 13.5, color: "#1E293B", lineHeight: 1.5 }}>
                {instructions}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                background: "#172B4D",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

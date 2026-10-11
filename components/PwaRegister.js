"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/brand-mark";

const DISMISSED_LOCAL_KEY = "velocity-turf:pwa-install-dismissed";
const DISMISSED_SESSION_KEY = "velocity-turf:pwa-session-dismissed";

function getManualInstallMethod(userAgent, platform) {
  if (!userAgent) return null;
  // Exclude embedded webviews (FB, Instagram, Line, etc.)
  if (/;\s*wv\)|FBAN|FBAV|Instagram|MicroMessenger|Line\//i.test(userAgent)) return null;

  const iosDevice = /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === "MacIntel" && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);

  if (iosDevice) {
    // Only offer manual install if running in Safari on iOS
    const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|Edg|OPR/i.test(userAgent);
    return isSafari ? "ios" : null;
  }

  if (/Android/i.test(userAgent) && /Firefox|Fennec/i.test(userAgent)) return "firefox-android";
  if (/SamsungBrowser/i.test(userAgent)) return "samsung";
  if (/Edg\//i.test(userAgent)) return "edge";
  if (/Chrome|Chromium|CriOS|OPR\/|Opera/i.test(userAgent)) return "chromium";

  return null;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches === true ||
    window.navigator?.standalone === true ||
    document.referrer?.startsWith("android-app://") === true
  );
}

export function PwaRegister() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [manualInstallMethod, setManualInstallMethod] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session or previously persisted
    try {
      const dismissedLocal = window.localStorage.getItem(DISMISSED_LOCAL_KEY) === "true";
      const dismissedSession = window.sessionStorage.getItem(DISMISSED_SESSION_KEY) === "true";
      if (dismissedLocal || dismissedSession) {
        setIsDismissed(true);
      }
    } catch (err) {
      console.warn("Could not check PWA dismissal state", err);
    }

    const updateInstalled = () => setIsInstalled(isStandalone());
    updateInstalled();

    setManualInstallMethod(getManualInstallMethod(navigator.userAgent, navigator.platform));

    const prompt = window.__velocityTurfInstallPrompt || null;
    if (prompt) setDeferredPrompt(prompt);

    const handlePrompt = (event) => {
      event.preventDefault?.();
      const availablePrompt = window.__velocityTurfInstallPrompt || event.detail || event;
      window.__velocityTurfInstallPrompt = availablePrompt;
      setDeferredPrompt(availablePrompt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__velocityTurfInstallPrompt = null;
      setShowInstallHelp(false);
      try {
        window.localStorage.setItem(DISMISSED_LOCAL_KEY, "true");
      } catch {
        // ignore
      }
    };

    window.addEventListener("velocityturf:beforeinstallprompt", handlePrompt);
    if (!window.__velocityTurfInstallPromptListener) {
      window.addEventListener("beforeinstallprompt", handlePrompt);
    }
    window.addEventListener("appinstalled", handleAppInstalled);

    const displayMode = window.matchMedia?.("(display-mode: standalone)");
    displayMode?.addEventListener?.("change", updateInstalled);

    setIsReady(true);

    return () => {
      window.removeEventListener("velocityturf:beforeinstallprompt", handlePrompt);
      if (!window.__velocityTurfInstallPromptListener) {
        window.removeEventListener("beforeinstallprompt", handlePrompt);
      }
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayMode?.removeEventListener?.("change", updateInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showInstallHelp) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowInstallHelp(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInstallHelp]);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      if (manualInstallMethod) {
        setShowInstallHelp(true);
      }
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("PWA prompt error", error);
      if (manualInstallMethod) {
        setShowInstallHelp(true);
      }
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
      window.__velocityTurfInstallPrompt = null;
    }
  }

  function handleDismiss() {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_LOCAL_KEY, "true");
      window.sessionStorage.setItem(DISMISSED_SESSION_KEY, "true");
    } catch (err) {
      console.warn("Could not save dismissal state", err);
    }
  }

  const isPlayerRoute = pathname === "/" || pathname === "/player";
  const canOfferInstall = Boolean(deferredPrompt || manualInstallMethod);

  if (!isReady || isDismissed || isInstalled || !canOfferInstall) {
    return null;
  }

  const installInstructions = {
    ios: "In Safari, tap the Share button (square with arrow up), then select “Add to Home Screen”.",
    "firefox-android": "Open the browser menu (⋮) and tap “Install” or “Add to Home screen”.",
    samsung: "Open the browser menu and select “Add page to” → “Home screen”.",
    edge: "Open the browser menu and choose Apps → “Install this site as an app”.",
    chromium: "Open the browser menu (⋮) and tap “Install app” or “Add to Home screen”.",
  }[manualInstallMethod];

  return (
    <>
      <aside
        className="vt-pwa-banner"
        data-bottom-nav={isPlayerRoute ? "true" : "false"}
        role="region"
        aria-label="Install Velocity Turf Application"
      >
        <div className="vt-pwa-brand" aria-hidden="true">
          <BrandMark size={28} />
        </div>

        <div className="vt-pwa-copy">
          <div className="vt-pwa-heading">
            <strong>Velocity Turf</strong>
            <span className="vt-pwa-badge">Fast</span>
          </div>
          <p className="vt-pwa-desc">Instant slots &amp; 1-tap booking</p>
        </div>

        <div className="vt-pwa-actions">
          <button
            type="button"
            className="vt-pwa-install"
            onClick={handleInstallClick}
            disabled={isInstalling}
            aria-label="Install Velocity Turf App"
          >
            {isInstalling ? "…" : "Install"}
          </button>
          <button
            type="button"
            className="vt-pwa-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss install promotion"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </aside>

      {showInstallHelp && (
        <div
          className="vt-pwa-help-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowInstallHelp(false);
          }}
        >
          <section
            className="vt-pwa-help"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vt-pwa-help-title"
          >
            <button
              type="button"
              className="vt-pwa-help-close"
              aria-label="Close instructions"
              onClick={() => setShowInstallHelp(false)}
              autoFocus
            >
              ×
            </button>
            <h2 id="vt-pwa-help-title">Install Velocity Turf</h2>
            <p>
              {installInstructions ||
                "Use your browser’s menu to check if “Install app” or “Add to Home screen” is available."}
            </p>
            <button
              type="button"
              className="vt-pwa-install"
              onClick={() => setShowInstallHelp(false)}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}

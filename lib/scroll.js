"use client";

import { useEffect, useRef } from "react";

/**
 * Resets the page scroll position to the top.
 * Covers window, documentElement, body, and all primary container elements
 * across mobile browsers, PWAs, and desktop views.
 */
export function resetPageScroll(smooth = false) {
  if (typeof window === "undefined") return;

  const behavior = smooth ? "smooth" : "instant";

  const performReset = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }

    if (document.documentElement && document.documentElement.scrollTop !== 0) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body && document.body.scrollTop !== 0) {
      document.body.scrollTop = 0;
    }

    // Reset all potential main scroll containers
    const containers = document.querySelectorAll(
      "main, .vt-dashboard-main, .vt-dashboard-shell, [role='main'], [data-scroll-container]"
    );
    containers.forEach((el) => {
      if (el && el.scrollTop !== 0) {
        el.scrollTop = 0;
      }
    });
  };

  // Immediate reset
  performReset();

  // Re-verify on next animation frame after React commits DOM changes
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      performReset();
    });
  }
}

/**
 * Reusable hook to reset scroll position whenever an active tab/section changes.
 * Skips resets for non-tab re-renders (modals, dropdowns, form inputs).
 */
export function useScrollResetOnTab(activeTab) {
  const isFirstRun = useRef(true);
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    // Also reset on initial mount so a page opened from another route starts at top
    if (isFirstRun.current) {
      isFirstRun.current = false;
      resetPageScroll();
      return;
    }

    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      resetPageScroll();
    }
  }, [activeTab]);
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { resetPageScroll } from "@/lib/scroll";

/**
 * Global Navigation Scroll Handler component.
 * Automatically resets scroll position across the entire application on:
 * 1. Next.js route transitions (pathname / searchParams changes)
 * 2. Browser history traversal (popstate / hashchange)
 * 3. Custom navigation events (vt:scroll-reset)
 */
export function NavigationScrollHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevRouteKey = useRef(`${pathname}?${searchParams?.toString() || ""}`);

  // Disable browser auto-scroll restoration to prevent mobile browsers from
  // restoring old scroll positions during client-side navigation.
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        // Safe fallback if unsupported or sandboxed
      }
    }
  }, []);

  // Reset scroll whenever the route changes
  useEffect(() => {
    const currentKey = `${pathname}?${searchParams?.toString() || ""}`;
    if (prevRouteKey.current !== currentKey) {
      prevRouteKey.current = currentKey;
      resetPageScroll();
    }
  }, [pathname, searchParams]);

  // Global listeners for history and custom navigation triggers
  useEffect(() => {
    const onNavigationEvent = () => {
      resetPageScroll();
    };

    window.addEventListener("popstate", onNavigationEvent);
    window.addEventListener("hashchange", onNavigationEvent);
    window.addEventListener("vt:scroll-reset", onNavigationEvent);

    return () => {
      window.removeEventListener("popstate", onNavigationEvent);
      window.removeEventListener("hashchange", onNavigationEvent);
      window.removeEventListener("vt:scroll-reset", onNavigationEvent);
    };
  }, []);

  return null;
}

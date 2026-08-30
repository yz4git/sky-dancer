"use client";

import { useEffect } from "react";

const HEIGHT_VAR = "--cart-visual-viewport-height";
const WIDTH_VAR = "--cart-visual-viewport-width";

function px(value: number): string {
  return `${Math.max(1, Math.round(value * 1000) / 1000)}px`;
}

export default function CartViewportSync() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const sync = () => {
      raf = 0;
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      root.style.setProperty(HEIGHT_VAR, px(height));
      root.style.setProperty(WIDTH_VAR, px(width));
      root.dataset.cartVisualViewport = "synced";
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };

    // iPhone Safari can still start its native pinch gesture while two game
    // controls are held at once. Keep the game surface gesture-exclusive while
    // leaving normal rapid single-finger taps (SHOT, MISSILE, TURBO) untouched.
    const preventGestureZoom = (event: Event) => {
      event.preventDefault();
    };
    const preventMultiTouchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    sync();
    root.dataset.cartZoomGuard = "active";
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
    document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
    document.addEventListener("gestureend", preventGestureZoom, { passive: false });
    document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
      document.removeEventListener("touchmove", preventMultiTouchZoom);
      root.style.removeProperty(HEIGHT_VAR);
      root.style.removeProperty(WIDTH_VAR);
      delete root.dataset.cartVisualViewport;
      delete root.dataset.cartZoomGuard;
    };
  }, []);

  return null;
}

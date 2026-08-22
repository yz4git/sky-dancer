"use client";

import { useEffect } from "react";

export default function SkyViewportSync() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const sync = () => {
      raf = 0;
      const viewport = window.visualViewport;
      root.style.setProperty("--sky-visual-height", `${Math.max(1, Math.round((viewport?.height ?? window.innerHeight) * 1000) / 1000)}px`);
      root.style.setProperty("--sky-visual-width", `${Math.max(1, Math.round((viewport?.width ?? window.innerWidth) * 1000) / 1000)}px`);
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, []);
  return null;
}

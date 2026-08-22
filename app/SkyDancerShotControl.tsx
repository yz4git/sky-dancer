"use client";

import { useEffect } from "react";
import "../src/sky/SkyDancerControlPatch";
import styles from "./SkyDancerShotControl.module.css";

const FIRE_KEY = "__skyDancerFireMissile";

function fireMissile(): void {
  const callback = (window as unknown as Record<string, unknown>)[FIRE_KEY];
  if (typeof callback === "function") {
    (callback as () => unknown)();
    if ("vibrate" in navigator) navigator.vibrate?.(8);
  }
}

export default function SkyDancerShotControl() {
  useEffect(() => {
    const hideBrake = () => {
      for (const button of document.querySelectorAll("button")) {
        if (button.textContent?.trim() === "BRAKE") {
          button.style.display = "none";
          button.setAttribute("aria-hidden", "true");
          button.setAttribute("tabindex", "-1");
        }
      }
    };
    hideBrake();
    const observer = new MutationObserver(hideBrake);
    observer.observe(document.body, { childList: true, subtree: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key !== "x" && key !== "f" && key !== "enter") return;
      event.preventDefault();
      fireMissile();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={styles.shotWrap}>
      <button
        className={styles.shotButton}
        aria-label="Fire missile"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          fireMissile();
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <strong>SHOT</strong>
        <small>MISSILE</small>
      </button>
    </div>
  );
}

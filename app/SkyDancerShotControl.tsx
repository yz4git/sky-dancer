"use client";

import { useEffect, useRef } from "react";
import "../src/sky/SkyDancerControlPatch";
import styles from "./SkyDancerShotControl.module.css";

const FIRE_KEY = "__skyDancerFireMissile";
let lastSuccessfulFireAt = 0;

function fireMissile(): boolean {
  const callback = (window as unknown as Record<string, unknown>)[FIRE_KEY];
  if (typeof callback !== "function") return false;
  const fired = (callback as () => unknown)();
  lastSuccessfulFireAt = performance.now();
  if ("vibrate" in navigator) navigator.vibrate?.(8);
  return fired !== false;
}

function fireWithRuntimeRetry(): void {
  if (fireMissile()) return;
  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (fireMissile() || attempts >= 8) return;
    requestAnimationFrame(retry);
  };
  requestAnimationFrame(retry);
}

export default function SkyDancerShotControl() {
  const pointerFireRef = useRef(0);

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
      fireWithRuntimeRetry();
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
          // Fire before pointer capture. Safari can reject setPointerCapture in
          // edge cases; that must never prevent the weapon command itself.
          pointerFireRef.current = performance.now();
          fireWithRuntimeRetry();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture is only a gesture-safety enhancement.
          }
        }}
        onClick={(event) => {
          event.preventDefault();
          // Keyboard/accessibility click fallback without double-firing the
          // synthetic click that follows a successful pointerdown.
          const sincePointer = performance.now() - pointerFireRef.current;
          const sinceFire = performance.now() - lastSuccessfulFireAt;
          if (sincePointer > 260 && sinceFire > 260) fireWithRuntimeRetry();
        }}
        onPointerUp={(event) => {
          try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // Ignore Safari capture state races.
          }
        }}
        onPointerCancel={(event) => {
          try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // Ignore Safari capture state races.
          }
        }}
      >
        <strong>SHOT</strong>
        <small>MISSILE</small>
      </button>
    </div>
  );
}

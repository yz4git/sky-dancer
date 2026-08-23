"use client";

import { useEffect, useRef } from "react";
import "../src/sky/SkyDancerControlPatch";
import { fireSkyDancerActiveWeapon } from "../src/sky/SkyDancerWeaponBridge";
import styles from "./SkyDancerShotControl.module.css";

let lastSuccessfulFireAt = 0;

function fireMissile(): boolean {
  const fired = fireSkyDancerActiveWeapon();
  if (!fired) return false;
  lastSuccessfulFireAt = performance.now();
  if ("vibrate" in navigator) navigator.vibrate?.(8);
  return true;
}

function fireWithRuntimeRetry(): void {
  if (fireMissile()) return;
  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (fireMissile() || attempts >= 10) return;
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
          pointerFireRef.current = performance.now();
          // The active game session is called directly. Pointer capture is kept
          // purely as a gesture helper and can never block weapon firing.
          fireWithRuntimeRetry();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Safari may reject capture during orientation/runtime transitions.
          }
        }}
        onClick={(event) => {
          event.preventDefault();
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

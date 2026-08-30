"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./SkyDancerArcadeVirtualPad.module.css";

const DEAD_ZONE = 0.16;
const MAX_TRAVEL = 46;

type Direction = -1 | 0 | 1;

function dispatchKey(type: "keydown" | "keyup", key: "ArrowLeft" | "ArrowRight"): void {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
}

export default function SkyDancerArcadeVirtualPad() {
  const pointerRef = useRef<number | null>(null);
  const directionRef = useRef<Direction>(0);
  const [direction, setDirection] = useState<Direction>(0);
  const [active, setActive] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const applyDirection = useCallback((next: Direction) => {
    const previous = directionRef.current;
    if (previous === next) return;
    if (previous < 0) dispatchKey("keyup", "ArrowLeft");
    if (previous > 0) dispatchKey("keyup", "ArrowRight");
    directionRef.current = next;
    setDirection(next);
    if (next < 0) dispatchKey("keydown", "ArrowLeft");
    if (next > 0) dispatchKey("keydown", "ArrowRight");
  }, []);

  const reset = useCallback(() => {
    applyDirection(0);
    pointerRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
  }, [applyDirection]);

  useEffect(() => {
    const onBlur = () => reset();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") reset();
    };
    const onPause = () => reset();
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("cart-rogue-menu-pause", onPause);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("cart-rogue-menu-pause", onPause);
      reset();
    };
  }, [reset]);

  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width * 0.5);
    const dy = event.clientY - (rect.top + rect.height * 0.5);
    const distance = Math.hypot(dx, dy);
    const scale = distance > MAX_TRAVEL ? MAX_TRAVEL / Math.max(distance, 0.001) : 1;
    const x = dx * scale;
    const y = dy * scale;
    const normalizedX = x / MAX_TRAVEL;
    setKnob({ x, y });
    applyDirection(normalizedX < -DEAD_ZONE ? -1 : normalizedX > DEAD_ZONE ? 1 : 0);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (pointerRef.current !== null) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(true);
    updateFromPointer(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    updateFromPointer(event);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    reset();
  };

  return (
    <div className={styles.wrap} aria-label="Arcade steering control">
      <div
        className={`${styles.pad}${active ? ` ${styles.active}` : ""}`}
        role="slider"
        aria-label="Arcade steering virtual pad"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={direction}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
      >
        <span className={styles.crosshair} aria-hidden="true" />
        <span
          className={styles.knob}
          aria-hidden="true"
          style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
        >
          <i />
        </span>
      </div>
      <span className={styles.caption}>TURN</span>
    </div>
  );
}

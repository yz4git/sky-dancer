"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./SkyDancerArcadeVirtualPad.module.css";

const DEAD_ZONE = 0.16;
const MAX_TRAVEL = 46;

type Direction = -1 | 0 | 1;
type FlightKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

function dispatchKey(type: "keydown" | "keyup", key: FlightKey): void {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
}

export default function SkyDancerArcadeVirtualPad() {
  const pointerRef = useRef<number | null>(null);
  const horizontalRef = useRef<Direction>(0);
  const verticalRef = useRef<Direction>(0);
  const [direction, setDirection] = useState<Direction>(0);
  const [active, setActive] = useState(false);
  const [flightMode, setFlightMode] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const applyHorizontal = useCallback((next: Direction) => {
    const previous = horizontalRef.current;
    if (previous === next) return;
    if (previous < 0) dispatchKey("keyup", "ArrowLeft");
    if (previous > 0) dispatchKey("keyup", "ArrowRight");
    horizontalRef.current = next;
    setDirection(next);
    if (next < 0) dispatchKey("keydown", "ArrowLeft");
    if (next > 0) dispatchKey("keydown", "ArrowRight");
  }, []);

  const applyVertical = useCallback((next: Direction) => {
    const previous = verticalRef.current;
    if (previous === next) return;
    if (previous < 0) dispatchKey("keyup", "ArrowDown");
    if (previous > 0) dispatchKey("keyup", "ArrowUp");
    verticalRef.current = next;
    if (next < 0) dispatchKey("keydown", "ArrowDown");
    if (next > 0) dispatchKey("keydown", "ArrowUp");
  }, []);

  const reset = useCallback(() => {
    applyHorizontal(0);
    applyVertical(0);
    pointerRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
  }, [applyHorizontal, applyVertical]);

  useEffect(() => {
    setFlightMode(document.documentElement.dataset.skyDancerMode === "sky-raid");
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
    const normalizedY = y / MAX_TRAVEL;
    const isFlightMode = document.documentElement.dataset.skyDancerMode === "sky-raid";
    setKnob({ x, y: isFlightMode ? y : 0 });
    applyHorizontal(normalizedX < -DEAD_ZONE ? -1 : normalizedX > DEAD_ZONE ? 1 : 0);
    applyVertical(isFlightMode ? (normalizedY < -DEAD_ZONE ? 1 : normalizedY > DEAD_ZONE ? -1 : 0) : 0);
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
    <div className={styles.wrap} aria-label={flightMode ? "Flight control" : "Arcade steering control"}>
      <div
        className={`${styles.pad}${active ? ` ${styles.active}` : ""}`}
        role="slider"
        aria-label={flightMode ? "Sky Raid two-axis flight stick" : "Arcade steering virtual pad"}
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
      <span className={styles.caption}>{flightMode ? "TURN · CLIMB / DIVE" : "TURN"}</span>
    </div>
  );
}

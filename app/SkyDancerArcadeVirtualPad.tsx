"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import styles from "./SkyDancerArcadeVirtualPad.module.css";

const DEAD_ZONE = 0.16;
const MAX_TRAVEL = 46;
const VIRTUAL_STICK_EVENT = "sky-dancer-virtual-stick";

type Direction = -1 | 0 | 1;

interface VirtualStickDetail {
  x: Direction;
  y: Direction;
  active: boolean;
  source: "touch" | "pointer" | "reset";
}

function publishStick(detail: VirtualStickDetail): void {
  window.dispatchEvent(new CustomEvent<VirtualStickDetail>(VIRTUAL_STICK_EVENT, { detail }));
}

function touchByIdentifier(list: TouchList, identifier: number): Touch | null {
  for (let index = 0; index < list.length; index += 1) {
    const touch = list.item(index);
    if (touch?.identifier === identifier) return touch;
  }
  return null;
}

export default function SkyDancerArcadeVirtualPad() {
  const pointerRef = useRef<number | null>(null);
  const touchRef = useRef<number | null>(null);
  const horizontalRef = useRef<Direction>(0);
  const verticalRef = useRef<Direction>(0);
  const [direction, setDirection] = useState<Direction>(0);
  const [active, setActive] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const flightMode = typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";

  const publishDirection = useCallback((horizontal: Direction, vertical: Direction, source: VirtualStickDetail["source"]) => {
    horizontalRef.current = horizontal;
    verticalRef.current = vertical;
    setDirection(horizontal);
    publishStick({ x: horizontal, y: vertical, active: true, source });
  }, []);

  const reset = useCallback(() => {
    pointerRef.current = null;
    touchRef.current = null;
    horizontalRef.current = 0;
    verticalRef.current = 0;
    setDirection(0);
    setActive(false);
    setKnob({ x: 0, y: 0 });
    // Always publish an authoritative neutral sample. Do not rely on the visual
    // knob state or on a matching keyup surviving an iOS lifecycle transition.
    publishStick({ x: 0, y: 0, active: false, source: "reset" });
  }, []);

  useEffect(() => {
    const onGlobalPointerEnd = (event: PointerEvent) => {
      if (pointerRef.current !== event.pointerId) return;
      reset();
    };
    const onGlobalTouchEnd = (event: TouchEvent) => {
      const identifier = touchRef.current;
      if (identifier === null || !touchByIdentifier(event.changedTouches, identifier)) return;
      reset();
    };
    const onBlur = () => reset();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") reset();
    };
    const onPageLifecycle = () => reset();
    const onPause = () => reset();

    window.addEventListener("pointerup", onGlobalPointerEnd, true);
    window.addEventListener("pointercancel", onGlobalPointerEnd, true);
    // iPhone Safari has a mature Touch Events path independent of Pointer
    // Capture. Keep it as the authoritative release path for finger input.
    document.addEventListener("touchend", onGlobalTouchEnd, true);
    document.addEventListener("touchcancel", onGlobalTouchEnd, true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageLifecycle);
    window.addEventListener("pageshow", onPageLifecycle);
    window.addEventListener("orientationchange", onPageLifecycle);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("cart-rogue-menu-pause", onPause);
    return () => {
      window.removeEventListener("pointerup", onGlobalPointerEnd, true);
      window.removeEventListener("pointercancel", onGlobalPointerEnd, true);
      document.removeEventListener("touchend", onGlobalTouchEnd, true);
      document.removeEventListener("touchcancel", onGlobalTouchEnd, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageLifecycle);
      window.removeEventListener("pageshow", onPageLifecycle);
      window.removeEventListener("orientationchange", onPageLifecycle);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("cart-rogue-menu-pause", onPause);
      reset();
    };
  }, [reset]);

  const updateFromClient = (
    target: HTMLDivElement,
    clientX: number,
    clientY: number,
    source: "touch" | "pointer",
  ) => {
    const rect = target.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width * 0.5);
    const dy = clientY - (rect.top + rect.height * 0.5);
    const distance = Math.hypot(dx, dy);
    const scale = distance > MAX_TRAVEL ? MAX_TRAVEL / Math.max(distance, 0.001) : 1;
    const x = dx * scale;
    const y = dy * scale;
    const normalizedX = x / MAX_TRAVEL;
    const normalizedY = y / MAX_TRAVEL;
    const isFlightMode = document.documentElement.dataset.skyDancerMode === "sky-raid";
    const horizontal: Direction = normalizedX < -DEAD_ZONE ? -1 : normalizedX > DEAD_ZONE ? 1 : 0;
    const vertical: Direction = isFlightMode
      ? (normalizedY < -DEAD_ZONE ? 1 : normalizedY > DEAD_ZONE ? -1 : 0)
      : 0;
    setKnob({ x, y: isFlightMode ? y : 0 });
    if (horizontal !== horizontalRef.current || vertical !== verticalRef.current) {
      publishDirection(horizontal, vertical, source);
    }
  };

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (touchRef.current !== null) return;
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    // Pointer Events normally arrive first on modern Safari. Keep the Touch
    // identifier anyway so touchend/touchcancel remains an independent release
    // path if pointer capture or pointerup is lost by browser chrome.
    touchRef.current = touch.identifier;
    if (pointerRef.current !== null) return;
    setActive(true);
    updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
  };

  const onTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const identifier = touchRef.current;
    if (identifier === null) return;
    const touch = touchByIdentifier(event.touches, identifier);
    if (!touch) {
      reset();
      return;
    }
    event.preventDefault();
    if (pointerRef.current === null) {
      updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
    }
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const identifier = touchRef.current;
    if (identifier === null || !touchByIdentifier(event.changedTouches, identifier)) return;
    event.preventDefault();
    reset();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Pointer Events are the primary motion path on modern Safari. Touch Events
    // track the same contact as a redundant release channel, never as a second
    // gameplay owner.
    event.preventDefault();
    if (pointerRef.current !== null || touchRef.current !== null) return;
    pointerRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Global release/lifecycle guards remain authoritative.
    }
    setActive(true);
    updateFromClient(event.currentTarget, event.clientX, event.clientY, "pointer");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    if (event.pointerType === "mouse" && event.buttons === 0) {
      reset();
      return;
    }
    updateFromClient(event.currentTarget, event.clientX, event.clientY, "pointer");
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Safari may already have dropped capture while changing UI state.
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
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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

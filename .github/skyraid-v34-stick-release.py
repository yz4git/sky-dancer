from pathlib import Path

virtual_pad = r'''"use client";

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
    if (touchRef.current !== null || pointerRef.current !== null) return;
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    touchRef.current = touch.identifier;
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
    updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const identifier = touchRef.current;
    if (identifier === null || !touchByIdentifier(event.changedTouches, identifier)) return;
    event.preventDefault();
    reset();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Finger input is intentionally owned by Touch Events on iOS. Pointer
    // Events remain for mouse/pen and desktop audits only.
    if (event.pointerType === "touch") return;
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
    if (event.pointerType === "touch" || pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    if (event.pointerType === "mouse" && event.buttons === 0) {
      reset();
      return;
    }
    updateFromClient(event.currentTarget, event.clientX, event.clientY, "pointer");
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || pointerRef.current !== event.pointerId) return;
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
'''
Path('app/SkyDancerArcadeVirtualPad.tsx').write_text(virtual_pad)

path = Path('app/CartRogueGame.tsx')
source = path.read_text()
old_effect = '''  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      const left = keys.has("a") || keys.has("arrowleft");
      const right = keys.has("d") || keys.has("arrowright");
      const skyRaid = document.documentElement.dataset.skyDancerMode === "sky-raid";
      demoRef.current?.setSteering(left === right ? 0 : left ? -1 : 1);
      if (skyRaid) {
        const climb = keys.has("w") || keys.has("arrowup");
        const dive = keys.has("s") || keys.has("arrowdown");
        demoRef.current?.setVertical?.(climb === dive ? 0 : climb ? 1 : -1);
        demoRef.current?.setBrake(false);
      } else {
        demoRef.current?.setVertical?.(0);
        demoRef.current?.setBrake(keys.has("s") || keys.has("arrowdown"));
      }
      demoRef.current?.setBoost(keys.has(" ") || keys.has("shift"));
    };
    const down = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      sync();
    };
    const up = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
      sync();
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
'''
new_effect = '''  useEffect(() => {
    const keys = new Set<string>();
    let virtualX = 0;
    let virtualY = 0;
    let virtualActive = false;

    const sync = () => {
      const left = keys.has("a") || keys.has("arrowleft");
      const right = keys.has("d") || keys.has("arrowright");
      const keyX = left === right ? 0 : left ? -1 : 1;
      const skyRaid = document.documentElement.dataset.skyDancerMode === "sky-raid";
      demoRef.current?.setSteering(virtualActive ? virtualX : keyX);
      if (skyRaid) {
        const climb = keys.has("w") || keys.has("arrowup");
        const dive = keys.has("s") || keys.has("arrowdown");
        const keyY = climb === dive ? 0 : climb ? 1 : -1;
        demoRef.current?.setVertical?.(virtualActive ? virtualY : keyY);
        demoRef.current?.setBrake(false);
      } else {
        demoRef.current?.setVertical?.(0);
        demoRef.current?.setBrake(keys.has("s") || keys.has("arrowdown"));
      }
      demoRef.current?.setBoost(keys.has(" ") || keys.has("shift"));
    };

    const hardResetInput = () => {
      keys.clear();
      virtualX = 0;
      virtualY = 0;
      virtualActive = false;
      steerPointerRef.current = null;
      boostPointersRef.current.clear();
      brakePointersRef.current.clear();
      demoRef.current?.setSteering(0);
      demoRef.current?.setVertical?.(0);
      demoRef.current?.setBoost(false);
      demoRef.current?.setBrake(false);
    };

    const down = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      sync();
    };
    const up = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
      sync();
    };
    const onVirtualStick = (event: Event) => {
      const detail = (event as CustomEvent<{ x?: unknown; y?: unknown; active?: unknown }>).detail;
      const x = Number(detail?.x ?? 0);
      const y = Number(detail?.y ?? 0);
      virtualX = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
      virtualY = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
      virtualActive = detail?.active === true;
      sync();
    };
    const onGlobalPointerEnd = (event: PointerEvent) => {
      if (steerPointerRef.current === event.pointerId) hardResetInput();
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") hardResetInput();
    };

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("sky-dancer-virtual-stick", onVirtualStick);
    window.addEventListener("pointerup", onGlobalPointerEnd, true);
    window.addEventListener("pointercancel", onGlobalPointerEnd, true);
    window.addEventListener("blur", hardResetInput);
    window.addEventListener("pagehide", hardResetInput);
    window.addEventListener("pageshow", hardResetInput);
    window.addEventListener("orientationchange", hardResetInput);
    window.addEventListener("cart-rogue-menu-pause", hardResetInput);
    document.addEventListener("visibilitychange", onVisibility);

    if (typeof navigator !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetInputState = () => ({
        keys: [...keys],
        virtualX,
        virtualY,
        virtualActive,
        steerPointerId: steerPointerRef.current,
        boostPointers: boostPointersRef.current.size,
        brakePointers: brakePointersRef.current.size,
      });
    }

    return () => {
      hardResetInput();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("sky-dancer-virtual-stick", onVirtualStick);
      window.removeEventListener("pointerup", onGlobalPointerEnd, true);
      window.removeEventListener("pointercancel", onGlobalPointerEnd, true);
      window.removeEventListener("blur", hardResetInput);
      window.removeEventListener("pagehide", hardResetInput);
      window.removeEventListener("pageshow", hardResetInput);
      window.removeEventListener("orientationchange", hardResetInput);
      window.removeEventListener("cart-rogue-menu-pause", hardResetInput);
      document.removeEventListener("visibilitychange", onVisibility);
      if (typeof navigator !== "undefined" && navigator.webdriver) {
        delete (window as unknown as Record<string, unknown>).__skyDancerGetInputState;
      }
    };
  }, []);
'''
if old_effect not in source:
    raise SystemExit('V34 marker missing: keyboard input effect')
source = source.replace(old_effect, new_effect, 1)

old_start = '''    event.currentTarget.setPointerCapture(event.pointerId);
    demoRef.current?.setSteering(0);
'''
new_start = '''    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Global pointer/lifecycle release guards remain authoritative on Safari.
    }
    demoRef.current?.setSteering(0);
'''
if old_start not in source:
    raise SystemExit('V34 marker missing: direct steer capture')
source = source.replace(old_start, new_start, 1)

old_release = '''    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const pressBoost'''
new_release = '''    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be gone after an iOS browser transition.
    }
  };

  const pressBoost'''
if old_release not in source:
    raise SystemExit('V34 marker missing: direct steer release')
source = source.replace(old_release, new_release, 1)

marker = '''  const rerollCost = perkOffer ? 8 + perkOffer.rerollIndex * 4 : 0;

  return (
'''
replacement = '''  const rerollCost = perkOffer ? 8 + perkOffer.rerollIndex * 4 : 0;
  const activeMode = typeof document !== "undefined" ? document.documentElement.dataset.skyDancerMode : "";
  const usesExternalVirtualPad = activeMode === "sky-raid" || activeMode === "turbo-hunt";

  return (
'''
if marker not in source:
    raise SystemExit('V34 marker missing: render prelude')
source = source.replace(marker, replacement, 1)

old_zone = '''        <div
          className={styles.steerZone}
          role="slider"
          aria-label="Steering"
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={0}
          onPointerDown={startSteer}
          onPointerMove={moveSteer}
          onPointerUp={releaseSteer}
          onPointerCancel={releaseSteer}
          onLostPointerCapture={releaseSteer}
        >
          <span>{typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid" ? "FLIGHT STICK · TURN / CLIMB" : `ARCADE TURN · BUILD ×${getCartRunModifiers().steeringSensitivity.toFixed(2)}`}</span>
        </div>
'''
new_zone = '''        {!usesExternalVirtualPad && (
          <div
            className={styles.steerZone}
            role="slider"
            aria-label="Steering"
            aria-valuemin={-1}
            aria-valuemax={1}
            aria-valuenow={0}
            onPointerDown={startSteer}
            onPointerMove={moveSteer}
            onPointerUp={releaseSteer}
            onPointerCancel={releaseSteer}
            onLostPointerCapture={releaseSteer}
          >
            <span>{`ARCADE TURN · BUILD ×${getCartRunModifiers().steeringSensitivity.toFixed(2)}`}</span>
          </div>
        )}
'''
if old_zone not in source:
    raise SystemExit('V34 marker missing: legacy steering zone')
source = source.replace(old_zone, new_zone, 1)
path.write_text(source)

test_path = Path('tests/sky-sky-raid.test.ts')
test_source = test_path.read_text().rstrip() + '\n\n'
test_source += r'''test("SKY RAID V34 gives iPhone stick input one direct owner with redundant neutral release paths", () => {
  const padSource = readFileSync(new URL("../app/SkyDancerArcadeVirtualPad.tsx", import.meta.url), "utf8");
  const gameSource = readFileSync(new URL("../app/CartRogueGame.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(padSource, /new KeyboardEvent/);
  assert.match(padSource, /sky-dancer-virtual-stick/);
  assert.match(padSource, /onTouchStart=\{onTouchStart\}/);
  assert.match(padSource, /document\.addEventListener\("touchend", onGlobalTouchEnd, true\)/);
  assert.match(padSource, /document\.addEventListener\("touchcancel", onGlobalTouchEnd, true\)/);
  assert.match(padSource, /publishStick\(\{ x: 0, y: 0, active: false, source: "reset" \}\)/);
  assert.match(gameSource, /window\.addEventListener\("sky-dancer-virtual-stick", onVirtualStick\)/);
  assert.match(gameSource, /keys\.clear\(\)/);
  assert.match(gameSource, /window\.addEventListener\("pagehide", hardResetInput\)/);
  assert.match(gameSource, /window\.addEventListener\("blur", hardResetInput\)/);
  assert.match(gameSource, /document\.addEventListener\("visibilitychange", onVisibility\)/);
  assert.match(gameSource, /usesExternalVirtualPad/);
  assert.match(gameSource, /!usesExternalVirtualPad &&/);
});
''' + '\n'
test_path.write_text(test_source)
print('SKY RAID V34 stick release repair staged')

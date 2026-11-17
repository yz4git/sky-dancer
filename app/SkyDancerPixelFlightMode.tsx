"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { SkyDancerStartRequest } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  createPixelFlightRun, createPixelWorld, PIXEL_RUN_SECONDS,
  stepPixelFlight, type PixelCamera, type PixelFlightInput, type PixelFlightState,
} from "../src/sky/pixel/SkyDancerPixelFlightCore";
import { SkyDancerPixelFlightRenderer } from "../src/sky/pixel/SkyDancerPixelFlightRenderer";
import styles from "./SkyDancerPixelFlightMode.module.css";

const PAUSE_EVENT = "cart-rogue-menu-pause";
const RESUME_EVENT = "cart-rogue-menu-resume";
const CAMERA_ORDER: PixelCamera[] = ["chase", "map", "cockpit"];
const STORAGE_KEY = "sky-dancer-pixel-flight-best";

function displayTime(seconds: number) {
  const t = Math.max(0, Math.ceil(PIXEL_RUN_SECONDS - seconds));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function readBest() {
  try { return Math.max(0, Number(localStorage.getItem(STORAGE_KEY)) || 0); }
  catch { return 0; }
}
function writeBest(score: number) {
  try { localStorage.setItem(STORAGE_KEY, String(Math.round(score))); } catch { /* Storage may be unavailable. */ }
}
type Props = { request: SkyDancerStartRequest; onReturnTitle: () => void; };

export default function SkyDancerPixelFlightMode({ request, onReturnTitle }: Props) {
  const seed = request.seed ?? 11017;
  const world = useMemo(() => createPixelWorld(seed), [seed]);
  const initial = useMemo(() => {
    const run = createPixelFlightRun(world, seed ^ 0x43728);
    if (request.difficulty === "hard") run.shield = 2;
    return run;
  }, [world, seed, request.difficulty]);
  const stateRef = useRef<PixelFlightState>(initial);
  const inputRef = useRef<PixelFlightInput>({ x: 0, y: 0, boost: false });
  const pressedKeys = useRef(new Set<string>());
  const joystickPointer = useRef<number | null>(null);
  const boostPointers = useRef(new Set<number>());
  const verticalPointers = useRef(new Map<number, -1 | 1>());
  const stickRef = useRef<HTMLDivElement>(null);
  const frameCanvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const scoreRecorded = useRef(false);
  const [snapshot, setSnapshot] = useState<PixelFlightState>(() => ({ ...initial }));
  const [best, setBest] = useState(0);
  const [camera, setCamera] = useState<PixelCamera>("chase");
  const cameraRef = useRef<PixelCamera>("chase");
  const [stickVisual, setStickVisual] = useState({ x: 0, y: 0 });
  const [boostActive, setBoostActive] = useState(false);
  const [paused, setPaused] = useState(false);

  const release = () => {
    pressedKeys.current.clear();
    joystickPointer.current = null;
    boostPointers.current.clear();
    verticalPointers.current.clear();
    inputRef.current = { x: 0, y: 0, boost: false };
    setStickVisual({ x: 0, y: 0 });
    setBoostActive(false);
  };
  const syncKeyboard = () => {
    const keys = pressedKeys.current;
    const x = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
    const y = Number(keys.has("arrowup") || keys.has("w")) - Number(keys.has("arrowdown") || keys.has("s"));
    if (joystickPointer.current === null) { inputRef.current.x = x; inputRef.current.y = y; }
    if (verticalPointers.current.size && joystickPointer.current === null) {
      inputRef.current.y = [...verticalPointers.current.values()].at(-1) ?? 0;
    }
    inputRef.current.boost = boostPointers.current.size > 0 || keys.has(" ") || keys.has("shift");
    setBoostActive(inputRef.current.boost);
  };
  const changeCamera = () => {
    const next = CAMERA_ORDER[(CAMERA_ORDER.indexOf(cameraRef.current) + 1) % CAMERA_ORDER.length];
    cameraRef.current = next;
    setCamera(next);
  };
  const updateStick = (x: number, y: number) => {
    const node = stickRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (x - rect.left - rect.width / 2) / (rect.width * .32)));
    const ny = Math.max(-1, Math.min(1, -(y - rect.top - rect.height / 2) / (rect.height * .32)));
    inputRef.current.x = Math.abs(nx) < .16 ? 0 : nx;
    inputRef.current.y = Math.abs(ny) < .16 ? 0 : ny;
    setStickVisual({ x: nx, y: ny });
  };
  const stickStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== null) return;
    event.preventDefault();
    joystickPointer.current = event.pointerId;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Global release fallback. */ }
    updateStick(event.clientX, event.clientY);
  };
  const stickMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    event.preventDefault();
    updateStick(event.clientX, event.clientY);
  };
  const endPointer = (id: number) => {
    if (joystickPointer.current === id) {
      joystickPointer.current = null;
      setStickVisual({ x: 0, y: 0 });
      inputRef.current.x = 0;
      inputRef.current.y = 0;
    }
    boostPointers.current.delete(id);
    verticalPointers.current.delete(id);
    syncKeyboard();
  };
  const boostStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    boostPointers.current.add(event.pointerId);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Global release fallback. */ }
    syncKeyboard();
  };
  const verticalStart = (direction: -1 | 1, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    verticalPointers.current.set(event.pointerId, direction);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Global release fallback. */ }
    syncKeyboard();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        pressedKeys.current.add(key);
        syncKeyboard();
      } else if (key === "c" && !event.repeat) changeCamera();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase());
      syncKeyboard();
    };
    const onGlobalEnd = (event: PointerEvent) => endPointer(event.pointerId);
    const onPause = () => { pausedRef.current = true; release(); setPaused(true); };
    const onResume = () => { pausedRef.current = false; release(); setPaused(false); };
    const onVisibility = () => { if (document.visibilityState !== "visible") onPause(); };
    const onLostFocus = () => onPause();
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onGlobalEnd, true);
    window.addEventListener("pointercancel", onGlobalEnd, true);
    window.addEventListener(PAUSE_EVENT, onPause);
    window.addEventListener(RESUME_EVENT, onResume);
    window.addEventListener("blur", onLostFocus);
    window.addEventListener("pagehide", onLostFocus);
    document.addEventListener("visibilitychange", onVisibility);
    // Defer storage hydration until the next browser task (React effect hygiene).
    const hydrateBest = window.setTimeout(() => setBest(readBest()), 0);
    return () => {
      window.clearTimeout(hydrateBest);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onGlobalEnd, true);
      window.removeEventListener("pointercancel", onGlobalEnd, true);
      window.removeEventListener(PAUSE_EVENT, onPause);
      window.removeEventListener(RESUME_EVENT, onResume);
      window.removeEventListener("blur", onLostFocus);
      window.removeEventListener("pagehide", onLostFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const canvas = frameCanvas.current;
    if (!canvas) return;
    const renderer = new SkyDancerPixelFlightRenderer(canvas);
    let raf = 0, last = performance.now(), accumulator = 0, lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(.08, (now - last) / 1000));
      last = now;
      const state = stateRef.current;
      if (!pausedRef.current && !state.finished) {
        accumulator = Math.min(.12, accumulator + dt);
        const fixed = 1 / 60;
        for (let steps = 0; accumulator >= fixed && steps < 5; steps++) {
          stepPixelFlight(world, state, inputRef.current, fixed);
          accumulator -= fixed;
        }
      } else accumulator = 0;
      renderer.draw(world, state, cameraRef.current, now / 1000);
      if (now - lastUi > 110 || (state.finished && !scoreRecorded.current)) {
        lastUi = now;
        setSnapshot({ ...state, gates: state.gates.slice() });
      }
      if (state.finished && !scoreRecorded.current) {
        scoreRecorded.current = true;
        const next = Math.max(readBest(), Math.round(state.score));
        setBest(next);
        writeBest(next);
        release();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [world]);

  const retry = () => {
    const next = createPixelFlightRun(world, seed ^ ((Date.now() >>> 0) & 0x7fffffff));
    if (request.difficulty === "hard") next.shield = 2;
    stateRef.current = next;
    scoreRecorded.current = false;
    pausedRef.current = false;
    setPaused(false);
    release();
    setSnapshot({ ...next });
  };
  const lives = "◆".repeat(Math.max(0, snapshot.shield)) + "◇".repeat(Math.max(0, 3 - snapshot.shield));
  return (
    <section className={styles.shell} aria-label="Sky Dancer Pixel Flight">
      <canvas ref={frameCanvas} className={styles.canvas} aria-label="Software rendered island flight scene" />
      <div className={styles.hud}>
        <div className={styles.heading}><small>SKY DANCER / NEW MODE</small><strong>PIXEL FLIGHT</strong></div>
        <div className={styles.stats}>
          <span><small>SCORE</small><strong>{Math.floor(snapshot.score).toLocaleString()}</strong></span>
          <span><small>TIME</small><strong>{displayTime(snapshot.elapsed)}</strong></span>
          <span><small>GATES</small><strong>{snapshot.gatesPassed}</strong></span>
          <span><small>SHIELD</small><strong className={styles.lives}>{lives}</strong></span>
        </div>
        <button className={styles.cameraButton} onClick={changeCamera} aria-label="Change camera view">
          <small>CAMERA</small><strong>{camera.toUpperCase()}</strong>
        </button>
      </div>
      <div className={styles.telemetry} aria-live="off">
        <span>ALT {Math.round(snapshot.z)}m</span>
        <span>SPD {Math.round(snapshot.speed * 10)}</span>
        <span>BOOST {Math.round(snapshot.charge * 100)}%</span>
        <span>BEST {best.toLocaleString()}</span>
      </div>
      <div className={styles.hint}>FLY THROUGH GOLD GATES · STAY CLEAR OF TERRAIN · BOOST FOR BONUS</div>
      {!snapshot.finished && !paused && (
        <div className={styles.controls} aria-label="Pixel flight touch controls">
          <div
            ref={stickRef}
            className={styles.stick}
            role="slider"
            aria-label="Turn and climb flight stick"
            aria-valuemin={-1}
            aria-valuemax={1}
            aria-valuenow={Math.round(stickVisual.x)}
            onPointerDown={stickStart}
            onPointerMove={stickMove}
            onPointerUp={(event) => endPointer(event.pointerId)}
            onPointerCancel={(event) => endPointer(event.pointerId)}
          >
            <div className={styles.stickGrid} />
            <span className={styles.stickKnob} style={{ transform: `translate(${stickVisual.x * 36}px, ${-stickVisual.y * 36}px)` }} />
            <small>TURN / CLIMB</small>
          </div>
          <div className={styles.actions}>
            <div className={styles.vertical}>
              <button onPointerDown={(event) => verticalStart(1, event)} onPointerUp={(event) => endPointer(event.pointerId)} onPointerCancel={(event) => endPointer(event.pointerId)} aria-label="Climb">▲</button>
              <button onPointerDown={(event) => verticalStart(-1, event)} onPointerUp={(event) => endPointer(event.pointerId)} onPointerCancel={(event) => endPointer(event.pointerId)} aria-label="Dive">▼</button>
            </div>
            <button className={`${styles.boost} ${boostActive ? styles.boosting : ""}`}
              onPointerDown={boostStart}
              onPointerUp={(event) => endPointer(event.pointerId)}
              onPointerCancel={(event) => endPointer(event.pointerId)}
              aria-label="Hold turbo boost">BOOST</button>
          </div>
        </div>
      )}
      {snapshot.finished && (
        <div className={styles.result} role="dialog" aria-modal="true" aria-label="Pixel Flight result">
          <div className={styles.resultInner}>
            <small>{snapshot.shield <= 0 ? "AIRFRAME LOST" : "MISSION COMPLETE"}</small>
            <h2>PIXEL FLIGHT</h2>
            <strong>{Math.floor(snapshot.score).toLocaleString()} PTS</strong>
            <p>{snapshot.gatesPassed} GATES · BEST {best.toLocaleString()}</p>
            <div className={styles.resultActions}>
              <button onClick={retry}>RETRY FLIGHT</button>
              <button onClick={onReturnTitle}>BACK TO TITLE</button>
            </div>
          </div>
        </div>
      )}
      {paused && !snapshot.finished && <span className={styles.pausedNotice}>FLIGHT PAUSED</span>}
      <div className={styles.portraitHint}>ROTATE TO LANDSCAPE TO FLY</div>
    </section>
  );
}

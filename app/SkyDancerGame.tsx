"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SkyCanvasPreview } from "../src/sky/SkyCanvasPreview";
import type { SkyDemoHandle } from "../src/sky/SkyDemo";
import { createSkyRenderer } from "../src/sky/SkyRenderer";
import { SkyWebGLDemo } from "../src/sky/SkyWebGLDemo";
import type { SkyStats } from "../src/sky/SkyTypes";

const INITIAL_STATS: SkyStats = {
  phase: "ready",
  score: 0,
  hull: 5,
  maxHull: 5,
  wave: 1,
  enemies: 0,
  shots: 0,
  hits: 0,
  speed: 18,
  message: "STARTで飛行開始",
  plane: { x: 0, y: 6.5, z: 0, speed: 18 },
  renderer: "webgl",
};

function updateMove(demo: SkyDemoHandle | null, origin: { x: number; y: number }, x: number, y: number): void {
  const moveX = Math.max(-1, Math.min(1, (x - origin.x) / 105));
  const moveY = Math.max(-1, Math.min(1, (origin.y - y) / 92));
  demo?.setMove(moveX, moveY);
}

export default function SkyDancerGame() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<SkyDemoHandle | null>(null);
  const movePointerRef = useRef<number | null>(null);
  const moveOriginRef = useRef({ x: 0, y: 0 });
  const firePointerRef = useRef<number | null>(null);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    const mount = viewportRef.current;
    if (!mount) return undefined;
    const params = new URLSearchParams(window.location.search);
    const forceCanvas = params.get("renderer") === "canvas" || params.get("test") === "2d";
    const webglAvailable = Boolean(document.createElement("canvas").getContext("webgl"));
    const demo = createSkyRenderer(
      forceCanvas,
      webglAvailable,
      () => new SkyWebGLDemo(mount, setStats),
      () => new SkyCanvasPreview(mount, setStats),
      (error) => {
        console.error("[Sky Dancer] WebGL initialization failed; using Canvas fallback", error);
        setRuntimeError("WebGLを開始できないため、Canvas 2D表示に切り替えました。");
      },
    );
    demoRef.current = demo;
    setStats(demo.getStats());
    return () => {
      demo.dispose();
      demoRef.current = null;
    };
  }, []);

  const startGame = () => {
    setRuntimeError(null);
    demoRef.current?.start();
  };

  const resetGame = () => {
    demoRef.current?.reset();
    demoRef.current?.start();
  };

  const beginMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    movePointerRef.current = event.pointerId;
    moveOriginRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    updateMove(demoRef.current, moveOriginRef.current, event.clientX, event.clientY);
  };

  const movePlane = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    updateMove(demoRef.current, moveOriginRef.current, event.clientX, event.clientY);
  };

  const endMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    movePointerRef.current = null;
    demoRef.current?.setMove(0, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const beginFire = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    firePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    demoRef.current?.setFire(true);
  };

  const endFire = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (firePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    firePointerRef.current = null;
    demoRef.current?.setFire(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const isReady = stats.phase === "ready";
  const isGameOver = stats.phase === "gameover";
  return (
    <main className="sky-shell" aria-label="Sky Dancer air combat game">
      <div ref={viewportRef} className="sky-viewport" />

      <h1 className="sky-brand">SKY DANCER <span>AIR COMBAT // INITIAL FLIGHT</span></h1>
      <div className="sky-renderer">{stats.renderer === "webgl" ? "WEBGL" : "CANVAS 2D"}</div>

      <section className="sky-hud" aria-label="Flight status">
        <div className="sky-hud-card hull"><span>HULL</span><strong>{"◆".repeat(stats.hull)}<i>{"◇".repeat(stats.maxHull - stats.hull)}</i></strong></div>
        <div className="sky-hud-card"><span>SCORE</span><strong>{String(stats.score).padStart(4, "0")}</strong></div>
        <div className="sky-hud-card"><span>WAVE</span><strong>{String(stats.wave).padStart(2, "0")}</strong></div>
        <div className="sky-hud-card target"><span>TARGETS</span><strong>{stats.enemies}</strong><small>HIT {stats.hits}</small></div>
      </section>

      <div className={`sky-message ${stats.phase === "gameover" ? "danger" : ""}`}><strong>{stats.message}</strong><span>{Math.round(stats.speed)} SPEED</span></div>
      {runtimeError && <div className="sky-runtime-note" role="status">{runtimeError}</div>}

      <div
        className="sky-move-zone"
        aria-label="Move aircraft"
        onPointerDown={beginMove}
        onPointerMove={movePlane}
        onPointerUp={endMove}
        onPointerCancel={endMove}
      >
        <span>DRAG TO MOVE</span>
        <i />
      </div>
      <button
        className={`sky-fire-button ${stats.phase !== "running" ? "dim" : ""}`}
        aria-label="Fire"
        onPointerDown={beginFire}
        onPointerUp={endFire}
        onPointerCancel={endFire}
      >
        <strong>FIRE</strong><small>{stats.shots}</small>
      </button>

      {(isReady || isGameOver) && (
        <section className="sky-start-panel" aria-label={isGameOver ? "Game over" : "Start game"}>
          <span className="sky-kicker">{isGameOver ? "MISSION FAILED" : "FLIGHT DECK // 01"}</span>
          <h2>{isGameOver ? "AIRFRAME LOST" : "SKY DANCER"}</h2>
          <p>{isGameOver ? `SCORE ${stats.score} · WAVE ${stats.wave}` : "空中飛行面を駆け抜け、飛来するドローンを撃墜する。"}</p>
          <button className="sky-start-button" onClick={isGameOver ? resetGame : startGame}>{isGameOver ? "RESTART" : "START FLIGHT"}</button>
          <small>左下をドラッグして移動 · 右下を押して射撃</small>
        </section>
      )}
    </main>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { SkyDancerStartRequest } from "../src/sky/arcade/SkyDancerArcadeData";
import { skyDancerArcadeStageById } from "../src/sky/arcade/SkyDancerArcadeData";
import { normalizeArcadeStick } from "../src/sky/arcade/SkyDancerArcadeInput";
import { SkyDancerArcadeCanvasDemo } from "../src/sky/arcade/SkyDancerArcadeCanvasDemo";
import {
  SKY_DANCER_ARCADE_MAX_MEDALS,
  loadSkyDancerArcadeProgress,
  recordSkyDancerArcadeRunClear,
  recordSkyDancerArcadeStageClear,
  skyDancerArcadeNextMasteryReward,
} from "../src/sky/arcade/SkyDancerArcadeProgress";
import { SkyDancerArcadeRuntime, type SkyDancerArcadeSnapshot } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  SkyDancerArcadeWebGLDemo,
  type SkyDancerArcadeDemoHandle,
} from "../src/sky/arcade/SkyDancerArcadeWebGLDemo";
import styles from "./SkyDancerArcadeMode.module.css";
import productStyles from "./SkyDancerArcadeProduct.module.css";

const MENU_PAUSE_EVENT = "cart-rogue-menu-pause";
const MENU_RESUME_EVENT = "cart-rogue-menu-resume";

interface SkyDancerArcadeModeProps {
  request: SkyDancerStartRequest;
  onReturnTitle: () => void;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function CombatIcon({ kind }: { kind: "fire" | "lock" | "turbo" }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    {kind === "fire" ? <><path d="M11 24V13l5-7 5 7v11M11 16h10M16 3v-2M6 13H3m26 0h-3M16 27v4" /><path d="M14 22h4v5h-4z" /></>
      : kind === "lock" ? <><path d="M5 12V5h7m8 0h7v7m0 8v7h-7m-8 0H5v-7" /><circle cx="16" cy="16" r="6" /><path d="M16 7v4m0 10v4M7 16h4m10 0h4" /></>
        : <><path d="m9 18 7-11 7 11M9 26l7-11 7 11M13 30l3-6 3 6" /></>}
  </svg>;
}

export default function SkyDancerArcadeMode({ request, onReturnTitle }: SkyDancerArcadeModeProps) {
  const [runSerial, setRunSerial] = useState(0);
  const runtimeOptions = useMemo(() => ({
    difficulty: request.difficulty,
    mode: request.mode === "stage-practice" ? "stage-practice" as const : "arcade-run" as const,
    startStageId: request.practiceStageId,
    paintScheme: request.paintScheme ?? "default",
    loadout: request.loadout ?? "standard",
    seed: (request.seed ?? 0x51f15e) ^ Math.imul(runSerial + 1, 0x45d9f3b),
  }), [request.difficulty, request.loadout, request.mode, request.paintScheme, request.practiceStageId, request.seed, runSerial]);
  const initialSnapshot = useMemo(() => new SkyDancerArcadeRuntime(runtimeOptions).getSnapshot(), [runtimeOptions]);
  const mountRef = useRef<HTMLDivElement>(null);
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<SkyDancerArcadeDemoHandle | null>(null);
  const movePointerRef = useRef<number | null>(null);
  const moveOriginRef = useRef({ x: 0, y: 0, radius: 48 });
  const firePointersRef = useRef(new Set<number>());
  const lockPointersRef = useRef(new Set<number>());
  const turboPointersRef = useRef(new Set<number>());
  const keyboardKeysRef = useRef(new Set<string>());
  const recordedResultRef = useRef(0);
  const recordedRunClearRef = useRef(false);
  const [snapshot, setSnapshot] = useState<SkyDancerArcadeSnapshot>(initialSnapshot);
  const [rendererName, setRendererName] = useState<"WEBGL" | "CANVAS">("WEBGL");
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });

  const releaseAllInputs = useCallback((updateStick = true) => {
    movePointerRef.current = null;
    firePointersRef.current.clear();
    lockPointersRef.current.clear();
    turboPointersRef.current.clear();
    keyboardKeysRef.current.clear();
    if (updateStick) setStick({ x: 0, y: 0 });
    demoRef.current?.releaseInputs();
  }, []);

  const releasePointerInput = useCallback((pointerId: number) => {
    if (movePointerRef.current === pointerId) {
      movePointerRef.current = null;
      setStick({ x: 0, y: 0 });
      demoRef.current?.setMove(0, 0);
    }
    if (firePointersRef.current.delete(pointerId) && firePointersRef.current.size === 0) demoRef.current?.setFire(false);
    if (lockPointersRef.current.delete(pointerId) && lockPointersRef.current.size === 0) demoRef.current?.setLock(false);
    if (turboPointersRef.current.delete(pointerId) && turboPointersRef.current.size === 0) demoRef.current?.setTurbo(false);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let demo: SkyDancerArcadeDemoHandle | null = null;
    let switching = false;
    recordedResultRef.current = 0;
    recordedRunClearRef.current = false;
    setSnapshot(new SkyDancerArcadeRuntime(runtimeOptions).getSnapshot());
    setRendererName("WEBGL");
    setRuntimeMessage(null);
    mount.replaceChildren();

    const handleSnapshot = (next: SkyDancerArcadeSnapshot) => setSnapshot(next);
    const startCanvas = (message?: string) => {
      if (switching) return;
      switching = true;
      demo?.dispose();
      mount.replaceChildren();
      demo = new SkyDancerArcadeCanvasDemo(mount, runtimeOptions, handleSnapshot);
      demoRef.current = demo;
      setRendererName("CANVAS");
      if (message) setRuntimeMessage(message);
      switching = false;
    };

    try {
      const probe = document.createElement("canvas");
      const probeContext = probe.getContext("webgl2");
      const hasWebGL = Boolean(probeContext);
      probeContext?.getExtension("WEBGL_lose_context")?.loseContext();
      if (!hasWebGL) startCanvas("WebGLを利用できないためCanvas表示で続行しています。");
      else {
        demo = new SkyDancerArcadeWebGLDemo(mount, runtimeOptions, handleSnapshot, (message, error) => {
          console.error("[Sky Dancer Arcade] WebGL runtime failure", error);
          startCanvas(message);
        });
        demoRef.current = demo;
      }
    } catch (error) {
      console.error("[Sky Dancer Arcade] renderer initialization failed", error);
      startCanvas("3D初期化に失敗したためCanvas表示へ切り替えました。");
    }

    return () => {
      demo?.releaseInputs();
      demo?.dispose();
      demoRef.current = null;
    };
  }, [runSerial, runtimeOptions]);

  useEffect(() => {
    const pause = () => {
      releaseAllInputs();
      demoRef.current?.pause();
    };
    const resume = () => demoRef.current?.resume();
    window.addEventListener(MENU_PAUSE_EVENT, pause);
    window.addEventListener(MENU_RESUME_EVENT, resume);
    return () => {
      window.removeEventListener(MENU_PAUSE_EVENT, pause);
      window.removeEventListener(MENU_RESUME_EVENT, resume);
    };
  }, [releaseAllInputs]);

  useEffect(() => {
    const onPointerUp = (event: PointerEvent) => releasePointerInput(event.pointerId);
    const cancel = () => releaseAllInputs();
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") cancel();
    };
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("pagehide", cancel);
    window.addEventListener("orientationchange", cancel);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pagehide", cancel);
      window.removeEventListener("orientationchange", cancel);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseAllInputs(false);
    };
  }, [releaseAllInputs, releasePointerInput]);

  useEffect(() => {
    if (snapshot.resultSerial <= recordedResultRef.current || !snapshot.lastClearedStageId) return;
    recordedResultRef.current = snapshot.resultSerial;
    recordSkyDancerArcadeStageClear(
      snapshot.lastClearedStageId,
      snapshot.lastStageScore,
      snapshot.lastStageRank,
      snapshot.lastStageNoDamage,
      snapshot.lastStageMedals.filter(medal => medal.earned).map(medal => medal.id),
    );
  }, [snapshot.lastClearedStageId, snapshot.lastStageMedals, snapshot.lastStageNoDamage, snapshot.lastStageRank, snapshot.lastStageScore, snapshot.resultSerial]);

  useEffect(() => {
    if (snapshot.status !== "run-clear" || recordedRunClearRef.current) return;
    recordedRunClearRef.current = true;
    recordSkyDancerArcadeRunClear(snapshot.score, snapshot.rank, snapshot.continuesUsed, {
      route: snapshot.route,
      kills: snapshot.enemiesDefeated,
      nearMisses: snapshot.nearMisses,
      bossKills: snapshot.bossKills,
      armorBreaks: snapshot.armorBreaks,
      formationBreaks: snapshot.formationBreaks,
      bestChain: snapshot.bestChain,
      medalsEarned: snapshot.runMedalsEarned,
    });
  }, [snapshot.continuesUsed, snapshot.rank, snapshot.score, snapshot.status]);

  useEffect(() => {
    if (snapshot.status === "running") return undefined;
    const timer = window.setTimeout(() => releaseAllInputs(), 0);
    return () => window.clearTimeout(timer);
  }, [releaseAllInputs, snapshot.status]);

  useEffect(() => {
    const keys = keyboardKeysRef.current;
    const sync = () => {
      const left = keys.has("a") || keys.has("arrowleft");
      const right = keys.has("d") || keys.has("arrowright");
      const up = keys.has("w") || keys.has("arrowup");
      const down = keys.has("s") || keys.has("arrowdown");
      demoRef.current?.setMove(left === right ? 0 : left ? -1 : 1, up === down ? 0 : up ? 1 : -1);
      demoRef.current?.setFire(keys.has("x") || keys.has("f"));
      demoRef.current?.setLock(keys.has("c") || keys.has("e"));
      demoRef.current?.setTurbo(keys.has(" ") || keys.has("shift"));
    };
    const keyDown = (event: KeyboardEvent) => {
      if (demoRef.current?.getSnapshot().status !== "running") return;
      const key = event.key.toLowerCase();
      keys.add(key);
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) event.preventDefault();
      sync();
    };
    const keyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
      sync();
    };
    const clearKeys = () => {
      keys.clear();
      demoRef.current?.releaseInputs();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") clearKeys();
    };
    window.addEventListener("keydown", keyDown, { passive: false });
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);
    window.addEventListener(MENU_PAUSE_EVENT, clearKeys);
    window.addEventListener("orientationchange", clearKeys);
    window.addEventListener("pagehide", clearKeys);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearKeys);
      window.removeEventListener(MENU_PAUSE_EVENT, clearKeys);
      window.removeEventListener("orientationchange", clearKeys);
      window.removeEventListener("pagehide", clearKeys);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      keys.clear();
    };
  }, []);

  const startMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (movePointerRef.current !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = stickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    movePointerRef.current = event.pointerId;
    moveOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: rect.width * .36 };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Window release remains the fallback. */ }
    const center = moveOriginRef.current;
    const next = normalizeArcadeStick(event.clientX - center.x, event.clientY - center.y, center.radius);
    setStick(next); demoRef.current?.setMove(next.x, next.y);
  };

  const moveStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    if (event.pointerType === "mouse" && event.buttons === 0) { releasePointerInput(event.pointerId); return; }
    const { x, y } = normalizeArcadeStick(event.clientX - moveOriginRef.current.x, event.clientY - moveOriginRef.current.y, moveOriginRef.current.radius);
    setStick({ x, y });
    demoRef.current?.setMove(x, y);
  };

  const releaseMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    releasePointerInput(event.pointerId);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore Safari capture-state races.
    }
  };

  const pressAction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    pointers: MutableRefObject<Set<number>>,
    setter: (active: boolean) => void,
  ) => {
    event.preventDefault();
    if (pointers.current.size === 0) setter(true);
    pointers.current.add(event.pointerId);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Safari can reject capture during orientation changes.
    }
  };

  const releaseAction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    pointers: MutableRefObject<Set<number>>,
    setter: (active: boolean) => void,
  ) => {
    event.preventDefault();
    if (event.type === "pointercancel" || event.type === "lostpointercapture") {
      if (pointers.current.has(event.pointerId)) releaseAllInputs();
      return;
    }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) setter(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore Safari capture-state races.
    }
  };

  const restart = () => {
    releaseAllInputs();
    setRunSerial((value) => value + 1);
  };

  const courseRemaining = snapshot.mode === "stage-practice"
    ? Math.max(0, snapshot.stageDurationSeconds - snapshot.stageTimeSeconds)
    : Math.max(0, snapshot.runDurationSeconds - snapshot.runTimeSeconds);
  const courseProgress = snapshot.mode === "stage-practice"
    ? snapshot.stageProgress
    : Math.min(1, snapshot.runTimeSeconds / snapshot.runDurationSeconds);
  const hpPercent = Math.max(0, Math.round(snapshot.playerHp / snapshot.playerMaxHp * 100));
  const bossPercent = snapshot.bossMaxHp > 0 ? Math.round(snapshot.bossHp / snapshot.bossMaxHp * 100) : 0;
  const bossEnemy = snapshot.enemies.find((enemy) => enemy.boss) ?? null;
  const bossArmorPercent = bossEnemy && bossEnemy.maxArmor > 0 ? Math.round(bossEnemy.armor / bossEnemy.maxArmor * 100) : 0;
  const incomingMissiles = snapshot.projectiles.filter((projectile) => projectile.owner === "enemy"
    && projectile.depth > 2.2 && projectile.depth < 34
    && Math.hypot(projectile.x - snapshot.playerX, projectile.y - snapshot.playerY) < 1.9);
  const missileDanger = incomingMissiles.some((projectile) => projectile.depth < 17);
  const controlsVisible = snapshot.status === "running";
  const finalOverlay = snapshot.status === "run-clear" || snapshot.status === "practice-clear" || snapshot.status === "game-over";
  const persistedArcadeProgress = loadSkyDancerArcadeProgress();
  const persistedPracticeMedals = runtimeOptions.mode === "stage-practice" && runtimeOptions.startStageId
    ? persistedArcadeProgress.records[runtimeOptions.startStageId]?.medals ?? []
    : [];
  const currentEarnedMedals = snapshot.lastStageMedals.filter((medal) => medal.earned).map((medal) => medal.id);
  const projectedStageMedals = new Set([...persistedPracticeMedals, ...currentEarnedMedals]);
  const projectedNewMedals = Math.max(0, projectedStageMedals.size - persistedPracticeMedals.length);
  const projectedTotalMedals = Math.min(SKY_DANCER_ARCADE_MAX_MEDALS, persistedArcadeProgress.totalMedals + projectedNewMedals);
  const projectedNextMasteryReward = skyDancerArcadeNextMasteryReward(projectedTotalMedals);
  const practiceMasteryCount = snapshot.lastStageMedals.filter((medal) => persistedPracticeMedals.includes(medal.id) || medal.earned).length;
  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !persistedPracticeMedals.includes(medal.id) && !medal.earned);
  const standardFusionActive = snapshot.loadout === "standard" && snapshot.turboActive;
  const fireDoctrine = snapshot.loadout === "gun-focus" ? "TWIN BURST" : snapshot.loadout === "missile-focus" ? "BACKUP GUN" : standardFusionActive ? "FUSION GUN" : "HOLD · GUN";
  const lockDoctrine = snapshot.loadout === "missile-focus" ? "RAPID MULTI" : snapshot.loadout === "gun-focus" ? "TACTICAL LOCK" : standardFusionActive ? "FUSION SALVO" : "RELEASE SALVO";
  const turboDoctrine = snapshot.loadout === "standard" ? (standardFusionActive ? "FUSION LINK" : "LINK DRIVE") : snapshot.turboActive ? "SMASH" : "HOLD";
  const loadoutTacticalName = snapshot.loadout === "gun-focus" ? "CANNON DOCTRINE" : snapshot.loadout === "missile-focus" ? "RIPPLE DOCTRINE" : "FUSION DOCTRINE";
  const loadoutTacticalHint = snapshot.loadout === "gun-focus" ? "SHRED ARMOR · FORCE STAGGER" : snapshot.loadout === "missile-focus" ? "CRUSH ARMOR · SHOCK TARGET" : "TURBO LINK · FINISH FOR REFUND";
  const activeCounterplay = snapshot.enemies.find((enemy) => enemy.counterplay !== "none")?.counterplay ?? "none";
  const counterplayHudLabel = activeCounterplay === "armor-brace" ? "ARMOR BRACE · STAGGER IT" : activeCounterplay === "evasive-roll" ? "EVASIVE ROLL · TRACK IT" : activeCounterplay === "turbo-jammer" ? "TURBO JAMMER · BREAK IT" : "";

  return (
    <main className={`${styles.shell} ${productStyles.productShell}`} onContextMenu={(event) => event.preventDefault()}>
      <section className={styles.stage} aria-label="Sky Dancer Arcade Run">
        <div ref={mountRef} className={styles.viewport} />
        <div className={productStyles.aimGuide} aria-hidden="true"><i /><b /></div>

        <header className={styles.topHud}>
          <div className={styles.stageCard}>
            <small>{snapshot.mode === "stage-practice" ? "SECTION PRACTICE" : `ARCADE RUN · SECTION ${snapshot.stageNumber}/7`}</small>
            <strong>{snapshot.stage.name}</strong>
            <span>{snapshot.stage.subtitle}</span>
            <div className={productStyles.routeProgress} aria-label={`Section ${snapshot.stageNumber} of 7`}>
              {Array.from({ length: snapshot.mode === "stage-practice" ? 1 : 7 }, (_, i) => <i key={i} data-state={i < snapshot.stageNumber - 1 ? "complete" : i === snapshot.stageNumber - 1 ? "current" : "future"} />)}
            </div>
          </div>
          <div className={styles.scoreCard}>
            <small>SCORE</small>
            <strong>{String(snapshot.score).padStart(8, "0")}</strong>
            <span>RANK <b>{snapshot.rank}</b> <i>·</i> {snapshot.enemiesDefeated} DESTROYED</span>
          </div>
          <div className={styles.timeCard}>
            <small>COURSE TIME</small>
            <strong>{formatTime(courseRemaining)}</strong>
            <span>{Math.round(courseProgress * 100)}%</span>
          </div>
        </header>

        <div className={productStyles.timelineBeat} data-kind={snapshot.timelineBeatKind} data-director={snapshot.combatDirectorMode} aria-label="Current course beat">
          <small>COURSE BEAT · {String(snapshot.timelineBeatId).toUpperCase().replaceAll("-", " ")}</small>
          <strong>{snapshot.timelineBeatLabel}</strong>
          <span>{snapshot.timelineSetpiece}</span>
          <em className={productStyles.v12DirectorLine}>COMBAT DIRECTOR · {snapshot.combatDirectorLabel} · {snapshot.combatDirectorIntent}</em>
          <em className={productStyles.v121GrammarLine}>ENCOUNTER · {snapshot.encounterGrammarLabel} · {snapshot.encounterGrammarPhaseLabel} {snapshot.encounterGrammarPhaseIndex}/{snapshot.encounterGrammarPhaseCount} · {snapshot.encounterContinuityLabel}</em>
        </div>

        {snapshot.message && <div className={`${styles.message} ${productStyles.flightMessage}`}>{snapshot.message}</div>}
        {snapshot.chain > 1 && <div className={`${styles.chain} ${productStyles.chainReadout}`}>CHAIN <strong>×{snapshot.chain}</strong></div>}
        {incomingMissiles.length > 0 && (
          <div className={`${styles.missileWarning} ${snapshot.bossActive ? styles.missileWarningBoss : ""} ${missileDanger ? styles.missileDanger : ""}`} aria-live="polite">
            <span>MISSILE</span><strong>×{incomingMissiles.length}</strong><small>{missileDanger ? "BREAK NOW" : "INCOMING"}</small>
          </div>
        )}

        {snapshot.bossActive && (
          <div className={styles.bossHud} aria-label="Climax target">
            <div><small>CLIMAX TARGET · PHASE {snapshot.bossPhase}{snapshot.bossWeakpointOpen ? " · CORE OPEN" : bossArmorPercent > 0 ? ` · ARMOR ${bossArmorPercent}%` : ""}</small><strong>{snapshot.bossName}<em>{snapshot.bossMechanicLabel}</em></strong><span>{bossPercent}%</span></div>
            <i><b style={{ width: `${bossPercent}%` }} /></i>
          </div>
        )}

        {snapshot.branchActive && (
          <div className={styles.routeOverlay}>
            <small>FLY THROUGH A ROUTE GATE</small>
            <div className={styles.routeOptions}>
              {snapshot.branchOptions.map((id, index) => {
                const stage = skyDancerArcadeStageById(id);
                return (
                  <div key={id} className={`${styles.routeOption} ${snapshot.branchSelection === id ? styles.routeSelected : ""}`}>
                    <span>{index === 0 ? "LEFT" : index === snapshot.branchOptions.length - 1 ? "RIGHT" : "CENTER"} · {snapshot.routeRiskLabels[index] ?? "ROUTE"}</span>
                    <strong>{stage.name}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={productStyles.flightStatus} aria-label="Flight status">
          <div className={styles.meterCard}>
            <div><span>AIRFRAME</span><strong>{hpPercent}%</strong></div>
            <i className={styles.hpTrack}><b style={{ width: `${hpPercent}%` }} /></i>
            <small>CONTINUE ×{snapshot.continuesRemaining} <span>NEAR MISS {snapshot.nearMisses}</span></small>
          </div>
          <div className={productStyles.v118LoadoutStatus} data-loadout={snapshot.loadout} data-active={snapshot.loadoutReactionIntensity > 0} data-countered={snapshot.enemyCounterplayCount > 0}>
            <small>{loadoutTacticalName}</small>
            <strong>{snapshot.loadoutReactionLabel ?? loadoutTacticalHint}</strong>
            <span>TACTICAL BONUS +{snapshot.loadoutBonusScore} · COUNTER BREAK {snapshot.counterplayBreaks}</span>
            {snapshot.enemyCounterplayCount > 0 && <em className={productStyles.v119Counterplay}>ENEMY COUNTER · {counterplayHudLabel} ×{snapshot.enemyCounterplayCount}</em>}
          </div>
        </div>

        {controlsVisible && (
          <>
            <div
              className={styles.stickZone}
              role="application"
              aria-label="Flight stick"
              onPointerDown={startMove}
              onPointerMove={moveStick}
              onPointerUp={releaseMove}
              onPointerCancel={releaseMove}
              onLostPointerCapture={releaseMove}
            >
              <div ref={stickBaseRef} className={styles.stickBase} data-neutral={stick.x === 0 && stick.y === 0}>
                <i style={{ transform: `translate(-50%, -50%) translate(${stick.x * 30}px, ${-stick.y * 30}px)` }} />
                <span>FLIGHT</span>
              </div>
            </div>
            <div className={styles.actions} aria-label="Arcade combat controls" data-loadout={snapshot.loadout} data-fusion={standardFusionActive}>
              <button
                className={`${styles.fireButton} ${snapshot.fireActive ? styles.actionActive : ""}`}
                onPointerDown={(event) => pressAction(event, firePointersRef, (active) => demoRef.current?.setFire(active))}
                onPointerUp={(event) => releaseAction(event, firePointersRef, (active) => demoRef.current?.setFire(active))}
                onPointerCancel={(event) => releaseAction(event, firePointersRef, (active) => demoRef.current?.setFire(active))}
                onLostPointerCapture={(event) => releaseAction(event, firePointersRef, (active) => demoRef.current?.setFire(active))}
              ><CombatIcon kind="fire" /><strong>FIRE</strong><small>{fireDoctrine}</small></button>
              <button
                className={`${styles.lockButton} ${snapshot.lockActive ? styles.actionActive : ""}`}
                onPointerDown={(event) => pressAction(event, lockPointersRef, (active) => demoRef.current?.setLock(active))}
                onPointerUp={(event) => releaseAction(event, lockPointersRef, (active) => demoRef.current?.setLock(active))}
                onPointerCancel={(event) => releaseAction(event, lockPointersRef, (active) => demoRef.current?.setLock(active))}
                onLostPointerCapture={(event) => releaseAction(event, lockPointersRef, (active) => demoRef.current?.setLock(active))}
              ><CombatIcon kind="lock" /><strong>LOCK <span>{snapshot.lockedCount}/8</span></strong><small>{lockDoctrine}</small></button>
              <button
                className={`${styles.turboButton} ${snapshot.turboActive ? styles.actionActive : ""}`}
                onPointerDown={(event) => pressAction(event, turboPointersRef, (active) => demoRef.current?.setTurbo(active))}
                onPointerUp={(event) => releaseAction(event, turboPointersRef, (active) => demoRef.current?.setTurbo(active))}
                onPointerCancel={(event) => releaseAction(event, turboPointersRef, (active) => demoRef.current?.setTurbo(active))}
                onLostPointerCapture={(event) => releaseAction(event, turboPointersRef, (active) => demoRef.current?.setTurbo(active))}
              ><CombatIcon kind="turbo" /><strong>TURBO</strong><small>{Math.round(snapshot.turbo)}% · {turboDoctrine}</small></button>
            </div>
          </>
        )}

        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? `3D FLIGHT · V12.2 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}` : `COMPATIBILITY · CANVAS · V12.2 · ${snapshot.loadout.toUpperCase()}`}</span>
        {runtimeMessage && <div className={styles.runtimeMessage}>{runtimeMessage}</div>}

        {snapshot.status === "stage-clear" && (
          <div className={styles.resultOverlay} role="dialog" aria-modal="true" aria-label="Section clear">
            <div className={styles.stageResultPanel}>
              <small>{snapshot.lastStageNoDamage ? "NO DAMAGE · " : ""}SECTION CLEAR</small>
              <h2>{snapshot.lastStageRank}</h2>
              <strong>{snapshot.stage.name}</strong>
              <div className={productStyles.v11ScoreBreakdown}>
                <span><small>COMBAT</small><b>{snapshot.lastStageScoreBreakdown.combat}</b></span>
                <span><small>MEDAL</small><b>+{snapshot.lastStageScoreBreakdown.medal}</b></span>
                <span><small>PERFECT</small><b>+{snapshot.lastStageScoreBreakdown.perfect}</b></span>
                <span><small>ROUTE</small><b>+{snapshot.lastStageScoreBreakdown.route}</b></span>
                <span><small>BOSS</small><b>+{snapshot.lastStageScoreBreakdown.boss}</b></span>
              </div>
              <div className={productStyles.v11Medals}>
                {snapshot.lastStageMedals.map(medal => <span key={medal.id} data-earned={medal.earned}><b>{medal.earned ? "◆" : "◇"} {medal.label}</b><small>{medal.description}</small></span>)}
              </div>
              <div><span>SECTION SCORE</span><b>{snapshot.lastStageScore}</b></div>
              <p>NEXT SORTIE IN {snapshot.resultTimer.toFixed(1)}s</p>
            </div>
          </div>
        )}

        {snapshot.status === "continue" && (
          <div className={styles.resultOverlay} role="dialog" aria-modal="true" aria-label="Continue">
            <div className={styles.continuePanel}>
              <small>AIRFRAME LOST</small>
              <h2>CONTINUE?</h2>
              <p>CHECKPOINT REWIND · CHAIN RESET</p>
              <button onClick={() => demoRef.current?.continueRun()}><strong>CONTINUE</strong><span>REMAINING ×{snapshot.continuesRemaining}</span></button>
              <button className={styles.secondaryButton} onClick={onReturnTitle}>BACK TO TITLE</button>
            </div>
          </div>
        )}

        {finalOverlay && (
          <div className={styles.resultOverlay} role="dialog" aria-modal="true" aria-label="Arcade result">
            <div className={styles.finalPanel}>
              <small>{snapshot.status === "game-over" ? "MISSION FAILED" : snapshot.status === "practice-clear" ? "STAGE PRACTICE COMPLETE" : "ONE SKY · ARCADE RUN COMPLETE"}</small>
              <h2>{snapshot.status === "game-over" ? "GAME OVER" : snapshot.rank}</h2>
              <strong>{snapshot.status === "run-clear" ? "PRISM SOVEREIGN DESTROYED" : snapshot.stage.name}</strong>
              <div className={styles.finalStats}>
                <span><small>SCORE</small><b>{snapshot.score}</b></span>
                <span><small>KILLS</small><b>{snapshot.enemiesDefeated}</b></span>
                <span><small>MEDALS</small><b>{snapshot.runMedalsEarned}</b></span>
                <span><small>BEST CHAIN</small><b>×{snapshot.bestChain}</b></span>
              </div>
              {snapshot.route.length > 1 && <div className={productStyles.v11RouteHistory}><small>FLIGHT ROUTE</small><strong>{snapshot.route.map(id => skyDancerArcadeStageById(id).shortName).join(" → ")}</strong></div>}
              {snapshot.mode === "stage-practice" && snapshot.status === "practice-clear" && snapshot.lastStageMedals.length > 0 && (
                <div className={productStyles.v114PracticeMastery} aria-label="Stage mastery result">
                  <div><small>STAGE MASTERY</small><strong>{practiceMasteryCount}/3 · {projectedTotalMedals}◆</strong><span>{practiceMasteryCount === 3 ? "MASTERED" : "KEEP FLYING"} · PILOT {projectedTotalMedals}/{SKY_DANCER_ARCADE_MAX_MEDALS}</span></div>
                  <div className={productStyles.v114PracticeGoals}>
                    {snapshot.lastStageMedals.map((medal) => {
                      const mastered = persistedPracticeMedals.includes(medal.id) || medal.earned;
                      return <span key={medal.id} data-earned={mastered}><b>{mastered ? "◆" : "◇"} {medal.label}</b><small>{medal.description}</small></span>;
                    })}
                  </div>
                  <div className={productStyles.v114NextTarget} data-complete={!practiceNextTarget}><small>{practiceNextTarget ? "NEXT TARGET" : "STAGE MASTERED"}</small><strong>{practiceNextTarget?.label ?? "ALL MEDALS COMPLETE"}</strong><span>{practiceNextTarget?.description ?? "CHASE A NEW HIGH SCORE"} · {projectedNextMasteryReward ? `NEXT REWARD ${projectedNextMasteryReward.label} @${projectedNextMasteryReward.threshold}◆` : "SKY MASTER COMPLETE"}</span></div>
                </div>
              )}
              <button onClick={restart}><strong>{snapshot.mode === "stage-practice" ? "RETRY STAGE" : "NEW ARCADE RUN"}</strong><span>{snapshot.mode === "stage-practice" ? `${practiceNextTarget ? `CHASE ${practiceNextTarget.label}` : "FLY AGAIN"} · ${projectedNextMasteryReward ? `${projectedNextMasteryReward.shortLabel} @${projectedNextMasteryReward.threshold}◆` : "SKY MASTER"}` : "FLY AGAIN"}</span></button>
              <button className={styles.secondaryButton} onClick={onReturnTitle}>BACK TO TITLE</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

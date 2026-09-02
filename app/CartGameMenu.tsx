"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CART_HARD_MODE_SNAPSHOT_EVENT,
  type CartHardModeSnapshot,
  type CartRunDifficulty,
} from "../src/cart/CartRunDifficulty";
import {
  CART_ROGUE_CAMERA_DISTANCE_MAX,
  CART_ROGUE_CAMERA_DISTANCE_MIN,
  CART_ROGUE_CAMERA_DISTANCE_STEP,
  DEFAULT_CART_ROGUE_CONFIG,
  loadCartRogueConfig,
  saveCartRogueConfig,
} from "../src/cart/CartRogueConfig";
import { loadRallySettings, saveRallySettings } from "../src/rally/RallySettings";
import {
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeStageId,
  type SkyDancerGameMode,
  type SkyDancerStartRequest,
} from "../src/sky/arcade/SkyDancerArcadeData";
import {
  SKY_DANCER_ARCADE_MAX_MEDALS,
  loadSkyDancerArcadeProgress,
  selectSkyDancerArcadeEquipment,
  skyDancerArcadeNextMasteryReward,
  type SkyDancerArcadeLoadout,
  type SkyDancerArcadePaintScheme,
} from "../src/sky/arcade/SkyDancerArcadeProgress";
import { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";
import styles from "./CartGameMenu.module.css";
import modeStyles from "./CartGameMenuModes.module.css";
import configStyles from "./CartGameMenuConfig.module.css";

const MENU_PAUSE_EVENT = "cart-rogue-menu-pause";
const MENU_RESUME_EVENT = "cart-rogue-menu-resume";

const PAINT_OPTIONS: readonly { id: SkyDancerArcadePaintScheme; label: string; unlock: number }[] = [
  { id: "default", label: "CLASSIC", unlock: 0 },
  { id: "sunset", label: "SUNSET", unlock: 6 },
  { id: "storm", label: "STORM", unlock: 18 },
  { id: "prism", label: "PRISM", unlock: 30 },
];

const LOADOUT_OPTIONS: readonly { id: SkyDancerArcadeLoadout; label: string; detail: string; unlock: number }[] = [
  { id: "standard", label: "STANDARD", detail: "BALANCED GUN / LOCK / MISSILE", unlock: 0 },
  { id: "missile-focus", label: "MISSILE", detail: "LOCK +28% · MISSILE +22% · GUN -8%", unlock: 12 },
  { id: "gun-focus", label: "GUN", detail: "GUN RATE +35% · DAMAGE +18% · MISSILE -8%", unlock: 24 },
];

type PausePage = "menu" | "config";

interface CartGameMenuProps {
  started: boolean;
  activeMode: SkyDancerGameMode | null;
  onStart: (request: SkyDancerStartRequest) => void;
  onReturnTitle: () => void;
}

function hasBlockingGameOverlay(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"], [class*="runClear"]'));
}

export default function CartGameMenu({ started, activeMode, onStart, onReturnTitle }: CartGameMenuProps) {
  const [paused, setPaused] = useState(false);
  const [pausePage, setPausePage] = useState<PausePage>("menu");
  const [difficulty, setDifficulty] = useState<CartRunDifficulty>("normal");
  const [selectedMode, setSelectedMode] = useState<SkyDancerGameMode>("arcade-run");
  const [practiceStageId, setPracticeStageId] = useState<SkyDancerArcadeStageId>("dawn-city");
  const [practiceStageIds, setPracticeStageIds] = useState<SkyDancerArcadeStageId[]>([]);
  const [arcadeMeta, setArcadeMeta] = useState(() => loadSkyDancerArcadeProgress());
  const [selectedPaintScheme, setSelectedPaintScheme] = useState<SkyDancerArcadePaintScheme>(arcadeMeta.selectedPaintScheme);
  const [selectedLoadout, setSelectedLoadout] = useState<SkyDancerArcadeLoadout>(arcadeMeta.selectedLoadout);
  const [hangarOpen, setHangarOpen] = useState(false);
  const [hardSnapshot, setHardSnapshot] = useState<CartHardModeSnapshot | null>(null);
  const [cameraDistance, setCameraDistance] = useState(DEFAULT_CART_ROGUE_CONFIG.cameraDistance);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const gameOver = activeMode === "turbo-hunt" && Boolean(hardSnapshot?.gameOver);

  const pauseGame = useCallback(() => {
    if (!started || paused || gameOver || hasBlockingGameOverlay()) return;
    window.dispatchEvent(new Event(MENU_PAUSE_EVENT));
    setPausePage("menu");
    setPaused(true);
  }, [gameOver, paused, started]);

  const resumeGame = useCallback(() => {
    if (!started || !paused || gameOver) return;
    window.dispatchEvent(new Event(MENU_RESUME_EVENT));
    setPausePage("menu");
    setPaused(false);
  }, [gameOver, paused, started]);

  const startGame = (nextDifficulty = difficulty, nextMode = selectedMode) => {
    if (nextMode === "stage-practice" && practiceStageIds.length === 0) return;
    setPaused(false);
    setPausePage("menu");
    setHangarOpen(false);
    setHardSnapshot(null);
    onStart({
      mode: nextMode,
      difficulty: nextDifficulty,
      practiceStageId: nextMode === "stage-practice" ? practiceStageId : undefined,
      paintScheme: nextMode === "turbo-hunt" ? undefined : selectedPaintScheme,
      loadout: nextMode === "turbo-hunt" ? undefined : selectedLoadout,
      seed: ((Date.now() & 0x7fffffff) ^ 0x51f15e) | 0,
    });
  };

  const selectEquipment = (paintScheme: SkyDancerArcadePaintScheme, loadout: SkyDancerArcadeLoadout) => {
    const next = selectSkyDancerArcadeEquipment(paintScheme, loadout);
    setArcadeMeta(next);
    setSelectedPaintScheme(next.selectedPaintScheme);
    setSelectedLoadout(next.selectedLoadout);
  };

  const returnTitle = () => {
    setPaused(false);
    setPausePage("menu");
    setHardSnapshot(null);
    onReturnTitle();
  };

  const openConfig = () => {
    const config = loadCartRogueConfig();
    const rallySettings = loadRallySettings();
    setCameraDistance(config.cameraDistance);
    setVibrationEnabled(rallySettings.vibrationEnabled);
    setPausePage("config");
  };

  const updateCameraDistance = (value: number) => {
    const next = saveCartRogueConfig({ cameraDistance: value });
    setCameraDistance(next.cameraDistance);
  };

  const toggleVibration = () => {
    const nextEnabled = !vibrationEnabled;
    const current = loadRallySettings();
    setVibrationEnabled(nextEnabled);
    saveRallySettings({ ...current, vibrationEnabled: nextEnabled });
  };

  const resetConfig = () => {
    const next = saveCartRogueConfig(DEFAULT_CART_ROGUE_CONFIG);
    const current = loadRallySettings();
    setCameraDistance(next.cameraDistance);
    setVibrationEnabled(true);
    saveRallySettings({ ...current, vibrationEnabled: true });
  };

  useEffect(() => {
    if (started) return;
    const timer = window.setTimeout(() => {
      const progress = loadSkyDancerArcadeProgress();
      setArcadeMeta(progress);
      setSelectedPaintScheme(progress.selectedPaintScheme);
      setSelectedLoadout(progress.selectedLoadout);
      const cleared = SKY_DANCER_ARCADE_STAGES
        .filter((stage) => progress.clearedStageIds.includes(stage.id))
        .map((stage) => stage.id);
      setPracticeStageIds(cleared);
      setPracticeStageId((current) => cleared.length > 0 && !cleared.includes(current) ? cleared[0] : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [started]);

  useEffect(() => {
    const onHardSnapshot = (event: Event) => {
      const detail = (event as CustomEvent<CartHardModeSnapshot>).detail;
      if (detail) setHardSnapshot(detail);
    };
    window.addEventListener(CART_HARD_MODE_SNAPSHOT_EVENT, onHardSnapshot);
    return () => window.removeEventListener(CART_HARD_MODE_SNAPSHOT_EVENT, onHardSnapshot);
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "CartMenuBind" }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [started]);

  useEffect(() => {
    if (!started) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || gameOver) return;
      event.preventDefault();
      if (!paused) pauseGame();
      else if (pausePage === "config") setPausePage("menu");
      else resumeGame();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameOver, pauseGame, pausePage, paused, resumeGame, started]);

  useEffect(() => {
    if (!started) return undefined;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" || gameOver || hasBlockingGameOverlay()) return;
      window.dispatchEvent(new Event(MENU_PAUSE_EVENT));
      setPausePage("menu");
      setPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [gameOver, started]);

  if (!started) {
    const hard = difficulty === "hard";
    const practiceAvailable = practiceStageIds.length > 0;
    const selectedStage = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === practiceStageId);
    const selectedStageRecord = selectedStage ? arcadeMeta.records[selectedStage.id] : undefined;
    const selectedStageGoals = selectedStage ? skyDancerArcadeV11StageMedalGoals(selectedStage.id) : [];
    const selectedMasteryCount = selectedStageGoals.filter((goal) => selectedStageRecord?.medals.includes(goal.id)).length;
    const selectedNextGoal = selectedStageGoals.find((goal) => !selectedStageRecord?.medals.includes(goal.id));
    const nextMasteryReward = skyDancerArcadeNextMasteryReward(arcadeMeta.totalMedals);
    const masteryRewardSummary = nextMasteryReward
      ? `NEXT ${nextMasteryReward.shortLabel} @${nextMasteryReward.threshold}◆`
      : "SKY MASTER COMPLETE";
    const modeSummary = selectedMode === "arcade-run"
      ? "BRANCHING FIXED COURSE · 7 SECTIONS · ABOUT 4 MINUTES"
      : selectedMode === "turbo-hunt"
        ? "HUNT THE RAID. BREAK THE LINE. KEEP MOVING."
        : selectedStage
          ? `${selectedStage.name} · SCORE ATTACK · MASTERY ${selectedMasteryCount}/3`
          : "CLEAR AN ARCADE STAGE TO UNLOCK PRACTICE";
    const startLabel = selectedMode === "arcade-run"
      ? "START ARCADE RUN"
      : selectedMode === "turbo-hunt"
        ? hard ? "START HARD HUNT" : "START TURBO HUNT"
        : "START STAGE PRACTICE";
    return (
      <div className={`${styles.titleScreen} ${modeStyles.scrollTitleScreen}`} role="dialog" aria-modal="true" aria-label="Sky Dancer title screen">
        <div className={styles.titleGlow} aria-hidden="true" />
        <div className={`${styles.titlePanel} ${modeStyles.modeTitlePanel}`}>
          <div className={`${styles.eyebrow} ${modeStyles.compactEyebrow}`}>HIGH SPEED AIR RAID ACTION</div>
          {selectedMode !== "turbo-hunt" && (
            <button className={modeStyles.hangarButton} onClick={() => setHangarOpen(true)} aria-label="Open hangar">
              <strong>HANGAR</strong><small>{selectedPaintScheme.toUpperCase()} · {selectedLoadout.toUpperCase()}</small>
            </button>
          )}
          <h1><span>SKY</span> DANCER</h1>
          <div className={`${styles.mode} ${modeStyles.compactMode}`}>SELECT GAME MODE</div>
          <p>{modeSummary}</p>
          <div className={modeStyles.modeSelect} aria-label="Select game mode">
            <button
              className={`${modeStyles.modeButton} ${selectedMode === "arcade-run" ? modeStyles.modeButtonActive : ""}`}
              onClick={() => setSelectedMode("arcade-run")}
              aria-pressed={selectedMode === "arcade-run"}
            >
              <strong>ARCADE RUN</strong>
              <small>FIXED COURSE · 7 SECTIONS · 4 MIN</small>
            </button>
            <button
              className={`${modeStyles.modeButton} ${selectedMode === "turbo-hunt" ? modeStyles.modeButtonActive : ""}`}
              onClick={() => setSelectedMode("turbo-hunt")}
              aria-pressed={selectedMode === "turbo-hunt"}
            >
              <strong>TURBO HUNT</strong>
              <small>ADAPTIVE OPEN RAID</small>
            </button>
            <button
              className={`${modeStyles.modeButton} ${selectedMode === "stage-practice" ? modeStyles.modeButtonActive : ""} ${!practiceAvailable ? modeStyles.modeButtonDisabled : ""}`}
              onClick={() => practiceAvailable && setSelectedMode("stage-practice")}
              aria-pressed={selectedMode === "stage-practice"}
              disabled={!practiceAvailable}
            >
              <strong>STAGE PRACTICE</strong>
              <small>{practiceAvailable ? `${practiceStageIds.length} STAGES READY` : "CLEAR TO UNLOCK"}</small>
            </button>
          </div>
          {selectedMode === "stage-practice" && practiceAvailable && (
            <div className={modeStyles.practiceSelect} aria-label="Select practice stage">
              <span>SELECT STAGE</span>
              <div className={modeStyles.practiceGrid}>
                {SKY_DANCER_ARCADE_STAGES.filter((stage) => practiceStageIds.includes(stage.id)).map((stage) => (
                  <button
                    key={stage.id}
                    className={stage.id === practiceStageId ? modeStyles.practiceButtonActive : ""}
                    onClick={() => setPracticeStageId(stage.id)}
                    aria-pressed={stage.id === practiceStageId}
                  >
                    <small>{String(stage.order).padStart(2, "0")}</small>
                    <strong>{stage.shortName}</strong>
                    <span className={modeStyles.practiceMedals} aria-label={`${arcadeMeta.records[stage.id]?.medals.length ?? 0} of 3 medals`}>
                      {"◆".repeat(arcadeMeta.records[stage.id]?.medals.length ?? 0)}{"◇".repeat(3 - (arcadeMeta.records[stage.id]?.medals.length ?? 0))}
                    </span>
                  </button>
                ))}
              </div>
              <div className={modeStyles.practiceMastery} aria-label="Selected stage mastery">
                <div className={modeStyles.practiceRecord}>
                  <span>STAGE MASTERY</span>
                  <strong>{selectedMasteryCount}/3 · BEST {selectedStageRecord?.bestRank ?? "-"}</strong>
                  <small>{selectedStageRecord ? `SCORE ${selectedStageRecord.bestScore.toLocaleString()} · CLEAR ×${selectedStageRecord.clears}` : "NO RECORD"}</small>
                </div>
                <div className={modeStyles.practiceGoals}>
                  {selectedStageGoals.map((goal) => {
                    const earned = selectedStageRecord?.medals.includes(goal.id) ?? false;
                    return <span key={goal.id} data-earned={earned}><b>{earned ? "◆" : "◇"} {goal.label}</b><small>{goal.description}</small></span>;
                  })}
                </div>
                <div className={modeStyles.practiceNextTarget} data-complete={!selectedNextGoal}>
                  <span>{selectedNextGoal ? "NEXT TARGET" : "STAGE MASTERED"}</span>
                  <strong>{selectedNextGoal?.label ?? "ALL 3 MEDALS COMPLETE"}</strong>
                  <small>{selectedNextGoal?.description ?? "PUSH THE BEST SCORE HIGHER"} · {nextMasteryReward ? `PILOT REWARD ${nextMasteryReward.label} AT ${nextMasteryReward.threshold} MEDALS` : "SKY MASTER COMPLETE"}</small>
                </div>
              </div>
            </div>
          )}
          <div className={`${styles.difficultySelect} ${modeStyles.compactDifficulty}`} aria-label="Select difficulty">
            <button
              className={`${styles.difficultyButton} ${!hard ? styles.difficultyButtonActive : ""}`}
              onClick={() => setDifficulty("normal")}
              aria-pressed={!hard}
            >
              <strong>NORMAL</strong>
              <small>{selectedMode === "turbo-hunt" ? "STANDARD HUNT" : "ARCADE BALANCE"}</small>
            </button>
            <button
              className={`${styles.difficultyButton} ${styles.difficultyButtonHard} ${hard ? styles.difficultyButtonHardActive : ""}`}
              onClick={() => setDifficulty("hard")}
              aria-pressed={hard}
            >
              <strong>{selectedMode === "turbo-hunt" ? "HARD" : "ACE"}</strong>
              <small>{selectedMode === "turbo-hunt" ? "EXPERT RAID" : "ONE-HIT PRESSURE"}</small>
            </button>
          </div>
          <div className={`${styles.hardWarning} ${modeStyles.compactWarning}`}>
            {selectedMode === "turbo-hunt"
              ? `GAS = LIFE · RECOVERY CELLS RESTORE GAS · ZERO GAS = GAME OVER${hard ? " · HARD RAID HITS DEAL HEAVY LIFE DAMAGE" : ""}`
              : selectedMode === "arcade-run"
                ? `2 CONTINUES · BEST ${arcadeMeta.bestRunScore} ${arcadeMeta.bestRunRank} · MASTERY ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${selectedPaintScheme.toUpperCase()} / ${selectedLoadout.toUpperCase()} · ${masteryRewardSummary}${hard ? " · ACE PRESSURE" : ""}`
                : `SINGLE STAGE · BEST ${selectedStageRecord?.bestScore ?? 0} ${selectedStageRecord?.bestRank ?? "D"} · MASTERY ${selectedMasteryCount}/3 · PILOT ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${selectedPaintScheme.toUpperCase()} / ${selectedLoadout.toUpperCase()} · ${masteryRewardSummary}${hard ? " · ACE DIFFICULTY" : ""}`}
          </div>
          <button className={`${styles.startButton} ${modeStyles.compactStart} ${hard ? styles.startButtonHard : ""}`} onClick={() => startGame()}>
            <strong>{startLabel}</strong>
            <small>{hard ? "ACE PRESSURE" : "TAP TO IGNITE"}</small>
          </button>
          <div className={`${styles.titleControls} ${modeStyles.compactControls}`}>
            {selectedMode === "turbo-hunt" ? (
              <><span>DRAG LEFT · STEER</span><span>HOLD TURBO · CHARGE / RELEASE · DASH</span><span>SHOT · MISSILE</span></>
            ) : (
              <><span>STICK · FLY</span><span>FIRE · GUN</span><span>LOCK / RELEASE · MISSILE SALVO</span><span>TURBO · SMASH</span></>
            )}
          </div>
        </div>
        {hangarOpen && selectedMode !== "turbo-hunt" && (
          <div className={modeStyles.hangarOverlay} role="dialog" aria-label="Arcade hangar">
            <div className={modeStyles.hangarPanel}>
              <div className={modeStyles.hangarHeading}><span>PILOT CONFIGURATION</span><strong>HANGAR</strong><small>{arcadeMeta.totalMedals}/{SKY_DANCER_ARCADE_MAX_MEDALS} MASTERY MEDALS</small></div>
              <section className={modeStyles.hangarSection} aria-label="Paint schemes">
                <div><span>PAINT</span><small>VISUAL AIRFRAME IDENTITY</small></div>
                <div className={modeStyles.hangarChoices}>
                  {PAINT_OPTIONS.map((option) => {
                    const unlocked = arcadeMeta.unlockedPaintSchemes.includes(option.id);
                    return <button key={option.id} disabled={!unlocked} data-selected={selectedPaintScheme === option.id} onClick={() => selectEquipment(option.id, selectedLoadout)}><strong>{option.label}</strong><small>{unlocked ? (selectedPaintScheme === option.id ? "EQUIPPED" : "READY") : `${option.unlock}◆`}</small></button>;
                  })}
                </div>
              </section>
              <section className={modeStyles.hangarSection} aria-label="Weapon loadouts">
                <div><span>LOADOUT</span><small>{LOADOUT_OPTIONS.find((option) => option.id === selectedLoadout)?.detail}</small></div>
                <div className={modeStyles.hangarChoices}>
                  {LOADOUT_OPTIONS.map((option) => {
                    const unlocked = arcadeMeta.unlockedLoadouts.includes(option.id);
                    return <button key={option.id} disabled={!unlocked} data-selected={selectedLoadout === option.id} onClick={() => selectEquipment(selectedPaintScheme, option.id)}><strong>{option.label}</strong><small>{unlocked ? (selectedLoadout === option.id ? "EQUIPPED" : "READY") : `${option.unlock}◆`}</small></button>;
                  })}
                </div>
              </section>
              <button className={modeStyles.hangarReady} onClick={() => setHangarOpen(false)}><strong>READY</strong><small>{selectedPaintScheme.toUpperCase()} · {selectedLoadout.toUpperCase()}</small></button>
            </div>
          </div>
        )}
        <div className={styles.titleFooter}>ONE SKY · TWO STYLES · ELEVEN COURSES</div>
      </div>
    );
  }

  if (gameOver && hardSnapshot) {
    const failedDifficulty = hardSnapshot.difficulty;
    const hard = failedDifficulty === "hard";
    return (
      <div className={styles.gameOverOverlay} role="dialog" aria-modal="true" aria-label="Game over">
        <div className={styles.gameOverPanel}>
          <div className={styles.gameOverEyebrow}>{hard ? "HARD MODE" : "TURBO HUNT"} · RUN FAILED</div>
          <h2>GAME OVER</h2>
          <strong className={styles.gameOverReason}>GAS EMPTY · LIFE LOST</strong>
          <div className={styles.gameOverStats}>
            <span>GAS / LIFE {hardSnapshot.gasLifePercent}%</span>
            <span>RAID HITS {hardSnapshot.raidHits}</span>
            <span>PERFECT DODGES {hardSnapshot.perfectDodges}</span>
          </div>
          <button className={styles.retryButton} onClick={() => startGame(failedDifficulty, "turbo-hunt")}>
            <strong>{hard ? "RETRY HARD" : "RETRY RUN"}</strong>
            <small>RUN IT BACK</small>
          </button>
          <button className={styles.titleButton} onClick={returnTitle}>BACK TO TITLE</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!paused && (
        <button className={styles.pauseButton} onClick={pauseGame} aria-label="Pause game">
          <i /><i />
        </button>
      )}
      {paused && pausePage === "menu" && (
        <div className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Game paused">
          <div className={styles.pausePanel}>
            <div className={styles.pauseEyebrow}>RUN SUSPENDED</div>
            <h2>PAUSED</h2>
            <p>{activeMode === "turbo-hunt" ? "Steering, brake and Turbo input are released while paused." : "Flight, weapons and Turbo input are released while paused."}</p>
            <div className={configStyles.menuActions}>
              <button className={styles.resumeButton} onClick={resumeGame}>
                <strong>RESUME</strong>
                <small>{activeMode === "turbo-hunt" ? "BACK TO THE HUNT" : "BACK TO THE COURSE"}</small>
              </button>
              <button className={configStyles.secondaryButton} onClick={openConfig}>
                <strong>CONFIG</strong>
                <small>CAMERA / VIBRATION</small>
              </button>
              <button className={configStyles.dangerButton} onClick={returnTitle}>
                <strong>BACK TO TITLE</strong>
                <small>END CURRENT RUN</small>
              </button>
            </div>
            <div className={styles.pauseHint}>ESC · PAUSE / RESUME</div>
          </div>
        </div>
      )}
      {paused && pausePage === "config" && (
        <div className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Configuration">
          <div className={`${styles.pausePanel} ${configStyles.configPanel}`}>
            <div className={styles.pauseEyebrow}>RUN CONFIGURATION</div>
            <h2>CONFIG</h2>
            <p className={configStyles.configIntro}>Changes apply immediately and are saved on this device.</p>
            <div className={configStyles.configRows}>
              <div className={configStyles.configRow}>
                <label className={configStyles.configLabel} htmlFor="cart-camera-distance">
                  <span>CAMERA DISTANCE</span>
                  <span className={configStyles.configValue}>{Math.round(cameraDistance * 100)}%</span>
                </label>
                <input
                  id="cart-camera-distance"
                  className={configStyles.range}
                  type="range"
                  min={CART_ROGUE_CAMERA_DISTANCE_MIN}
                  max={CART_ROGUE_CAMERA_DISTANCE_MAX}
                  step={CART_ROGUE_CAMERA_DISTANCE_STEP}
                  value={cameraDistance}
                  onChange={(event) => updateCameraDistance(Number(event.currentTarget.value))}
                  aria-label="Camera distance"
                />
                <div className={configStyles.rangeScale}><span>CURRENT</span><span>FAR +60%</span></div>
              </div>
              <div className={`${configStyles.configRow} ${configStyles.toggleRow}`}>
                <div className={configStyles.configLabel}><span>VIBRATION</span></div>
                <button
                  className={`${configStyles.toggleButton} ${vibrationEnabled ? configStyles.toggleOn : ""}`}
                  onClick={toggleVibration}
                  aria-pressed={vibrationEnabled}
                >
                  {vibrationEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
            <div className={configStyles.configFooter}>
              <button className={configStyles.resetButton} onClick={resetConfig}>RESET</button>
              <button className={configStyles.backButton} onClick={() => setPausePage("menu")}>BACK</button>
            </div>
            <div className={styles.pauseHint}>ESC · BACK</div>
          </div>
        </div>
      )}
    </>
  );
}

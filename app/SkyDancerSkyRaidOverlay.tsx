"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT,
  getLatestSkyDancerSkyRaidSnapshot,
  type SkyDancerSkyRaidSnapshot,
} from "../src/sky/SkyDancerSkyRaid";
import legacyStyles from "./CartRogueGame.module.css";
import phaseStyles from "./CartRoguePhase3.module.css";
import routeStyles from "./CartRunRouteMap.module.css";
import styles from "./SkyDancerSkyRaidOverlay.module.css";

function hex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default function SkyDancerSkyRaidOverlay() {
  const initialSnapshot = getLatestSkyDancerSkyRaidSnapshot();
  const [snapshot, setSnapshot] = useState<SkyDancerSkyRaidSnapshot | null>(() => initialSnapshot);
  const [killCue, setKillCue] = useState<{ serial: number; chain: number } | null>(null);
  const previousSnapshotRef = useRef<SkyDancerSkyRaidSnapshot | null>(initialSnapshot);
  const killCueTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SkyDancerSkyRaidSnapshot>).detail;
      if (detail?.gameMode !== "sky-raid") return;
      const previous = previousSnapshotRef.current;
      if (previous && detail.actIndex === previous.actIndex && detail.actKills > previous.actKills) {
        setKillCue({ serial: Date.now(), chain: detail.chain });
        if (killCueTimerRef.current !== null) window.clearTimeout(killCueTimerRef.current);
        killCueTimerRef.current = window.setTimeout(() => {
          killCueTimerRef.current = null;
          setKillCue(null);
        }, 640);
      }
      previousSnapshotRef.current = detail;
      setSnapshot(detail);
    };
    window.addEventListener(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, handler);
    return () => {
      window.removeEventListener(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, handler);
      if (killCueTimerRef.current !== null) window.clearTimeout(killCueTimerRef.current);
    };
  }, []);

  if (!snapshot) return null;
  const progress = Math.round(Math.min(1, snapshot.actKills / Math.max(1, snapshot.actKillTarget)) * 100);
  const accent = hex(snapshot.palette.accent);
  const sky = hex(snapshot.palette.sky);
  const enemy = hex(snapshot.palette.enemy);
  const vars = {
    "--raid-accent": accent,
    "--raid-sky": sky,
    "--raid-enemy": enemy,
  } as CSSProperties;

  return <>
    <style>{`
      .${legacyStyles.topHud}, .${legacyStyles.bottomHud}, .${legacyStyles.gateOpen}, .${legacyStyles.combo}, .${legacyStyles.ramBanner}, .${legacyStyles.wallRide}, .${routeStyles.panel}, .${legacyStyles.rendererBadge}, .${phaseStyles.rewardBanner}, .skyDancerV54Cinematic, .skyDancerV49Mission { display: none !important; }
      .${legacyStyles.steerZone} span { display: none !important; }
      .${legacyStyles.actions} { right: max(10px, env(safe-area-inset-right)) !important; bottom: max(12px, calc(env(safe-area-inset-bottom) + 8px)) !important; gap: 8px !important; }
      .${legacyStyles.brakeButton} { display: none !important; }
      .${legacyStyles.boostButton} { width: 72px !important; height: 72px !important; border-radius: 18px !important; }
      .${legacyStyles.boostButton} strong { font-size: 13px !important; }
      .${legacyStyles.boostButton} small { font-size: 0 !important; }
      .${legacyStyles.boostButton} small::after { content: "HOLD · RELEASE"; font-size: 6px; letter-spacing: .07em; }
      .${styles.actBanner}, .${styles.rushBanner}, .${styles.bossCue} {
        top: 22% !important;
        min-width: 0 !important;
        width: auto !important;
        max-width: min(54vw, 320px) !important;
        padding: 5px 12px 6px !important;
        background: linear-gradient(90deg, transparent, rgba(4, 18, 34, .68) 13%, rgba(4, 18, 34, .68) 87%, transparent) !important;
        border-top-width: 1px !important;
        border-bottom-width: 1px !important;
      }
      .${styles.actBanner} {
        top: 17% !important;
        max-width: min(42vw, 250px) !important;
        padding: 3px 10px 4px !important;
      }
      .${styles.actBanner} strong, .${styles.rushBanner} strong, .${styles.bossCue} strong {
        margin-top: 2px !important;
        font-size: clamp(12px, 2vw, 18px) !important;
        letter-spacing: .10em !important;
      }
      .${styles.actBanner} strong { font-size: clamp(11px, 1.65vw, 15px) !important; }
      .${styles.actBanner} small, .${styles.rushBanner} small, .${styles.bossCue} small,
      .${styles.actBanner} span, .${styles.rushBanner} span, .${styles.bossCue} span {
        font-size: clamp(6px, .72vw, 8px) !important;
        letter-spacing: .09em !important;
      }
      .${styles.actBanner} span { display: none !important; }
      .${styles.rushBanner} { top: 23% !important; }
      .${styles.bossCue} { top: 24% !important; }
      .${styles.scoreCard}[data-kill="true"] {
        animation: skyRaidScorePunch .5s cubic-bezier(.16,.84,.28,1) both;
      }
      [data-sd-kill-confirm] {
        position: fixed;
        right: max(18px, calc(env(safe-area-inset-right) + 10px));
        top: max(108px, calc(env(safe-area-inset-top) + 96px));
        z-index: 94;
        min-width: 112px;
        padding: 5px 9px 6px;
        border: 1px solid color-mix(in srgb, var(--raid-accent) 72%, white 28%);
        border-radius: 5px;
        background: linear-gradient(90deg, rgba(4,21,35,.82), rgba(4,28,44,.54));
        box-shadow: 0 5px 18px rgba(0,18,32,.22), inset 2px 0 0 var(--raid-accent);
        text-align: right;
        pointer-events: none;
        animation: skyRaidKillConfirm .64s cubic-bezier(.16,.84,.28,1) both;
      }
      [data-sd-kill-confirm] strong {
        display: block;
        color: #f7fdff;
        font-size: 10px;
        line-height: 1.05;
        letter-spacing: .12em;
      }
      [data-sd-kill-confirm] small {
        display: block;
        margin-top: 3px;
        color: var(--raid-accent);
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .12em;
      }
      @keyframes skyRaidScorePunch {
        0% { transform: scale(1); }
        20% { transform: scale(1.055); filter: brightness(1.32); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      @keyframes skyRaidKillConfirm {
        0% { opacity: 0; transform: translate3d(0,7px,0) scale(.90); }
        18% { opacity: 1; transform: translate3d(0,0,0) scale(1.04); }
        72% { opacity: .96; transform: translate3d(0,-2px,0) scale(1); }
        100% { opacity: 0; transform: translate3d(0,-7px,0) scale(.98); }
      }
      @media(max-height:390px) {
        .${legacyStyles.actions} { bottom: max(8px, calc(env(safe-area-inset-bottom) + 5px)) !important; }
        .${legacyStyles.boostButton} { width: 64px !important; height: 64px !important; }
        .${styles.actBanner}, .${styles.rushBanner}, .${styles.bossCue} {
          top: 21% !important;
          max-width: min(44vw, 280px) !important;
          padding: 3px 10px 4px !important;
        }
        .${styles.actBanner} { top: 16.5% !important; max-width: min(38vw, 230px) !important; padding: 2px 9px 3px !important; }
        .${styles.actBanner} strong { font-size: 11px !important; }
        .${styles.rushBanner} strong, .${styles.bossCue} strong { font-size: 13px !important; }
        .${styles.actBanner} span, .${styles.rushBanner} span, .${styles.bossCue} span { display: none !important; }
        [data-sd-kill-confirm] {
          top: max(92px, calc(env(safe-area-inset-top) + 82px));
          min-width: 100px;
          padding: 4px 8px 5px;
        }
      }
    `}</style>
    <div className={styles.grade} style={vars} data-act={snapshot.actId} aria-hidden="true" />
    <div className={styles.hud} style={vars} aria-label="Sky Raid status">
      <div className={styles.modeCard}>
        <small>SKY DANCER · FREE RAID</small>
        <strong>SKY RAID</strong>
        <span>ACT {snapshot.actIndex + 1}/5 · {snapshot.actLabel}</span>
      </div>

      <div className={styles.objectiveCard} data-break={snapshot.actBreak}>
        <div className={styles.objectiveHead}>
          <span>{snapshot.actBreak ? "ACT BREAK" : snapshot.setpiece}</span>
          <strong>{snapshot.actBreak ? "COMPLETE" : `${snapshot.actKills}/${snapshot.actKillTarget}`}</strong>
        </div>
        <div className={styles.progress}><i style={{ width: `${snapshot.actBreak ? 100 : progress}%` }} /></div>
        <small>{snapshot.actSubtitle} · {snapshot.actSecondsRemaining.toFixed(1)}s</small>
      </div>

      <div className={styles.scoreCard} data-kill={killCue ? "true" : "false"}>
        <small>SCORE</small>
        <strong>{snapshot.score.toLocaleString()}</strong>
        <span>{snapshot.chain > 1 ? `CHAIN ×${snapshot.chain} · ` : ""}MULTI ×{snapshot.multiplier.toFixed(2)}</span>
      </div>

      {killCue && (
        <div key={killCue.serial} data-sd-kill-confirm="true" aria-live="polite">
          <strong>TARGET DOWN</strong>
          <small>{killCue.chain > 1 ? `CHAIN ×${killCue.chain}` : "CONFIRMED"}</small>
        </div>
      )}

      {snapshot.actElapsedSeconds < 1.6 && !snapshot.clear && (
        <div className={styles.actBanner}>
          <small>ACT {snapshot.actIndex + 1} · {snapshot.setpiece}</small>
          <strong>{snapshot.actLabel}</strong>
          <span>{snapshot.actSubtitle}</span>
        </div>
      )}

      {snapshot.rushActive && !snapshot.clear && (
        <div className={styles.rushBanner}>
          <small>FORMATION RUSH</small>
          <strong>SCORE ×2</strong>
          <span>BREAK THE WAVE · KEEP MOVING</span>
        </div>
      )}

      {snapshot.bossForced && !snapshot.clear && (
        <div className={styles.bossCue}>
          <small>FINAL SETPIECE</small>
          <strong>PRISM TITAN</strong>
          <span>BREAK ARMOR · DODGE · COUNTER · RAM CORE</span>
        </div>
      )}

      {snapshot.clear && (
        <div className={styles.clearBanner}>
          <small>FREE RAID COMPLETE · {formatTime(snapshot.elapsedSeconds)}</small>
          <strong>SKY RAID CLEAR</strong>
          <span>SCORE {snapshot.score.toLocaleString()} · FINAL CHAIN ×{Math.max(1, snapshot.chain)}</span>
        </div>
      )}

      <div className={styles.timeline} aria-label="Sky Raid act timeline">
        {Array.from({ length: 5 }, (_, index) => <i key={index} data-active={index === snapshot.actIndex} data-cleared={index < snapshot.actIndex} />)}
      </div>
    </div>
  </>;
}

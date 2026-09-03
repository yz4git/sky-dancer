"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
  const [snapshot, setSnapshot] = useState<SkyDancerSkyRaidSnapshot | null>(() => getLatestSkyDancerSkyRaidSnapshot());

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SkyDancerSkyRaidSnapshot>).detail;
      if (detail?.gameMode === "sky-raid") setSnapshot(detail);
    };
    window.addEventListener(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, handler);
    return () => window.removeEventListener(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, handler);
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
      .${legacyStyles.topHud}, .${legacyStyles.bottomHud}, .${legacyStyles.gateOpen}, .${routeStyles.panel}, .${legacyStyles.rendererBadge}, .${phaseStyles.rewardBanner} { display: none !important; }
      .${legacyStyles.steerZone} span { display: none !important; }
      .${legacyStyles.actions} { right: max(10px, env(safe-area-inset-right)) !important; bottom: max(12px, calc(env(safe-area-inset-bottom) + 8px)) !important; gap: 8px !important; }
      .${legacyStyles.brakeButton} { display: none !important; }
      .${legacyStyles.boostButton} { width: 72px !important; height: 72px !important; border-radius: 18px !important; }
      .${legacyStyles.boostButton} strong { font-size: 13px !important; }
      .${legacyStyles.boostButton} small { font-size: 0 !important; }
      .${legacyStyles.boostButton} small::after { content: "HOLD · RELEASE"; font-size: 6px; letter-spacing: .07em; }
      @media(max-height:390px) {
        .${legacyStyles.actions} { bottom: max(8px, calc(env(safe-area-inset-bottom) + 5px)) !important; }
        .${legacyStyles.boostButton} { width: 64px !important; height: 64px !important; }
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

      <div className={styles.scoreCard}>
        <small>SCORE</small>
        <strong>{snapshot.score.toLocaleString()}</strong>
        <span>{snapshot.chain > 1 ? `CHAIN ×${snapshot.chain} · ` : ""}MULTI ×{snapshot.multiplier.toFixed(2)}</span>
      </div>

      {snapshot.actElapsedSeconds < 2.4 && !snapshot.clear && (
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

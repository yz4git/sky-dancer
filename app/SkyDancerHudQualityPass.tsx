"use client";

import { useEffect, useRef, useState } from "react";
import legacyStyles from "./CartRogueGame.module.css";
import phaseStyles from "./CartRoguePhase3.module.css";
import huntStyles from "./CartTurboHuntHudOverlay.module.css";

/** Sky-specific HUD and presentation polish applied after inherited Cart overlays. */
export default function SkyDancerHudQualityPass() {
  const [shotPulse, setShotPulse] = useState(false);
  const pulseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onShot = () => {
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
      setShotPulse(true);
      pulseTimerRef.current = window.setTimeout(() => {
        pulseTimerRef.current = null;
        setShotPulse(false);
      }, 180);
    };
    window.addEventListener("sky-dancer-player-shot-ui", onShot);
    return () => {
      window.removeEventListener("sky-dancer-player-shot-ui", onShot);
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
    };
  }, []);

  return <>
    <style>{`
    .${legacyStyles.topHud} {
      gap: clamp(6px, 1.1vw, 12px) !important;
      padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) 0 max(10px, env(safe-area-inset-left)) !important;
    }
    .${legacyStyles.runCard},
    .${legacyStyles.objective},
    .${legacyStyles.enemyCard},
    .${legacyStyles.meterCard} {
      background: linear-gradient(180deg, rgba(10,43,66,.76), rgba(6,25,42,.68)) !important;
      border: 1px solid rgba(127,224,255,.30) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 6px 20px rgba(4,18,32,.18) !important;
      backdrop-filter: blur(6px) saturate(1.08) !important;
      -webkit-backdrop-filter: blur(6px) saturate(1.08) !important;
    }
    .${legacyStyles.objective} {
      color: #e8faff !important;
      letter-spacing: .055em !important;
      text-shadow: 0 1px 7px rgba(0,20,36,.55) !important;
    }
    .${legacyStyles.runCard} small,
    .${legacyStyles.enemyCard} small,
    .${legacyStyles.meterHead} span {
      color: rgba(207,242,255,.78) !important;
      letter-spacing: .09em !important;
    }
    .${legacyStyles.bottomHud} {
      padding: 0 max(10px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)) !important;
    }
    .${legacyStyles.itemStrip} {
      opacity: .62 !important;
      transform: scale(.88) !important;
      transform-origin: 50% 100% !important;
      filter: saturate(.78) !important;
    }
    .${legacyStyles.steerZone} {
      border-color: rgba(120,224,255,.13) !important;
      background: linear-gradient(90deg, rgba(5,35,55,.04), rgba(85,210,255,.08), rgba(5,35,55,.04)) !important;
      color: rgba(210,247,255,.50) !important;
      text-shadow: 0 1px 5px rgba(0,15,28,.65) !important;
    }
    .${legacyStyles.boostButton} {
      background: linear-gradient(180deg, rgba(42,199,248,.92), rgba(18,117,190,.88)) !important;
      border-color: rgba(203,248,255,.62) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.26), 0 5px 18px rgba(0,140,220,.24) !important;
      text-shadow: 0 1px 5px rgba(0,41,73,.65) !important;
    }
    .${legacyStyles.turboCard} {
      border-color: rgba(84,218,255,.38) !important;
    }
    .${legacyStyles.rendererBadge} {
      opacity: .38 !important;
      transform: scale(.82) !important;
      transform-origin: 100% 0 !important;
    }
    .${legacyStyles.combo} {
      top: 14% !important;
      max-width: 52vw !important;
      font-size: clamp(17px, 3.1vw, 29px) !important;
      line-height: 1 !important;
      letter-spacing: .035em !important;
      opacity: .72 !important;
      -webkit-text-stroke: 0 !important;
      text-shadow: 0 2px 8px rgba(20,28,38,.24) !important;
      filter: none !important;
      transform: translateX(-50%) rotate(-2deg) scale(.88) !important;
      white-space: nowrap !important;
    }
    .${legacyStyles.combo} strong {
      color: #ffd166 !important;
      text-shadow: 0 2px 7px rgba(20,28,38,.22) !important;
    }
    .${legacyStyles.ramBanner} {
      top: 23% !important;
      max-width: 48vw !important;
      font-size: clamp(15px, 2.5vw, 23px) !important;
      line-height: 1 !important;
      opacity: .68 !important;
      -webkit-text-stroke: 0 !important;
      text-shadow: 0 2px 7px rgba(20,28,38,.22) !important;
      filter: none !important;
      transform: translateX(-50%) scale(.86) !important;
      white-space: nowrap !important;
    }
    .${legacyStyles.gateOpen} {
      top: 18% !important;
      font-size: clamp(17px, 3vw, 28px) !important;
      opacity: .78 !important;
      -webkit-text-stroke: 0 !important;
      text-shadow: 0 2px 8px rgba(20,28,38,.22) !important;
      filter: none !important;
    }
    .${phaseStyles.wallRide} {
      top: 27% !important;
      font-size: clamp(13px, 2.1vw, 19px) !important;
      opacity: .62 !important;
      text-shadow: 0 2px 7px rgba(20,28,38,.20) !important;
      filter: none !important;
      transform: translateX(-50%) scale(.88) !important;
    }
    @media(max-height:420px) {
      .${legacyStyles.combo} { top: 12% !important; font-size: clamp(16px, 2.8vw, 25px) !important; }
      .${legacyStyles.ramBanner} { top: 21% !important; font-size: clamp(14px, 2.3vw, 21px) !important; }
      .${phaseStyles.wallRide} { top: 25% !important; }
    }

    .${huntStyles.hud} {
      filter: drop-shadow(0 8px 20px rgba(2,17,29,.16)) !important;
    }
    .${huntStyles.card},
    .${huntStyles.orderCard},
    .${huntStyles.heatCard} {
      background: linear-gradient(180deg, rgba(7,35,55,.74), rgba(4,19,33,.62)) !important;
      border-color: rgba(142,229,255,.34) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 6px 18px rgba(1,13,25,.2) !important;
      backdrop-filter: blur(7px) saturate(1.12) !important;
      -webkit-backdrop-filter: blur(7px) saturate(1.12) !important;
    }
    .${legacyStyles.boostButton} {
      border-radius: 18px !important;
      background: linear-gradient(160deg, #5be8ff 0%, #1ea9df 48%, #0b5896 100%) !important;
      border-color: rgba(220,251,255,.72) !important;
      box-shadow: 0 5px 0 rgba(4,42,69,.62), 0 11px 25px rgba(0,80,135,.28), inset 0 1px 0 rgba(255,255,255,.35) !important;
    }
    .skyDancerProductFrame {
      position: fixed;
      inset: 0;
      z-index: 6;
      overflow: hidden;
      pointer-events: none;
      box-shadow: inset 0 0 52px rgba(1,13,25,.12);
    }
    .skyDancerGunsight {
      position: absolute;
      left: 50%;
      top: 50.5%;
      width: 72px;
      height: 72px;
      transform: translate(-50%,-50%);
      border: 1px solid rgba(177,243,255,.28);
      border-radius: 50%;
      opacity: .66;
      filter: drop-shadow(0 1px 5px rgba(0,34,54,.55));
      transition: transform .14s ease, border-color .14s ease, opacity .14s ease;
    }
    .skyDancerGunsight::before,
    .skyDancerGunsight::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      background: rgba(201,248,255,.48);
      transform: translate(-50%,-50%);
    }
    .skyDancerGunsight::before { width: 96px; height: 1px; }
    .skyDancerGunsight::after { width: 1px; height: 38px; }
    .skyDancerGunsight i {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 10px;
      height: 10px;
      border: 1px solid rgba(221,252,255,.76);
      transform: translate(-50%,-50%) rotate(45deg);
      background: rgba(51,196,235,.08);
    }
    .skyDancerGunsight b {
      position: absolute;
      left: 50%;
      bottom: -9px;
      width: 22px;
      height: 3px;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 3px solid rgba(185,244,255,.42);
      transform: translateX(-50%);
    }
    .skyDancerShotPulse .skyDancerGunsight {
      transform: translate(-50%,-50%) scale(.84);
      border-color: rgba(245,255,255,.92);
      opacity: 1;
    }
    .skyDancerFrameCorner {
      position: absolute;
      width: 34px;
      height: 24px;
      opacity: .34;
      border-color: rgba(159,233,255,.6);
      border-style: solid;
    }
    .skyDancerFrameCornerA { left: max(11px,env(safe-area-inset-left)); top: 16%; border-width: 1px 0 0 1px; }
    .skyDancerFrameCornerB { right: max(11px,env(safe-area-inset-right)); top: 16%; border-width: 1px 1px 0 0; }
    .skyDancerFrameCornerC { left: max(11px,env(safe-area-inset-left)); bottom: 18%; border-width: 0 0 1px 1px; }
    .skyDancerFrameCornerD { right: max(11px,env(safe-area-inset-right)); bottom: 18%; border-width: 0 1px 1px 0; }
    @media(max-height:360px) {
      .skyDancerGunsight { width: 60px; height: 60px; top: 51%; }
      .skyDancerGunsight::before { width: 82px; }
      .skyDancerGunsight::after { height: 32px; }
    }
    @media(prefers-reduced-motion:reduce) {
      .skyDancerGunsight { transition: none; }
    }
  `}</style>
    <div className={shotPulse ? "skyDancerProductFrame skyDancerShotPulse" : "skyDancerProductFrame"} aria-hidden="true">
      <span className="skyDancerGunsight"><i /><b /></span>
      <span className="skyDancerFrameCorner skyDancerFrameCornerA" />
      <span className="skyDancerFrameCorner skyDancerFrameCornerB" />
      <span className="skyDancerFrameCorner skyDancerFrameCornerC" />
      <span className="skyDancerFrameCorner skyDancerFrameCornerD" />
    </div>
  </>;
}
"use client";

import legacyStyles from "./CartRogueGame.module.css";
import phaseStyles from "./CartRoguePhase3.module.css";

/** Sky-specific HUD and presentation polish applied after inherited Cart overlays. */
export default function SkyDancerHudQualityPass() {
  return <style>{`
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
  `}</style>;
}

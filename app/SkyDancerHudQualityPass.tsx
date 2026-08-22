"use client";

import legacyStyles from "./CartRogueGame.module.css";
import phaseStyles from "./CartRoguePhase3.module.css";

/** Sky-specific HUD declutter pass applied after all inherited Cart overlays. */
export default function SkyDancerHudQualityPass() {
  return <style>{`
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

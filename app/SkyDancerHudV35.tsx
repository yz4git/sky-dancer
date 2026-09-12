"use client";

import legacyStyles from "./CartRogueGame.module.css";
import huntStyles from "./CartTurboHuntHudOverlay.module.css";
import shotStyles from "./SkyDancerShotControl.module.css";

/**
 * Reference-composition HUD pass.
 *
 * This intentionally restyles existing real telemetry instead of fabricating
 * score, radar or weapon inventory that the runtime does not yet own.
 */
export default function SkyDancerHudV35() {
  return <>
    <style>{`
      .${legacyStyles.topHud} {
        top: max(8px, env(safe-area-inset-top)) !important;
        grid-template-columns: minmax(112px,.72fr) minmax(300px,1.85fr) minmax(112px,.72fr) !important;
        gap: clamp(8px,1.2vw,16px) !important;
      }
      .${legacyStyles.runCard},
      .${legacyStyles.enemyCard},
      .${legacyStyles.meterCard} {
        background: linear-gradient(180deg, rgba(7,31,50,.20), rgba(5,26,43,.08)) !important;
        border-color: rgba(183,239,255,.14) !important;
        box-shadow: none !important;
        backdrop-filter: blur(2px) !important;
        -webkit-backdrop-filter: blur(2px) !important;
      }
      .${legacyStyles.objective} {
        padding: 7px 20px 8px !important;
        border-width: 0 0 1px !important;
        border-radius: 0 !important;
        background: linear-gradient(90deg, transparent, rgba(5,40,62,.54) 18%, rgba(5,40,62,.54) 82%, transparent) !important;
        border-color: rgba(186,241,255,.35) !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      .${legacyStyles.runCard},
      .${legacyStyles.enemyCard} {
        padding: 7px 10px 8px !important;
        min-height: 42px !important;
        border-radius: 2px !important;
      }
      .${legacyStyles.runCard} strong,
      .${legacyStyles.enemyCard} strong {
        font-size: clamp(15px,2vw,20px) !important;
        letter-spacing: .035em !important;
      }
      .${legacyStyles.bottomHud} {
        bottom: max(8px, env(safe-area-inset-bottom)) !important;
      }
      .${legacyStyles.meterCard} {
        padding: 6px 9px 7px !important;
        max-width: 190px !important;
        border-radius: 2px 10px 2px 10px !important;
      }
      .${legacyStyles.meterTrack} {
        height: 5px !important;
        margin-top: 4px !important;
        border-radius: 0 !important;
      }
      .${legacyStyles.chargeRow} {
        gap: 3px !important;
        margin-top: 4px !important;
      }
      .${legacyStyles.chargeRow} i {
        height: 5px !important;
        border-radius: 1px !important;
      }
      .${legacyStyles.actions} {
        right: max(12px, env(safe-area-inset-right)) !important;
        bottom: max(54px, calc(env(safe-area-inset-bottom) + 44px)) !important;
        gap: 7px !important;
      }
      .${legacyStyles.boostButton} {
        width: 66px !important;
        height: 66px !important;
        border-radius: 9px 17px 9px 17px !important;
        border-width: 1px !important;
        box-shadow: 0 3px 0 rgba(3,31,52,.58), 0 8px 18px rgba(0,78,125,.20), inset 0 1px 0 rgba(255,255,255,.30) !important;
      }
      .${legacyStyles.boostButton}:before {
        top: 2px !important;
        right: 6px !important;
        font-size: 13px !important;
      }
      .${legacyStyles.boostButton} strong { font-size: 13px !important; }
      .${legacyStyles.boostButton} small { margin-top: 3px !important; font-size: 7px !important; }
      .${shotStyles.shotWrap} {
        right: calc(max(12px, env(safe-area-inset-right)) + 73px) !important;
        bottom: max(54px, calc(env(safe-area-inset-bottom) + 44px)) !important;
      }
      .${shotStyles.shotButton} {
        width: 58px !important;
        height: 58px !important;
        border-radius: 8px 15px 8px 15px !important;
        box-shadow: 0 3px 0 rgba(3,25,44,.62), 0 8px 18px rgba(0,55,88,.20), inset 0 1px 0 rgba(255,255,255,.22) !important;
      }
      .${shotStyles.shotButton} strong { font-size: 11px !important; }
      .${shotStyles.shotButton} small { margin-top: 3px !important; font-size: 6px !important; }
      .${huntStyles.hud} {
        inset: max(47px, calc(env(safe-area-inset-top) + 36px)) max(10px, env(safe-area-inset-right)) auto max(10px, env(safe-area-inset-left)) !important;
        grid-template-columns: minmax(96px,.55fr) minmax(300px,1.9fr) minmax(96px,.55fr) !important;
        gap: 9px !important;
      }
      .${huntStyles.card},
      .${huntStyles.orderCard},
      .${huntStyles.heatCard} {
        background: linear-gradient(180deg, rgba(5,31,49,.36), rgba(4,21,36,.22)) !important;
        border-color: rgba(151,228,250,.16) !important;
        box-shadow: none !important;
        backdrop-filter: blur(3px) !important;
        -webkit-backdrop-filter: blur(3px) !important;
      }
      .${huntStyles.orderCard} {
        border-width: 0 0 1px !important;
        border-radius: 0 !important;
      }
      [aria-label="Missile warning"] {
        left: 50% !important;
        right: auto !important;
        top: auto !important;
        bottom: max(88px, calc(env(safe-area-inset-bottom) + 78px)) !important;
        transform: translateX(-50%) !important;
        max-width: min(56vw,360px) !important;
        padding: 4px 12px !important;
        border-radius: 2px 9px 2px 9px !important;
        font-size: clamp(9px,1.18vw,12px) !important;
        letter-spacing: .09em !important;
        opacity: .88 !important;
        white-space: nowrap !important;
      }
      .skyDancerBossV34 {
        top: max(58px, calc(env(safe-area-inset-top) + 49px)) !important;
        padding: 3px 10px 4px !important;
      }
      .skyDancerV35ReferenceFrame {
        position: fixed;
        inset: 0;
        z-index: 5;
        pointer-events: none;
        box-shadow: inset 0 0 62px rgba(3,18,32,.08);
      }
      .skyDancerV35ReferenceFrame::before,
      .skyDancerV35ReferenceFrame::after {
        content: "";
        position: absolute;
        top: 24%;
        bottom: 18%;
        width: 1px;
        opacity: .28;
        background: linear-gradient(180deg, transparent, rgba(184,239,255,.42) 20%, rgba(184,239,255,.12) 80%, transparent);
      }
      .skyDancerV35ReferenceFrame::before { left: max(18px, env(safe-area-inset-left)); }
      .skyDancerV35ReferenceFrame::after { right: max(18px, env(safe-area-inset-right)); }

      /* V40.13: boss handoff focus. The V40.12 rhythm attribute changes only when the
         boss takes ownership, so this short animation fires once instead of looping. */
      [data-v4012-rhythm="boss"] .skyDancerV35ReferenceFrame {
        animation: skyDancerV4013BossFocus .92s cubic-bezier(.18,.82,.22,1) both;
      }
      [data-v4012-rhythm="boss"] .skyDancerV35ReferenceFrame::before {
        animation: skyDancerV4013BossRailLeft .92s cubic-bezier(.18,.82,.22,1) both;
      }
      [data-v4012-rhythm="boss"] .skyDancerV35ReferenceFrame::after {
        animation: skyDancerV4013BossRailRight .92s cubic-bezier(.18,.82,.22,1) both;
      }
      [data-v4012-rhythm="boss"] .${legacyStyles.runCard},
      [data-v4012-rhythm="boss"] .${legacyStyles.enemyCard},
      [data-v4012-rhythm="boss"] .${legacyStyles.meterCard} {
        animation: skyDancerV4013HudSettle .72s cubic-bezier(.2,.75,.2,1) both;
      }

      /* V40.16: keep the phone hero corridor visually open at authored combat peaks.
         Only information panels yield. Boss HP, missile warning and touch controls remain fully legible. */
      .${legacyStyles.topHud},
      .${legacyStyles.runCard},
      .${legacyStyles.enemyCard},
      .${legacyStyles.objective},
      .${legacyStyles.meterCard},
      .${huntStyles.hud},
      .${huntStyles.card},
      .${huntStyles.orderCard},
      .${huntStyles.heatCard} {
        transition: opacity .18s ease, background-color .18s ease, border-color .18s ease, backdrop-filter .18s ease !important;
      }
      [data-v4012-rhythm="signature"] .${legacyStyles.runCard},
      [data-v4012-rhythm="signature"] .${legacyStyles.enemyCard},
      [data-v4012-rhythm="signature"] .${huntStyles.card},
      [data-v4012-rhythm="signature"] .${huntStyles.heatCard} {
        opacity: .88 !important;
      }
      [data-v4012-rhythm="signature"] .${legacyStyles.objective},
      [data-v4012-rhythm="signature"] .${huntStyles.orderCard} {
        opacity: .86 !important;
      }
      [data-v4012-rhythm="rival"] .${legacyStyles.runCard},
      [data-v4012-rhythm="rival"] .${legacyStyles.enemyCard},
      [data-v4012-rhythm="rival"] .${huntStyles.card},
      [data-v4012-rhythm="rival"] .${huntStyles.heatCard} {
        opacity: .78 !important;
        backdrop-filter: blur(1px) !important;
        -webkit-backdrop-filter: blur(1px) !important;
      }
      [data-v4012-rhythm="rival"] .${legacyStyles.objective},
      [data-v4012-rhythm="rival"] .${huntStyles.orderCard} {
        opacity: .76 !important;
      }
      [data-v4012-rhythm="boss-rise"] .${legacyStyles.topHud} {
        grid-template-columns: minmax(92px,.58fr) minmax(246px,1.44fr) minmax(92px,.58fr) !important;
        gap: clamp(6px,.85vw,10px) !important;
      }
      [data-v4012-rhythm="boss-rise"] .${legacyStyles.runCard},
      [data-v4012-rhythm="boss-rise"] .${legacyStyles.enemyCard},
      [data-v4012-rhythm="boss-rise"] .${huntStyles.card},
      [data-v4012-rhythm="boss-rise"] .${huntStyles.heatCard} {
        opacity: .62 !important;
        background: linear-gradient(180deg, rgba(7,31,50,.12), rgba(5,26,43,.03)) !important;
        border-color: rgba(183,239,255,.08) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      [data-v4012-rhythm="boss-rise"] .${legacyStyles.objective},
      [data-v4012-rhythm="boss-rise"] .${huntStyles.orderCard} {
        opacity: .58 !important;
      }
      [data-v4012-rhythm="boss-rise"] .${legacyStyles.meterCard} {
        opacity: .76 !important;
      }
      [data-v4012-rhythm="boss"] .${legacyStyles.topHud} {
        grid-template-columns: minmax(98px,.62fr) minmax(260px,1.54fr) minmax(98px,.62fr) !important;
        gap: clamp(6px,.95vw,12px) !important;
      }
      [data-v4012-rhythm="boss"] .${legacyStyles.runCard},
      [data-v4012-rhythm="boss"] .${legacyStyles.enemyCard},
      [data-v4012-rhythm="boss"] .${huntStyles.card},
      [data-v4012-rhythm="boss"] .${huntStyles.heatCard} {
        opacity: .76 !important;
        background: linear-gradient(180deg, rgba(7,31,50,.15), rgba(5,26,43,.045)) !important;
        border-color: rgba(183,239,255,.10) !important;
        backdrop-filter: blur(1px) !important;
        -webkit-backdrop-filter: blur(1px) !important;
      }
      [data-v4012-rhythm="boss"] .${legacyStyles.objective},
      [data-v4012-rhythm="boss"] .${huntStyles.orderCard} {
        opacity: .72 !important;
      }
      [data-v4012-rhythm="boss"] .${legacyStyles.meterCard} {
        opacity: .84 !important;
      }
      [data-v4012-rhythm="boss-rise"] [aria-label="Missile warning"],
      [data-v4012-rhythm="boss"] [aria-label="Missile warning"],
      [data-v4012-rhythm="rival"] [aria-label="Missile warning"] {
        opacity: .94 !important;
      }
      [data-v4012-rhythm="boss-rise"] .skyDancerBossV34,
      [data-v4012-rhythm="boss"] .skyDancerBossV34 {
        opacity: 1 !important;
      }

      @keyframes skyDancerV4013BossFocus {
        0% {
          box-shadow: inset 0 0 62px rgba(3,18,32,.08);
          background: rgba(4,17,29,0);
        }
        18% {
          box-shadow: inset 0 0 120px rgba(2,12,22,.34);
          background: rgba(4,17,29,.055);
        }
        45% {
          box-shadow: inset 0 0 82px rgba(4,25,40,.18);
          background: rgba(4,17,29,.018);
        }
        100% {
          box-shadow: inset 0 0 62px rgba(3,18,32,.08);
          background: rgba(4,17,29,0);
        }
      }
      @keyframes skyDancerV4013BossRailLeft {
        0% { left: max(18px, env(safe-area-inset-left)); opacity: .28; transform: scaleY(1); }
        20% { left: 42%; opacity: .84; transform: scaleY(.74); }
        42% { left: 25%; opacity: .58; transform: scaleY(.92); }
        100% { left: max(18px, env(safe-area-inset-left)); opacity: .28; transform: scaleY(1); }
      }
      @keyframes skyDancerV4013BossRailRight {
        0% { right: max(18px, env(safe-area-inset-right)); opacity: .28; transform: scaleY(1); }
        20% { right: 42%; opacity: .84; transform: scaleY(.74); }
        42% { right: 25%; opacity: .58; transform: scaleY(.92); }
        100% { right: max(18px, env(safe-area-inset-right)); opacity: .28; transform: scaleY(1); }
      }
      @keyframes skyDancerV4013HudSettle {
        0% { opacity: 1; transform: translateY(0); }
        20% { opacity: .62; transform: translateY(-2px); }
        52% { opacity: .86; transform: translateY(0); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-v4012-rhythm="boss"] .skyDancerV35ReferenceFrame,
        [data-v4012-rhythm="boss"] .skyDancerV35ReferenceFrame::before,
        [data-v4012-rhythm="boss"] .skyDancerV35ReferenceFrame::after,
        [data-v4012-rhythm="boss"] .${legacyStyles.runCard},
        [data-v4012-rhythm="boss"] .${legacyStyles.enemyCard},
        [data-v4012-rhythm="boss"] .${legacyStyles.meterCard} {
          animation: none !important;
        }
        .${legacyStyles.topHud},
        .${legacyStyles.runCard},
        .${legacyStyles.enemyCard},
        .${legacyStyles.objective},
        .${legacyStyles.meterCard},
        .${huntStyles.hud},
        .${huntStyles.card},
        .${huntStyles.orderCard},
        .${huntStyles.heatCard} {
          transition: none !important;
        }
      }
      @media(max-height:420px) {
        .${legacyStyles.actions} { bottom: max(44px, calc(env(safe-area-inset-bottom) + 36px)) !important; }
        .${legacyStyles.boostButton} { width: 58px !important; height: 58px !important; }
        .${shotStyles.shotWrap} {
          right: calc(max(10px, env(safe-area-inset-right)) + 64px) !important;
          bottom: max(44px, calc(env(safe-area-inset-bottom) + 36px)) !important;
        }
        .${shotStyles.shotButton} { width: 51px !important; height: 51px !important; }
        [aria-label="Missile warning"] { bottom: max(68px, calc(env(safe-area-inset-bottom) + 58px)) !important; }
        [data-v4012-rhythm="boss-rise"] .${legacyStyles.topHud},
        [data-v4012-rhythm="boss"] .${legacyStyles.topHud} {
          grid-template-columns: minmax(82px,.54fr) minmax(220px,1.4fr) minmax(82px,.54fr) !important;
          gap: 6px !important;
        }
      }
    `}</style>
    <div className="skyDancerV35ReferenceFrame" aria-hidden="true" />
  </>;
}

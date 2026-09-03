"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SKY_DANCER_COMBAT_DECISION_EVENT_V45,
  type SkyDancerCombatDecisionSnapshotV45,
} from "../src/sky/presentation/SkyDancerV45DecisionHierarchyPass";
import huntStyles from "./CartTurboHuntHudOverlay.module.css";

function altitudeLabel(value: number): string {
  const rounded = Math.round(Math.abs(value));
  if (value > 1) return `▲ +${rounded}m`;
  if (value < -1) return `▼ -${rounded}m`;
  return "◆ LEVEL";
}

export default function SkyDancerHudV45() {
  const [decision, setDecision] = useState<SkyDancerCombatDecisionSnapshotV45 | null>(null);
  const [hitPulse, setHitPulse] = useState(false);
  const hitSerialRef = useRef(0);
  const hitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onDecision = (event: Event) => {
      const detail = (event as CustomEvent<SkyDancerCombatDecisionSnapshotV45>).detail ?? null;
      if (detail && detail.hitSerial > hitSerialRef.current) {
        hitSerialRef.current = detail.hitSerial;
        setHitPulse(true);
        if (hitTimerRef.current !== null) window.clearTimeout(hitTimerRef.current);
        hitTimerRef.current = window.setTimeout(() => {
          hitTimerRef.current = null;
          setHitPulse(false);
        }, 180);
      } else if (detail) {
        hitSerialRef.current = Math.max(hitSerialRef.current, detail.hitSerial);
      }
      setDecision(detail);
    };
    window.addEventListener(SKY_DANCER_COMBAT_DECISION_EVENT_V45, onDecision);
    return () => {
      window.removeEventListener(SKY_DANCER_COMBAT_DECISION_EVENT_V45, onDecision);
      if (hitTimerRef.current !== null) window.clearTimeout(hitTimerRef.current);
    };
  }, []);

  const bossActive = Boolean(decision?.bossActive);
  useEffect(() => {
    document.body.classList.toggle("skyDancerV45BossActive", bossActive);
    return () => document.body.classList.remove("skyDancerV45BossActive");
  }, [bossActive]);

  const bossDirective = useMemo(() => {
    if (!decision?.bossActive) return null;
    if (decision.bossMode === "strike") return "DIVE RUN · EVADE → COUNTER";
    if (decision.bossMode === "break" || decision.bossCoreOpen) return "CORE OPEN · FIRE NOW";
    return "HIGH LANE · TRACK THE CLIMB";
  }, [decision]);

  const locked = Boolean(decision?.targetEnemyId);
  return <>
    <style>{`
      .skyDancerV45Hit {
        position: fixed;
        z-index: 140;
        left: 50%;
        top: 36%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        padding: 3px 10px 4px;
        color: #efffff;
        border: 1px solid rgba(145,255,236,.86);
        background: rgba(8,66,65,.58);
        box-shadow: 0 0 22px rgba(94,255,222,.42);
        font: 950 clamp(13px,2.2vw,20px)/1 system-ui,sans-serif;
        letter-spacing: .18em;
        text-shadow: 0 0 8px rgba(116,255,235,.72);
      }
      .skyDancerV45Lock {
        position: fixed;
        z-index: 136;
        left: 50%;
        top: calc(42% + 48px);
        transform: translateX(-50%);
        display: grid;
        justify-items: center;
        gap: 2px;
        min-width: 152px;
        max-width: min(54vw, 430px);
        padding: 3px 9px 4px;
        pointer-events: none;
        color: rgba(223,245,250,.76);
        background: linear-gradient(90deg, transparent, rgba(4,31,45,.48) 16%, rgba(4,31,45,.54) 84%, transparent);
        border-bottom: 1px solid rgba(180,235,247,.20);
        font: 850 clamp(8px,.92vw,10px)/1.05 system-ui,sans-serif;
        letter-spacing: .08em;
        text-shadow: 0 1px 5px rgba(0,15,28,.82);
        white-space: nowrap;
      }
      .skyDancerV45Lock[data-ready="true"] {
        color: rgba(238,255,253,.96);
        border-color: rgba(114,246,222,.48);
        background: linear-gradient(90deg, transparent, rgba(5,56,55,.48) 16%, rgba(5,56,55,.58) 84%, transparent);
      }
      .skyDancerV45Lock[data-ready="false"] .skyDancerV45Action { color: #ffd07a; }
      .skyDancerV45Lock[data-ready="true"] .skyDancerV45Action { color: #8effdb; }
      .skyDancerV45LockMain {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 7px;
      }
      .skyDancerV45LockMain strong {
        color: rgba(248,253,255,.96);
        font-size: 1.08em;
        letter-spacing: .11em;
      }
      .skyDancerV45Altitude { color: #d9f7ff; }
      .skyDancerV45Range { opacity: .62; font-size: .88em; }
      .skyDancerV45Action {
        overflow: hidden;
        max-width: 46vw;
        text-overflow: ellipsis;
        font-size: .92em;
        letter-spacing: .075em;
      }
      .skyDancerV45BossDirective {
        position: fixed;
        z-index: 135;
        left: 50%;
        top: max(79px, calc(env(safe-area-inset-top) + 69px));
        transform: translateX(-50%);
        padding: 2px 11px 3px;
        pointer-events: none;
        color: rgba(255,232,218,.88);
        border-bottom: 1px solid rgba(255,119,91,.34);
        background: linear-gradient(90deg, transparent, rgba(63,17,16,.46), transparent);
        font: 900 clamp(8px,.9vw,10px)/1 system-ui,sans-serif;
        letter-spacing: .11em;
        text-shadow: 0 1px 5px rgba(40,0,0,.72);
        white-space: nowrap;
      }
      .skyDancerV45BossActive .skyDancerStageV40 {
        top: max(39px, calc(env(safe-area-inset-top) + 31px)) !important;
        width: min(48vw, 460px) !important;
      }
      .skyDancerV45BossActive .skyDancerStageV40Main {
        min-height: 20px !important;
        padding: 2px 10px 3px !important;
      }
      .skyDancerV45BossActive .skyDancerStageV40Detail {
        opacity: .70 !important;
        font-size: clamp(7px,.82vw,9px) !important;
      }
      .skyDancerV45BossActive .${huntStyles.heatCard} {
        position: fixed !important;
        z-index: 134 !important;
        top: max(42px, calc(env(safe-area-inset-top) + 34px)) !important;
        right: max(10px, env(safe-area-inset-right)) !important;
        left: auto !important;
        width: min(20vw, 128px) !important;
        min-height: 24px !important;
        padding: 2px 6px 3px !important;
        opacity: .66 !important;
      }
      .skyDancerV45BossActive .${huntStyles.heatHead} strong { font-size: 11px !important; }
      .skyDancerV45BossActive .${huntStyles.stats} { font-size: 6px !important; }
      .skyDancerV45BossActive [aria-label="Missile warning"] {
        top: max(118px, calc(env(safe-area-inset-top) + 106px)) !important;
        bottom: auto !important;
        max-width: min(29vw, 235px) !important;
        opacity: .72 !important;
      }
      @media(max-height:390px) {
        .skyDancerV45Lock { top: calc(42% + 41px); padding: 2px 7px 3px; }
        .skyDancerV45BossDirective { top: 70px; }
        .skyDancerV45BossActive .skyDancerStageV40 { top: 34px !important; }
        .skyDancerV45BossActive .${huntStyles.heatCard} { top: 37px !important; width: 112px !important; }
        .skyDancerV45BossActive [aria-label="Missile warning"] { top: 105px !important; }
      }
    `}</style>
    {locked && decision && (
      <div
        className="skyDancerV45Lock"
        data-ready={decision.vulnerable ? "true" : "false"}
        data-class={decision.className ?? "none"}
        aria-label="V45 target decision"
      >
        <div className="skyDancerV45LockMain">
          <strong>{decision.label}</strong>
          <span className="skyDancerV45Altitude">{altitudeLabel(decision.altitudeDeltaMeters)}</span>
          <span className="skyDancerV45Range">{Math.round(decision.distance)}m</span>
        </div>
        <span className="skyDancerV45Action">{decision.action}</span>
      </div>
    )}
    {hitPulse && <div className="skyDancerV45Hit" aria-label="Sky Raid hit confirmation">HIT</div>}
    {bossDirective && <div className="skyDancerV45BossDirective" aria-label="V45 boss directive">{bossDirective}</div>}
  </>;
}

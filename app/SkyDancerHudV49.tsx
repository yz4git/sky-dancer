"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SKY_DANCER_CAMPAIGN_EVENT_V49,
  type SkyDancerCampaignSnapshotV49,
} from "../src/sky/SkyDancerCombatChoreographyV46";

function percent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function SkyDancerHudV49() {
  const [campaign, setCampaign] = useState<SkyDancerCampaignSnapshotV49 | null>(null);

  useEffect(() => {
    const onCampaign = (event: Event) => {
      setCampaign((event as CustomEvent<SkyDancerCampaignSnapshotV49>).detail ?? null);
    };
    window.addEventListener(SKY_DANCER_CAMPAIGN_EVENT_V49, onCampaign);
    return () => window.removeEventListener(SKY_DANCER_CAMPAIGN_EVENT_V49, onCampaign);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("skyDancerV49Active", Boolean(campaign));
    document.body.classList.toggle("skyDancerV49Complete", Boolean(campaign?.campaignComplete));
    return () => {
      document.body.classList.remove("skyDancerV49Active");
      document.body.classList.remove("skyDancerV49Complete");
    };
  }, [campaign]);

  const progress = campaign ? campaign.kills / Math.max(1, campaign.killTarget) : 0;
  const flow = campaign?.flow ?? 0;
  const resultSummary = useMemo(() => {
    if (!campaign?.campaignComplete) return "";
    return campaign.results.map((result) => `M${result.mission} ${result.grade}`).join(" · ");
  }, [campaign]);

  if (!campaign) return null;

  return <>
    <style>{`
      .skyDancerV49Mission {
        position: fixed;
        z-index: 142;
        left: max(10px, env(safe-area-inset-left));
        top: max(10px, calc(env(safe-area-inset-top) + 6px));
        width: min(38vw, 286px);
        pointer-events: none;
        color: rgba(239,250,255,.94);
        text-shadow: 0 1px 5px rgba(0,12,25,.82);
        font-family: system-ui,sans-serif;
        letter-spacing: .065em;
      }
      .skyDancerV49MissionHead {
        display: flex;
        align-items: baseline;
        gap: 7px;
        padding-bottom: 3px;
        border-bottom: 1px solid rgba(161,231,247,.27);
      }
      .skyDancerV49MissionIndex {
        opacity: .58;
        font: 800 clamp(7px,.82vw,9px)/1 system-ui,sans-serif;
      }
      .skyDancerV49MissionTitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 950 clamp(10px,1.25vw,14px)/1 system-ui,sans-serif;
      }
      .skyDancerV49Beat {
        display: flex;
        gap: 7px;
        align-items: center;
        padding-top: 4px;
        font: 850 clamp(7px,.85vw,9px)/1.05 system-ui,sans-serif;
      }
      .skyDancerV49Beat strong { color: #b8f4ff; }
      .skyDancerV49Directive {
        margin-top: 3px;
        opacity: .66;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 720 clamp(6px,.75vw,8px)/1.05 system-ui,sans-serif;
      }
      .skyDancerV49Meters {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 4px 8px;
        align-items: center;
        margin-top: 6px;
        padding: 5px 7px 4px;
        background: linear-gradient(90deg,rgba(4,28,44,.56),rgba(4,28,44,.22),transparent);
        border-left: 2px solid rgba(114,225,244,.52);
      }
      .skyDancerV49FlowLine,
      .skyDancerV49ProgressLine {
        position: relative;
        height: 3px;
        overflow: hidden;
        background: rgba(220,248,255,.12);
      }
      .skyDancerV49FlowLine i,
      .skyDancerV49ProgressLine i {
        display: block;
        height: 100%;
        transform-origin: left center;
      }
      .skyDancerV49FlowLine i { background: rgba(113,245,224,.90); }
      .skyDancerV49ProgressLine i { background: rgba(151,216,255,.78); }
      .skyDancerV49MeterLabel {
        opacity: .72;
        font: 850 7px/1 system-ui,sans-serif;
      }
      .skyDancerV49Grade {
        grid-row: 1 / span 4;
        grid-column: 2;
        color: #f6fcff;
        font: 950 clamp(20px,3.2vw,30px)/1 system-ui,sans-serif;
        letter-spacing: .02em;
      }
      .skyDancerV49Stats {
        margin-top: 3px;
        opacity: .54;
        font: 750 6px/1 system-ui,sans-serif;
        white-space: nowrap;
      }
      .skyDancerV49Active .skyDancerStageV40 {
        opacity: .19 !important;
      }
      .skyDancerV49Active.skyDancerV45BossActive .skyDancerStageV40 {
        opacity: .48 !important;
      }
      .skyDancerV49CompleteCard {
        position: fixed;
        z-index: 190;
        inset: 50% auto auto 50%;
        width: min(68vw, 520px);
        transform: translate(-50%,-50%);
        padding: 18px 22px 17px;
        pointer-events: none;
        text-align: center;
        color: #f6fcff;
        background: radial-gradient(circle at 50% 0%,rgba(30,113,139,.92),rgba(4,19,32,.94) 68%);
        border: 1px solid rgba(173,240,255,.48);
        box-shadow: 0 16px 60px rgba(0,8,20,.54);
        font-family: system-ui,sans-serif;
      }
      .skyDancerV49CompleteCard strong {
        display: block;
        font: 950 clamp(19px,3.2vw,34px)/1 system-ui,sans-serif;
        letter-spacing: .12em;
      }
      .skyDancerV49CompleteCard b {
        display: block;
        margin: 8px 0 6px;
        color: #92f4df;
        font: 950 clamp(24px,4vw,40px)/1 system-ui,sans-serif;
      }
      .skyDancerV49CompleteCard span {
        opacity: .72;
        font: 800 clamp(7px,.9vw,10px)/1.2 system-ui,sans-serif;
        letter-spacing: .08em;
      }
      @media(max-height:390px) {
        .skyDancerV49Mission { top: 7px; width: min(34vw,250px); }
        .skyDancerV49Directive { display: none; }
        .skyDancerV49Meters { margin-top: 4px; padding-top: 3px; padding-bottom: 3px; }
        .skyDancerV49Stats { display: none; }
        .skyDancerV49CompleteCard { padding: 12px 18px; }
      }
    `}</style>

    {!campaign.campaignComplete && (
      <section className="skyDancerV49Mission" aria-label="V49 campaign HUD">
        <div className="skyDancerV49MissionHead">
          <span className="skyDancerV49MissionIndex">MISSION {campaign.mission}/{campaign.missionTotal}</span>
          <strong className="skyDancerV49MissionTitle">{campaign.title}</strong>
        </div>
        <div className="skyDancerV49Beat">
          <strong>{campaign.beatLabel}</strong>
          <span>{campaign.kills}/{campaign.killTarget}</span>
        </div>
        <div className="skyDancerV49Directive">{campaign.directive}</div>
        <div className="skyDancerV49Meters">
          <span className="skyDancerV49MeterLabel">FLOW {Math.round(flow)}</span>
          <strong className="skyDancerV49Grade">{campaign.grade}</strong>
          <div className="skyDancerV49FlowLine"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, flow / 100))})` }} /></div>
          <span className="skyDancerV49MeterLabel">MISSION {percent(progress)}</span>
          <div className="skyDancerV49ProgressLine"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }} /></div>
        </div>
        <div className="skyDancerV49Stats">ACC {percent(campaign.accuracy)} · PERFECT EVADE {campaign.perfectEvades} · PEAK FLOW {Math.round(campaign.peakFlow)}</div>
      </section>
    )}

    {campaign.campaignComplete && (
      <section className="skyDancerV49CompleteCard" aria-label="V49 campaign complete">
        <strong>CAMPAIGN COMPLETE</strong>
        <b>{campaign.grade}</b>
        <span>{resultSummary || "FLIGHT RECORD COMPLETE"}</span>
      </section>
    )}
  </>;
}

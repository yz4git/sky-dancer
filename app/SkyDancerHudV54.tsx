"use client";

import { useEffect, useRef, useState } from "react";
import {
  SKY_DANCER_CAMPAIGN_EVENT_V49,
  type SkyDancerCampaignSnapshotV49,
} from "../src/sky/SkyDancerCombatChoreographyV46";

type CinematicKind = "mission" | "boss" | "clear";

interface CinematicBeat {
  kind: CinematicKind;
  title: string;
  subtitle: string;
  serial: number;
}

const STYLE_LABEL: Record<SkyDancerCampaignSnapshotV49["worldStyle"], string> = {
  city: "CITY AIRSPACE",
  clouds: "CLOUD KNIFE",
  mountains: "IRON VALLEY",
  facility: "HALO FOUNDRY",
  storm: "STORM CROWN",
  citadel: "LAST LIGHT",
};

export default function SkyDancerHudV54() {
  const [campaign, setCampaign] = useState<SkyDancerCampaignSnapshotV49 | null>(null);
  const [cinematic, setCinematic] = useState<CinematicBeat | null>(null);
  const lastMission = useRef(0);
  const lastPhase = useRef<SkyDancerCampaignSnapshotV49["phase"] | null>(null);
  const serial = useRef(0);

  useEffect(() => {
    const onCampaign = (event: Event) => {
      const next = (event as CustomEvent<SkyDancerCampaignSnapshotV49>).detail ?? null;
      setCampaign(next);
      if (!next || next.campaignComplete) return;
      if (next.mission !== lastMission.current) {
        lastMission.current = next.mission;
        serial.current += 1;
        setCinematic({
          kind: "mission",
          title: `MISSION ${String(next.mission).padStart(2, "0")} · ${next.title}`,
          subtitle: `${STYLE_LABEL[next.worldStyle]} // ${next.subtitle}`,
          serial: serial.current,
        });
      } else if (next.phase === "boss" && lastPhase.current !== "boss") {
        serial.current += 1;
        setCinematic({
          kind: "boss",
          title: next.bossTitle,
          subtitle: "BOSS AIRSPACE // READ THE ATTACK RUN",
          serial: serial.current,
        });
      } else if (next.phase === "stage-clear" && lastPhase.current !== "stage-clear") {
        serial.current += 1;
        setCinematic({
          kind: "clear",
          title: `MISSION ${String(next.mission).padStart(2, "0")} CLEAR`,
          subtitle: `GRADE ${next.grade} // FLOW ${Math.round(next.peakFlow)}`,
          serial: serial.current,
        });
      }
      lastPhase.current = next.phase;
    };
    window.addEventListener(SKY_DANCER_CAMPAIGN_EVENT_V49, onCampaign);
    return () => window.removeEventListener(SKY_DANCER_CAMPAIGN_EVENT_V49, onCampaign);
  }, []);

  useEffect(() => {
    if (!cinematic) return undefined;
    const duration = cinematic.kind === "boss" ? 2200 : 1900;
    const timer = window.setTimeout(() => setCinematic((current) => current?.serial === cinematic.serial ? null : current), duration);
    return () => window.clearTimeout(timer);
  }, [cinematic]);

  useEffect(() => {
    document.body.classList.toggle("skyDancerV54Active", Boolean(campaign && !campaign.campaignComplete));
    document.body.classList.toggle("skyDancerV54Boss", campaign?.phase === "boss");
    document.body.classList.toggle("skyDancerV54FlowHigh", (campaign?.flow ?? 0) >= 72);
    return () => {
      document.body.classList.remove("skyDancerV54Active", "skyDancerV54Boss", "skyDancerV54FlowHigh");
    };
  }, [campaign]);

  if (!campaign || campaign.campaignComplete) return null;
  const flow = Math.max(0, Math.min(100, campaign.flow));
  const missionProgress = campaign.kills / Math.max(1, campaign.killTarget);

  return <>
    <style>{`
      .skyDancerV54Active .skyDancerV49Mission { display:none !important; }
      .skyDancerV54Active .skyDancerStageV40 { opacity:.14 !important; }
      .skyDancerV54Boss .skyDancerStageV40 { opacity:.28 !important; }
      .skyDancerV54Rail {
        position:fixed;
        z-index:154;
        left:max(12px, env(safe-area-inset-left));
        top:max(10px, calc(env(safe-area-inset-top) + 7px));
        width:min(31vw,238px);
        pointer-events:none;
        color:rgba(238,250,255,.94);
        font-family:system-ui,sans-serif;
        text-shadow:0 2px 8px rgba(0,8,18,.74);
      }
      .skyDancerV54Rail::before {
        content:"";
        position:absolute;
        inset:-7px -10px -8px -12px;
        background:linear-gradient(100deg,rgba(3,19,31,.58),rgba(3,19,31,.20) 72%,transparent);
        clip-path:polygon(0 0,94% 0,100% 18%,92% 100%,0 100%);
        border-left:2px solid rgba(110,232,255,.65);
        z-index:-1;
      }
      .skyDancerV54Meta {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        color:rgba(174,234,247,.68);
        font:850 6.5px/1 system-ui,sans-serif;
        letter-spacing:.12em;
        white-space:nowrap;
      }
      .skyDancerV54Title {
        margin-top:3px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        font:950 clamp(10px,1.18vw,13px)/1 system-ui,sans-serif;
        letter-spacing:.055em;
      }
      .skyDancerV54Directive {
        margin-top:4px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        color:rgba(222,246,252,.65);
        font:760 clamp(6px,.72vw,8px)/1 system-ui,sans-serif;
        letter-spacing:.065em;
      }
      .skyDancerV54Flow {
        display:grid;
        grid-template-columns:auto 1fr auto;
        gap:6px;
        align-items:center;
        margin-top:6px;
        font:900 6.5px/1 system-ui,sans-serif;
        letter-spacing:.07em;
      }
      .skyDancerV54FlowTrack {
        position:relative;
        height:3px;
        background:rgba(211,247,255,.12);
        overflow:hidden;
      }
      .skyDancerV54FlowTrack i {
        display:block;
        height:100%;
        transform-origin:left center;
        background:linear-gradient(90deg,#70d8ff,#7dffe2 70%,#fff2a1);
        box-shadow:0 0 7px rgba(101,240,255,.42);
      }
      .skyDancerV54Grade { font-size:12px; color:#f7fdff; }
      .skyDancerV54MissionTick {
        position:absolute;
        right:0;
        top:calc(100% + 4px);
        width:38%;
        height:1px;
        background:rgba(130,224,244,.16);
      }
      .skyDancerV54MissionTick i {
        display:block;
        height:100%;
        transform-origin:left center;
        background:rgba(155,236,255,.68);
      }
      .skyDancerV54Frame {
        position:fixed;
        z-index:138;
        inset:0;
        pointer-events:none;
        box-shadow:inset 0 0 72px rgba(0,15,31,.13);
      }
      .skyDancerV54FlowHigh .skyDancerV54Frame {
        box-shadow:inset 0 0 82px rgba(58,214,224,.12),inset 0 -12px 42px rgba(0,18,34,.12);
      }
      .skyDancerV54Cinematic {
        position:fixed;
        z-index:188;
        left:50%;
        top:39%;
        width:min(74vw,620px);
        transform:translate(-50%,-50%);
        pointer-events:none;
        text-align:center;
        color:#f5fcff;
        font-family:system-ui,sans-serif;
        text-shadow:0 2px 14px rgba(0,7,18,.85);
        animation:skyDancerV54Beat 1.9s ease both;
      }
      .skyDancerV54Cinematic[data-kind="boss"] { animation-duration:2.2s; }
      .skyDancerV54Cinematic::before,
      .skyDancerV54Cinematic::after {
        content:"";
        display:block;
        height:1px;
        margin:0 auto 8px;
        width:78%;
        background:linear-gradient(90deg,transparent,rgba(143,235,255,.78),transparent);
      }
      .skyDancerV54Cinematic::after { margin:8px auto 0; }
      .skyDancerV54Cinematic[data-kind="boss"]::before,
      .skyDancerV54Cinematic[data-kind="boss"]::after {
        background:linear-gradient(90deg,transparent,rgba(255,115,86,.85),transparent);
      }
      .skyDancerV54Cinematic strong {
        display:block;
        font:950 clamp(18px,3.4vw,36px)/1 system-ui,sans-serif;
        letter-spacing:.14em;
      }
      .skyDancerV54Cinematic[data-kind="boss"] strong { color:#fff0e9; }
      .skyDancerV54Cinematic span {
        display:block;
        margin-top:5px;
        color:rgba(208,242,251,.70);
        font:850 clamp(7px,.9vw,10px)/1 system-ui,sans-serif;
        letter-spacing:.12em;
      }
      @keyframes skyDancerV54Beat {
        0% { opacity:0; transform:translate(-50%,-44%) scale(.97); filter:blur(5px); }
        13%,72% { opacity:1; transform:translate(-50%,-50%) scale(1); filter:blur(0); }
        100% { opacity:0; transform:translate(-50%,-56%) scale(1.015); filter:blur(2px); }
      }
      @media(max-height:390px) {
        .skyDancerV54Rail { top:7px; width:min(29vw,220px); }
        .skyDancerV54Directive { display:none; }
        .skyDancerV54Flow { margin-top:4px; }
        .skyDancerV54Cinematic { top:35%; }
      }
    `}</style>

    <div className="skyDancerV54Frame" aria-hidden="true" />
    <section className="skyDancerV54Rail" aria-label="V54 cinematic mission HUD">
      <div className="skyDancerV54Meta">
        <span>M{String(campaign.mission).padStart(2, "0")} // {STYLE_LABEL[campaign.worldStyle]}</span>
        <span>{campaign.kills}/{campaign.killTarget}</span>
      </div>
      <div className="skyDancerV54Title">{campaign.beatLabel}</div>
      <div className="skyDancerV54Directive">{campaign.directive}</div>
      <div className="skyDancerV54Flow">
        <span>FLOW {Math.round(flow)}</span>
        <div className="skyDancerV54FlowTrack"><i style={{ transform: `scaleX(${flow / 100})` }} /></div>
        <strong className="skyDancerV54Grade">{campaign.grade}</strong>
      </div>
      <div className="skyDancerV54MissionTick"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, missionProgress))})` }} /></div>
    </section>

    {cinematic && (
      <section className="skyDancerV54Cinematic" data-kind={cinematic.kind} aria-label="V54 cinematic beat">
        <strong>{cinematic.title}</strong>
        <span>{cinematic.subtitle}</span>
      </section>
    )}
  </>;
}

"use client";

import { useEffect, useState } from "react";
import {
  SKY_DANCER_MISSILE_EVENT,
  type SkyDancerMissileSourceClass,
  type SkyDancerMissileState,
} from "../src/sky/SkyDancerFlightCombat";

function skyText(value: string): string {
  let next = value;
  next = next.replaceAll("HOLD DRIFT · RELEASE DASH", "HOLD BOOST · RELEASE DASH");
  next = next.replaceAll("WALL RIDE", "LOW PASS");
  next = next.replaceAll("TURBO RAM LIGHT TARGETS", "MISSILE TARGETS");
  next = next.replaceAll("TURBO RAM BOSS", "MISSILE BOSS");
  next = next.replaceAll("TURBO RAM", "BOOST STRIKE");
  next = next.replaceAll("TURBO SMASH", "BOOST STRIKE");
  next = next.replaceAll("TURBO STORM", "BOOST STORM");
  next = next.replaceAll("ARCADE TURN", "FLIGHT CONTROL");
  next = next.replaceAll("BRAWL", "AIRSPACE");
  next = next.replaceAll("ROOM CLEAR", "AIRSPACE CLEAR");
  next = next.replaceAll("GATE OPEN", "ROUTE OPEN");
  next = next.replace(/\bRAM\b/g, "BOOST");
  next = next.replace(/\bP0\b/g, "LOCK");
  next = next.replace(/\bSCR0\b/g, "SCORE");
  return next;
}

function rewriteLegacyText(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) nodes.push(current);
    current = walker.nextNode();
  }
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.tagName === "STYLE" || parent.tagName === "SCRIPT") continue;
    const before = node.nodeValue ?? "";
    const after = skyText(before);
    if (after !== before) node.nodeValue = after;
  }
}

function missileSourceCue(sourceClass: SkyDancerMissileSourceClass): string {
  switch (sourceClass) {
    case "boss": return "BOSS MISSILE";
    case "heavy": return "HEAVY MISSILE";
    case "bomber": return "BOMBER SALVO";
    case "striker": return "STRIKER MISSILE";
    case "orbiter": return "ORBITER MISSILE";
    case "drifter": return "JINKER MISSILE";
    case "standard": return "MISSILE WARNING";
  }
}

function missileSourceColor(sourceClass: SkyDancerMissileSourceClass): string {
  switch (sourceClass) {
    case "boss": return "#ff6f68";
    case "heavy": return "#ff8589";
    case "bomber": return "#ffdc72";
    case "striker": return "#ffb66f";
    case "orbiter": return "#75ecff";
    case "drifter": return "#d2a9ff";
    case "standard": return "#ffd67a";
  }
}

export default function SkyDancerCombatPolish() {
  const [warning, setWarning] = useState<{ count: number; distance: number; sourceClass: SkyDancerMissileSourceClass } | null>(null);

  useEffect(() => {
    const rewrite = () => rewriteLegacyText(document.body);
    rewrite();
    const observer = new MutationObserver(() => rewrite());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onMissiles = (event: Event) => {
      const detail = (event as CustomEvent<SkyDancerMissileState>).detail;
      let nearestMissile: SkyDancerMissileState["missiles"][number] | null = null;
      for (const missile of detail.missiles) {
        if (!nearestMissile || missile.distanceToPlayer < nearestMissile.distanceToPlayer) nearestMissile = missile;
      }
      if (!nearestMissile || !Number.isFinite(nearestMissile.distanceToPlayer) || nearestMissile.distanceToPlayer >= 30) {
        setWarning(null);
        return;
      }
      const closeCount = detail.missiles.filter((missile) => missile.distanceToPlayer < 30).length;
      setWarning({
        count: Math.max(detail.incomingCount, closeCount, 1),
        distance: nearestMissile.distanceToPlayer,
        sourceClass: nearestMissile.sourceClass,
      });
    };
    window.addEventListener(SKY_DANCER_MISSILE_EVENT, onMissiles);
    return () => {
      observer.disconnect();
      window.removeEventListener(SKY_DANCER_MISSILE_EVENT, onMissiles);
    };
  }, []);

  if (!warning) return null;
  const urgent = warning.distance < 12;
  const roleColor = missileSourceColor(warning.sourceClass);
  const warningColor = urgent ? "#ff8b82" : roleColor;
  const warningBackground = urgent ? "rgba(80,8,12,.62)" : "rgba(18,30,39,.58)";
  const warningLabel = missileSourceCue(warning.sourceClass);
  return (
    <div
      aria-label="Missile warning"
      data-source-class={warning.sourceClass}
      aria-live="assertive"
      style={{
        position: "fixed",
        top: "11%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        pointerEvents: "none",
        padding: "5px 11px",
        border: `1px solid ${warningColor}`,
        borderRadius: 6,
        background: warningBackground,
        color: warningColor,
        font: "800 clamp(11px, 1.8vw, 16px)/1 system-ui, sans-serif",
        letterSpacing: ".12em",
        textShadow: "0 1px 8px rgba(0,0,0,.8)",
        boxShadow: urgent ? "0 0 18px rgba(255,72,60,.28)" : "0 0 14px rgba(255,190,70,.18)",
      }}
    >
      {warningLabel} · {warning.count} INBOUND · {Math.max(1, Math.round(warning.distance))}m
    </div>
  );
}

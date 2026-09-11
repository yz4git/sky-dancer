import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeHazardKind } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV404RivalOutcome } from "./SkyDancerArcadeV404RivalAce";
import type { SkyDancerArcadeV40RouteDoctrine } from "./SkyDancerArcadeV40WorldBreak";

export type SkyDancerArcadeV405RouteMemory = "SAFE" | "SCORE" | "DANGER" | "MIXED";
export type SkyDancerArcadeV405RivalMemory = "NOVA_BROKEN" | "NOVA_DEBT" | "CONTESTED";
export type SkyDancerArcadeV405FinalBossForm = "MIRROR_AEGIS" | "PRISM_CROWN" | "HELLSTAR" | "SEVEN_SKY";
export type SkyDancerArcadeV405ResolvedRivalOutcome = Exclude<SkyDancerArcadeV404RivalOutcome, "NONE">;

export interface SkyDancerArcadeV405FinalBossContract {
  routeMemory: SkyDancerArcadeV405RouteMemory;
  rivalMemory: SkyDancerArcadeV405RivalMemory;
  form: SkyDancerArcadeV405FinalBossForm;
  formLabel: string;
  accent: number;
  hpScale: number;
  cadenceScale: number;
  guidanceScale: number;
  projectileSpeedScale: number;
  spreadBonus: number;
  endingLine: string;
}

export interface SkyDancerArcadeV405FinalBossPhaseContract {
  label: string;
  hazard: SkyDancerArcadeHazardKind | null;
  hazardBursts: number;
  escortKind: SkyDancerArcadeEnemyKind | null;
  escortCount: number;
  cadenceScale: number;
  guidanceScale: number;
  projectileSpeedScale: number;
  spreadBonus: number;
}

const clampPhase = (phase: number) => Math.max(1, Math.min(3, Math.round(phase))) as 1 | 2 | 3;

export function skyDancerArcadeV405RouteMemory(
  history: readonly SkyDancerArcadeV40RouteDoctrine[],
): SkyDancerArcadeV405RouteMemory {
  const counts: Record<Exclude<SkyDancerArcadeV40RouteDoctrine, "LOCKED">, number> = {
    SAFE: 0,
    SCORE: 0,
    DANGER: 0,
  };
  for (const doctrine of history) {
    if (doctrine !== "LOCKED") counts[doctrine] += 1;
  }
  const max = Math.max(counts.SAFE, counts.SCORE, counts.DANGER);
  if (max <= 0) return "MIXED";
  const winners = (["SAFE", "SCORE", "DANGER"] as const).filter((doctrine) => counts[doctrine] === max);
  return winners.length === 1 ? winners[0] : "MIXED";
}

export function skyDancerArcadeV405RivalMemory(
  outcomes: readonly SkyDancerArcadeV405ResolvedRivalOutcome[],
): SkyDancerArcadeV405RivalMemory {
  const wins = outcomes.filter((outcome) => outcome === "BROKEN" || outcome === "OUTFLOWN").length;
  const escapes = outcomes.filter((outcome) => outcome === "ESCAPED").length;
  if (wins >= 3) return "NOVA_BROKEN";
  if (escapes >= 2) return "NOVA_DEBT";
  return "CONTESTED";
}

export function skyDancerArcadeV405FinalBossContract(
  routeHistory: readonly SkyDancerArcadeV40RouteDoctrine[],
  rivalOutcomes: readonly SkyDancerArcadeV405ResolvedRivalOutcome[],
): SkyDancerArcadeV405FinalBossContract {
  const routeMemory = skyDancerArcadeV405RouteMemory(routeHistory);
  const rivalMemory = skyDancerArcadeV405RivalMemory(rivalOutcomes);
  const route = routeMemory === "SAFE"
    ? { form: "MIRROR_AEGIS" as const, formLabel: "MIRROR AEGIS", accent: 0x6ff4ff, hp: 1.08, cadence: 1.02, guidance: 1.07, speed: .98, spread: 0 }
    : routeMemory === "SCORE"
      ? { form: "PRISM_CROWN" as const, formLabel: "PRISM CROWN", accent: 0xffd96a, hp: .98, cadence: .88, guidance: 1.04, speed: 1.08, spread: 1 }
      : routeMemory === "DANGER"
        ? { form: "HELLSTAR" as const, formLabel: "HELLSTAR", accent: 0xff476f, hp: 1.12, cadence: .80, guidance: 1.14, speed: 1.12, spread: 1 }
        : { form: "SEVEN_SKY" as const, formLabel: "SEVEN SKY", accent: 0xb993ff, hp: 1.04, cadence: .92, guidance: 1.06, speed: 1.04, spread: 0 };

  const rival = rivalMemory === "NOVA_BROKEN"
    ? { hp: .94, cadence: .97, guidance: .98, speed: .99, ending: "NOVA-7 ACKNOWLEDGES · SKY IS YOURS" }
    : rivalMemory === "NOVA_DEBT"
      ? { hp: 1.12, cadence: .90, guidance: 1.08, speed: 1.06, ending: "NOVA DEBT PAID · SIGNAL SILENCED" }
      : { hp: 1, cadence: 1, guidance: 1.02, speed: 1.02, ending: "SEVEN SKY RESOLVED · RIVALRY CLOSED" };

  return {
    routeMemory,
    rivalMemory,
    form: route.form,
    formLabel: route.formLabel,
    accent: route.accent,
    hpScale: route.hp * rival.hp,
    cadenceScale: route.cadence * rival.cadence,
    guidanceScale: route.guidance * rival.guidance,
    projectileSpeedScale: route.speed * rival.speed,
    spreadBonus: route.spread,
    endingLine: rival.ending,
  };
}

export function skyDancerArcadeV405FinalBossPhase(
  contract: SkyDancerArcadeV405FinalBossContract,
  phase: number,
): SkyDancerArcadeV405FinalBossPhaseContract {
  const p = clampPhase(phase);
  const route = contract.routeMemory;
  const labels: Record<SkyDancerArcadeV405RouteMemory, readonly [string, string, string]> = {
    SAFE: ["MIRROR AEGIS", "SAFE-LANE REFRACTION", "AEGIS COLLAPSE"],
    SCORE: ["PRISM CROWN", "SCORE DENIAL LATTICE", "CROWN OVERCLOCK"],
    DANGER: ["HELLSTAR ARMOR", "DANGER-LANE PUNISH", "HELLSTAR OVERDRIVE"],
    MIXED: ["SEVEN SKY ARMOR", "ROUTE ECHO ARRAY", "SPECTRUM OVERDRIVE"],
  };
  const routeHazard: Record<SkyDancerArcadeV405RouteMemory, SkyDancerArcadeHazardKind> = {
    SAFE: "arch",
    SCORE: "mine",
    DANGER: "lightning",
    MIXED: "debris",
  };
  const phaseEscalation = p === 1 ? 1 : p === 2 ? .96 : .90;
  const debt = contract.rivalMemory === "NOVA_DEBT";
  const contested = contract.rivalMemory === "CONTESTED";
  const escortKind: SkyDancerArcadeEnemyKind | null = p === 3
    ? debt ? "ace" : contested ? "interceptor" : null
    : null;
  const rivalSuffix = p === 3
    ? contract.rivalMemory === "NOVA_BROKEN"
      ? " · ACELESS SKY"
      : debt
        ? " · NOVA DEBT"
        : " · FINAL MEMORY"
    : "";

  return {
    label: `${labels[route][p - 1]}${rivalSuffix}`,
    hazard: p === 1 ? null : routeHazard[route],
    hazardBursts: p === 1 ? 0 : route === "DANGER" && p === 3 ? 2 : 1,
    escortKind,
    escortCount: escortKind ? 1 : 0,
    cadenceScale: contract.cadenceScale * phaseEscalation,
    guidanceScale: contract.guidanceScale * (p === 3 ? 1.05 : 1),
    projectileSpeedScale: contract.projectileSpeedScale * (p === 3 ? 1.04 : 1),
    spreadBonus: contract.spreadBonus + (route === "SCORE" && p === 3 ? 1 : 0),
  };
}

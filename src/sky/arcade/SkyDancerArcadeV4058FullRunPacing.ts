export type SkyDancerArcadeV4058RunPhase =
  | "ignition"
  | "build"
  | "first-peak"
  | "recovery"
  | "acceleration"
  | "redline"
  | "finale"
  | "practice";

export interface SkyDancerArcadeV4058SectionPacing {
  phase: SkyDancerArcadeV4058RunPhase;
  entrySeconds: number;
  firstWaveSeconds: number;
  firstHazardSeconds: number;
  waveCadenceScale: number;
  hazardCadenceScale: number;
  bossIngressScale: number;
}

export const SKY_DANCER_ARCADE_V4058_PRACTICE_PACING: SkyDancerArcadeV4058SectionPacing = {
  phase: "practice",
  entrySeconds: .82,
  firstWaveSeconds: 2.35,
  firstHazardSeconds: 4.1,
  waveCadenceScale: 1,
  hazardCadenceScale: 1,
  bossIngressScale: 1,
};

const RUN_PACING: readonly SkyDancerArcadeV4058SectionPacing[] = [
  { phase:"ignition",     entrySeconds:.95, firstWaveSeconds:2.70, firstHazardSeconds:4.60, waveCadenceScale:1.10, hazardCadenceScale:1.08, bossIngressScale:1.06 },
  { phase:"build",        entrySeconds:.80, firstWaveSeconds:2.25, firstHazardSeconds:4.00, waveCadenceScale:1.02, hazardCadenceScale:1.02, bossIngressScale:1.00 },
  { phase:"first-peak",   entrySeconds:.72, firstWaveSeconds:2.00, firstHazardSeconds:3.60, waveCadenceScale:.96, hazardCadenceScale:.96, bossIngressScale:1.00 },
  { phase:"recovery",     entrySeconds:.95, firstWaveSeconds:2.60, firstHazardSeconds:4.40, waveCadenceScale:1.08, hazardCadenceScale:1.10, bossIngressScale:1.04 },
  { phase:"acceleration", entrySeconds:.68, firstWaveSeconds:1.90, firstHazardSeconds:3.35, waveCadenceScale:.92, hazardCadenceScale:.94, bossIngressScale:.98 },
  { phase:"redline",      entrySeconds:.62, firstWaveSeconds:1.70, firstHazardSeconds:3.05, waveCadenceScale:.86, hazardCadenceScale:.90, bossIngressScale:.96 },
  { phase:"finale",       entrySeconds:.82, firstWaveSeconds:1.95, firstHazardSeconds:3.25, waveCadenceScale:.88, hazardCadenceScale:.92, bossIngressScale:1.18 },
] as const;

export function skyDancerArcadeV4058SectionPacing(
  stageNumber: number,
  arcadeRun: boolean,
): SkyDancerArcadeV4058SectionPacing {
  if (!arcadeRun) return SKY_DANCER_ARCADE_V4058_PRACTICE_PACING;
  const index = Math.max(0, Math.min(RUN_PACING.length - 1, Math.floor(stageNumber) - 1));
  return RUN_PACING[index];
}

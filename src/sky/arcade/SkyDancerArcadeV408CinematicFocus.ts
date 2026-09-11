import type { SkyDancerArcadeStatus } from "./SkyDancerArcadeRuntime";

export type SkyDancerArcadeV408SceneMode = "flight" | "signature" | "rival" | "boss" | "handoff" | "finale";

export interface SkyDancerArcadeV408FocusInput {
  status: SkyDancerArcadeStatus;
  stageProgress: number;
  worldBreakLive: boolean;
  rivalAceActive: boolean;
  bossActive: boolean;
  finalBossReactive: boolean;
}

export interface SkyDancerArcadeV408SceneFocus {
  mode: SkyDancerArcadeV408SceneMode;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  targetLookWeight: number;
  bloomBoost: number;
  bossBoost: number;
  transitionBoost: number;
  vignette: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const smoothstep = (a: number, b: number, value: number) => {
  if (a === b) return value >= b ? 1 : 0;
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const FLIGHT: SkyDancerArcadeV408SceneFocus = {
  mode: "flight",
  strength: 0,
  cameraPullback: 0,
  cameraFovKick: 0,
  targetLookWeight: 0,
  bloomBoost: 0,
  bossBoost: 0,
  transitionBoost: 0,
  vignette: 0,
};

/** V40.8 keeps the authored World Break contact readable without turning the whole section into a zoom effect. */
export function skyDancerArcadeV408SignatureEnvelope(stageProgress: number): number {
  const progress = clamp01(stageProgress);
  const entrance = smoothstep(.095, .17, progress);
  const exit = 1 - smoothstep(.405, .505, progress);
  return clamp01(Math.min(entrance, exit));
}

export function skyDancerArcadeV408SceneFocus(input: SkyDancerArcadeV408FocusInput): SkyDancerArcadeV408SceneFocus {
  if (input.status === "run-clear" || input.status === "practice-clear" || input.status === "game-over") {
    return {
      mode: "finale", strength: 1, cameraPullback: 1.55, cameraFovKick: -.9, targetLookWeight: .05,
      bloomBoost: .035, bossBoost: .04, transitionBoost: .16, vignette: .3,
    };
  }
  if (input.status === "stage-clear" || input.status === "continue") {
    return {
      mode: "handoff", strength: 1, cameraPullback: 1.05, cameraFovKick: -.55, targetLookWeight: 0,
      bloomBoost: .018, bossBoost: 0, transitionBoost: .1, vignette: .24,
    };
  }
  if (input.status !== "running") return FLIGHT;
  if (input.bossActive) {
    const finalScale = input.finalBossReactive ? 1.18 : 1;
    return {
      mode: "boss", strength: 1, cameraPullback: .72 * finalScale, cameraFovKick: 1.15 * finalScale,
      targetLookWeight: .22, bloomBoost: .035 * finalScale, bossBoost: .12 * finalScale,
      transitionBoost: .02, vignette: .18 * finalScale,
    };
  }
  if (input.rivalAceActive) {
    return {
      mode: "rival", strength: 1, cameraPullback: .54, cameraFovKick: .82, targetLookWeight: .32,
      bloomBoost: .028, bossBoost: .025, transitionBoost: .055, vignette: .14,
    };
  }
  const signature = input.worldBreakLive ? skyDancerArcadeV408SignatureEnvelope(input.stageProgress) : 0;
  if (signature > 0) {
    return {
      mode: "signature", strength: signature, cameraPullback: .3 * signature, cameraFovKick: .48 * signature,
      targetLookWeight: 0, bloomBoost: .012 * signature, bossBoost: 0,
      transitionBoost: .018 * signature, vignette: .07 * signature,
    };
  }
  return FLIGHT;
}

/** Presentation-only camera bias. Logical target coordinates stay untouched. */
export function skyDancerArcadeV408TargetLookBias(
  focus: SkyDancerArcadeV408SceneFocus,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const weight = focus.targetLookWeight * focus.strength;
  return {
    x: clamp(targetX * weight * 1.4, -1.05, 1.05),
    y: clamp(targetY * weight * 1.1, -.55, .55),
  };
}

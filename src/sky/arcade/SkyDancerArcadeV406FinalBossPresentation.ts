import type { SkyDancerArcadeV405FinalBossForm } from "./SkyDancerArcadeV405RouteReactiveFinalBoss";

export type SkyDancerArcadeV406FinalBossEvent = "arrival" | "phase" | "defeat";

export interface SkyDancerArcadeV406FinalBossCue {
  label: string;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  cameraRoll: number;
  lookLift: number;
  bloomBoost: number;
  exposureBoost: number;
  audioLowHz: number;
  audioHighHz: number;
}

export interface SkyDancerArcadeV406BossDrone {
  frequencyHz: number;
  gain: number;
}

export interface SkyDancerArcadeV406FormMotion {
  scale: number;
  spinZ: number;
  spinY: number;
  wobble: number;
}

interface Identity {
  label: string;
  low: number;
  high: number;
  drone: number;
  pullback: number;
  fov: number;
  roll: number;
  bloom: number;
  pulse: number;
  spin: number;
}

const IDENTITIES: Record<SkyDancerArcadeV405FinalBossForm, Identity> = {
  MIRROR_AEGIS: { label: "MIRROR AEGIS", low: 122, high: 488, drone: 61, pullback: 1.18, fov: 2.4, roll: -.022, bloom: .12, pulse: .026, spin: .055 },
  PRISM_CROWN: { label: "PRISM CROWN", low: 196, high: 784, drone: 98, pullback: 1.42, fov: 3.2, roll: .034, bloom: .16, pulse: .038, spin: .105 },
  HELLSTAR: { label: "HELLSTAR", low: 82, high: 328, drone: 41, pullback: .94, fov: 4.1, roll: -.052, bloom: .19, pulse: .052, spin: .15 },
  SEVEN_SKY: { label: "SEVEN SKY", low: 163, high: 652, drone: 81.5, pullback: 1.62, fov: 3.7, roll: .044, bloom: .18, pulse: .044, spin: .085 },
};

const phase = (value: number) => Math.max(1, Math.min(3, Math.round(value))) as 1 | 2 | 3;

export function skyDancerArcadeV406FinalBossCue(
  form: SkyDancerArcadeV405FinalBossForm | null | undefined,
  bossPhase: number,
  event: SkyDancerArcadeV406FinalBossEvent,
): SkyDancerArcadeV406FinalBossCue | null {
  if (!form) return null;
  const identity = IDENTITIES[form];
  const p = phase(bossPhase);
  const eventScale = event === "arrival" ? 1 : event === "phase" ? 1.08 + (p - 1) * .1 : 1.42;
  const durationSeconds = event === "arrival" ? 1.35 : event === "phase" ? 1.08 + p * .08 : 1.9;
  const phaseName = p === 1 ? "AWAKENING" : p === 2 ? "MEMORY SHIFT" : "FINAL OVERDRIVE";
  return {
    label: event === "arrival" ? `${identity.label} · DESCENT` : event === "defeat" ? `${identity.label} · SKY BREAK` : `${identity.label} · ${phaseName}`,
    durationSeconds,
    strength: eventScale,
    cameraPullback: identity.pullback * eventScale,
    cameraFovKick: identity.fov * eventScale,
    cameraShake: (event === "defeat" ? .54 : .2 + p * .055) * (form === "HELLSTAR" ? 1.14 : 1),
    cameraRoll: identity.roll * (event === "defeat" ? 1.4 : 1 + (p - 1) * .22),
    lookLift: (event === "defeat" ? .62 : .18 + p * .1) * (form === "SEVEN_SKY" ? 1.18 : 1),
    bloomBoost: identity.bloom * eventScale,
    exposureBoost: Math.min(.085, identity.bloom * .3 * eventScale),
    audioLowHz: identity.low * (event === "defeat" ? .75 : 1 + (p - 1) * .08),
    audioHighHz: identity.high * (event === "defeat" ? 1.25 : 1 + (p - 1) * .1),
  };
}

export function skyDancerArcadeV406BossDrone(
  form: SkyDancerArcadeV405FinalBossForm | null | undefined,
  bossPhase: number,
  active: boolean,
): SkyDancerArcadeV406BossDrone {
  if (!form || !active) return { frequencyHz: 54, gain: 0 };
  const identity = IDENTITIES[form];
  const p = phase(bossPhase);
  return {
    frequencyHz: identity.drone * (1 + (p - 1) * .125),
    gain: (.009 + p * .0035) * (form === "HELLSTAR" ? 1.14 : form === "SEVEN_SKY" ? 1.08 : 1),
  };
}

export function skyDancerArcadeV406FormMotion(
  form: SkyDancerArcadeV405FinalBossForm | null | undefined,
  bossPhase: number,
  timeSeconds: number,
): SkyDancerArcadeV406FormMotion {
  if (!form) return { scale: 1, spinZ: 0, spinY: 0, wobble: 0 };
  const identity = IDENTITIES[form];
  const p = phase(bossPhase);
  const tempo = form === "HELLSTAR" ? 5.4 : form === "PRISM_CROWN" ? 3.8 : form === "SEVEN_SKY" ? 3.15 : 2.45;
  const pulse = Math.sin(timeSeconds * tempo + p * .7) * identity.pulse * (1 + (p - 1) * .24);
  const wobble = Math.sin(timeSeconds * (tempo * .62) + p) * identity.roll * .75;
  return {
    scale: 1 + pulse,
    spinZ: identity.spin * (1 + (p - 1) * .34),
    spinY: identity.spin * .28 * (form === "MIRROR_AEGIS" ? -1 : 1),
    wobble,
  };
}

export function skyDancerArcadeV406FormLabel(form: SkyDancerArcadeV405FinalBossForm | null | undefined): string {
  return form ? IDENTITIES[form].label : "PRISM SOVEREIGN";
}

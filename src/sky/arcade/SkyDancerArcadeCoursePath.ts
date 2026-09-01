import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

export interface SkyDancerArcadeCoursePose {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  bank: number;
}

interface CourseProfile {
  turns: number;
  lateral: number;
  vertical: number;
  phase: number;
}

const TAU = Math.PI * 2;
const COURSE_PROFILES: Record<SkyDancerArcadeStageDefinition["biome"], CourseProfile> = {
  city: { turns: 1.62, lateral: 1.18, vertical: 4.8, phase: 0.15 },
  canyon: { turns: 2.15, lateral: 1.16, vertical: 6.8, phase: 0.72 },
  cloud: { turns: 1.62, lateral: 0.92, vertical: 8.6, phase: 1.18 },
  storm: { turns: 2.42, lateral: 1.12, vertical: 9.4, phase: 1.91 },
  desert: { turns: 1.28, lateral: 0.9, vertical: 5.0, phase: 2.46 },
  ice: { turns: 2.72, lateral: 1.14, vertical: 14.2, phase: 2.98 },
  ruins: { turns: 2.08, lateral: 1.02, vertical: 11.2, phase: 3.57 },
  night: { turns: 2.86, lateral: 1.18, vertical: 7.8, phase: 4.13 },
  volcano: { turns: 2.24, lateral: 1.08, vertical: 12.8, phase: 4.71 },
  orbit: { turns: 1.76, lateral: 0.92, vertical: 15.8, phase: 5.22 },
  citadel: { turns: 2.48, lateral: 1.1, vertical: 9.8, phase: 5.81 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function smoothStep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function routeShift(progress: number, center: number, width: number): number {
  return smoothStep(center - width, center + width, progress);
}

/**
 * V10.2: authored lane transfers create real S-turns instead of one broad sinusoid.
 * They return to the baseline before the boss arena so the climax remains readable.
 */
function dynamicCourseDrama(stage: SkyDancerArcadeStageDefinition, progress: number): { x: number; y: number } {
  const u = clamp(progress, 0, 1);
  const direction = stage.order % 2 === 0 ? -1 : 1;
  const lateral = 13.5 + stage.curveStrength * 24 + Math.min(6.5, stage.act * .9);
  const vertical = 6 + stage.curveStrength * 10 + stage.turbulence * 8;
  const first = routeShift(u, .102, .03);
  const second = routeShift(u, .225, .034);
  const third = routeShift(u, .355, .032);
  const fourth = routeShift(u, .495, .036);
  const x = direction * lateral * (first - 2 * second + 2 * third - fourth);
  const dive = routeShift(u, .145, .034);
  const recover = routeShift(u, .275, .038);
  const climb = routeShift(u, .405, .034);
  const settle = routeShift(u, .525, .035);
  const y = vertical * (-dive + 1.72 * recover - 1.32 * climb + .6 * settle);
  return { x, y };
}

function visibleRangeCourseRhythm(stage: SkyDancerArcadeStageDefinition, distance: number): { x: number; y: number } {
  const wavelength = 520 + (stage.order % 3) * 45;
  const phase = stage.order * .83 + stage.act * .11;
  const t = distance / wavelength * TAU;
  const lateral = 4.8 + stage.curveStrength * 5.5 + stage.turbulence * 4;
  const vertical = 6 + stage.curveStrength * 5 + stage.turbulence * 5;
  const x = lateral * (Math.sin(t + phase) - Math.sin(phase))
    + lateral * .3 * (Math.sin(t * 1.7 + phase * .6 + 1.1) - Math.sin(phase * .6 + 1.1));
  const rawY = vertical * (Math.sin(t * .83 + phase - .4) - Math.sin(phase - .4))
    + vertical * .38 * (Math.sin(t * 1.67 + phase * .5 + .6) - Math.sin(phase * .5 + .6));
  // Orbital Ascent already owns a strong +66m corkscrew climb; keep its local bob without cancelling that trend.
  const y = rawY * (stage.biome === "orbit" ? .16 : 1);
  return { x, y };
}

function courseCenter(stage: SkyDancerArcadeStageDefinition, distance: number): { x: number; y: number } {
  const profile = COURSE_PROFILES[stage.biome];
  const stageLength = Math.max(1, stage.durationSeconds * stage.courseSpeed);
  const u = distance / stageLength;
  const phase = profile.phase + stage.order * 0.17;
  const lateralAmplitude = (18 + stage.curveStrength * 40) * profile.lateral;

  const p1 = phase + u * TAU * profile.turns;
  const p2 = phase * 0.61 + 1.17 + u * TAU * (profile.turns * 0.53 + 0.31);
  let x = lateralAmplitude * (
    (Math.sin(p1) - Math.sin(phase)) * 0.72
    + (Math.sin(p2) - Math.sin(phase * 0.61 + 1.17)) * 0.28
  );

  const v1 = phase * 0.43 - 0.8 + u * TAU * (profile.turns * 0.58 + 0.21);
  const v2 = phase * 0.77 + 0.35 + u * TAU * (profile.turns * 0.29 + 0.17);
  let y = profile.vertical * (
    (Math.sin(v1) - Math.sin(phase * 0.43 - 0.8)) * 0.72
    + (Math.sin(v2) - Math.sin(phase * 0.77 + 0.35)) * 0.28
  );

  const authoredU = clamp(u, 0, 1);
  const drama = dynamicCourseDrama(stage, authoredU);
  x += drama.x;
  y += drama.y;
  const visibleRhythm = visibleRangeCourseRhythm(stage, distance);
  x += visibleRhythm.x;
  y += visibleRhythm.y;
  if (stage.biome === "cloud") y += Math.sin(authoredU * Math.PI) * 4.2;
  if (stage.biome === "ruins") y += Math.sin(authoredU * Math.PI * 2) * 3.2;
  if (stage.biome === "citadel") y += Math.sin(authoredU * Math.PI) * 5.2;

  // V8.2 route personalities: branch choices should change how the phone moves, not only the palette.
  if (stage.biome === "cloud") {
    // Broad, graceful cresting arcs above the cloud sea.
    x += (Math.sin(u * TAU * 1.18 + 0.46) - Math.sin(0.46)) * 15;
    y += Math.sin(authoredU * Math.PI) * 17;
    y += (Math.sin(u * TAU * 1.55 - 0.25) - Math.sin(-0.25)) * 6;
  }
  if (stage.biome === "storm") {
    // Thunderhead dodge: nervous lateral reversals and sharp altitude changes.
    x += (Math.sin(u * TAU * 3.05 + 0.62) - Math.sin(0.62)) * 11.5;
    x += Math.sin(u * TAU * 6.1) * 3.2;
    y += (Math.sin(u * TAU * 2.65 - 0.55) - Math.sin(-0.55)) * 9.5;
  }
  if (stage.biome === "desert") {
    // Fortress breach run: long alternating wall approaches with a low, readable flight deck.
    x += (Math.sin(u * TAU * 1.86 + 0.1) - Math.sin(0.1)) * 21;
    x += Math.sin(u * TAU * 3.72 + 1.05) * 4.2;
    y -= Math.sin(authoredU * Math.PI) * 4.8;
  }
  if (stage.biome === "ruins") {
    // Floating labyrinth: weave between islands while climbing and dropping through broken levels.
    x += (Math.sin(u * TAU * 1.5 + 0.75) - Math.sin(0.75)) * 24;
    x += Math.sin(u * TAU * 4.7 - 0.2) * 5.2;
    y += (Math.sin(u * TAU * 1.72 - 0.7) - Math.sin(-0.7)) * 18;
  }
  if (stage.biome === "night") {
    // Neon pursuit: low-altitude, high-frequency metropolitan chicanes.
    x += (Math.sin(u * TAU * 4.5 + 0.28) - Math.sin(0.28)) * 20;
    x += Math.sin(u * TAU * 6.36) * 4;
    y -= Math.sin(authoredU * Math.PI) * 3.6;
  }
  if (stage.biome === "citadel") {
    // Finale approach: a tightening prism serpent that climbs into the titan arena.
    const finalRadius = 16 * (1 - authoredU * .48);
    x += (Math.sin(u * TAU * 2.75 + 0.9) - Math.sin(0.9)) * finalRadius;
    y += authoredU * 18;
    y += (Math.sin(u * TAU * 1.65 - 0.4) - Math.sin(-0.4)) * 5.5;
  }

  // V7 stage signatures: the course shape itself is now part of each biome's identity.
  if (stage.biome === "canyon") {
    // Fast knife-edge switchbacks with a low valley floor: frequent lateral reversals, restrained vertical motion.
    x += (Math.sin(u * TAU * 2.65 + 0.18) - Math.sin(0.18)) * 14;
    x += Math.sin(u * TAU * 5.3) * 3.2;
    y -= Math.sin(authoredU * Math.PI) * 7.2;
    y += (Math.sin(u * TAU * 2.1 - 0.35) - Math.sin(-0.35)) * 2.8;
  }
  if (stage.biome === "ice") {
    // Crystal-tunnel slalom: tightly alternating horizontal gates plus pronounced ceiling/floor waves.
    x += (Math.sin(u * TAU * 3.4 + 1.1) - Math.sin(1.1)) * 11;
    x += (Math.sin(u * TAU * 6.8 + 0.2) - Math.sin(0.2)) * 2.8;
    y += (Math.sin(u * TAU * 2.35 - 0.4) - Math.sin(-0.4)) * 13.5;
    y += (Math.sin(u * TAU * 4.7 + 0.8) - Math.sin(0.8)) * 5.0;
  }
  if (stage.biome === "volcano") {
    // Crater spiral: wide orbital sweeps dive toward the magma core, then pull back to the rim before the boss.
    x += (Math.sin(u * TAU * 1.45 + 2.1) - Math.sin(2.1)) * 22;
    x += (Math.sin(u * TAU * 3.2 + 0.35) - Math.sin(0.35)) * 8;
    y -= Math.sin(authoredU * Math.PI) * 22;
    y += (Math.sin(u * TAU * 1.45 + 0.6) - Math.sin(0.6)) * 4.6;
    y += authoredU * 20;
  }
  if (stage.biome === "orbit") {
    // V7.1 rising corkscrew: more local rotation keeps the spiral visible even with a forward-looking chase camera.
    const spiralRadius = 12 + authoredU * 18;
    x += (Math.sin(u * TAU * 3.05 + 0.3) - Math.sin(0.3)) * spiralRadius;
    y += u * 66;
    y += (Math.sin(u * TAU * 3.05 - 0.5) - Math.sin(-0.5)) * 4.8;
  }

  return { x, y };
}

function limitsFor(stage: SkyDancerArcadeStageDefinition) {
  switch (stage.biome) {
    case "canyon": return { yaw: 0.58, pitch: 0.31, bank: 1.7 };
    case "ice": return { yaw: 0.54, pitch: 0.4, bank: 1.6 };
    case "volcano": return { yaw: 0.56, pitch: 0.36, bank: 1.66 };
    case "orbit": return { yaw: 0.5, pitch: 0.42, bank: 1.54 };
    case "night": return { yaw: 0.57, pitch: 0.3, bank: 1.68 };
    case "storm": return { yaw: 0.55, pitch: 0.34, bank: 1.64 };
    default: return { yaw: 0.46, pitch: 0.28, bank: 1.56 };
  }
}

export function arcadeCoursePose(stage: SkyDancerArcadeStageDefinition, distance: number): SkyDancerArcadeCoursePose {
  const center = courseCenter(stage, distance);
  const sample = 6;
  const before = courseCenter(stage, distance - sample);
  const after = courseCenter(stage, distance + sample);
  const dx = (after.x - before.x) / (sample * 2);
  const dy = (after.y - before.y) / (sample * 2);
  const limits = limitsFor(stage);
  const yaw = clamp(Math.atan(dx), -limits.yaw, limits.yaw);
  const pitch = clamp(Math.atan(dy), -limits.pitch, limits.pitch);
  return {
    x: center.x,
    y: center.y,
    yaw,
    pitch,
    bank: clamp(-yaw * limits.bank, -0.62, 0.62),
  };
}

/** Visual pose of a point `depth` metres ahead, relative to the player's current course centre. */
export function arcadeCourseRelativePose(
  stage: SkyDancerArcadeStageDefinition,
  distance: number,
  depth: number,
): SkyDancerArcadeCoursePose {
  const here = arcadeCoursePose(stage, distance);
  const there = arcadeCoursePose(stage, distance + depth);
  return {
    x: there.x - here.x,
    y: there.y - here.y,
    yaw: there.yaw - here.yaw,
    pitch: there.pitch - here.pitch,
    bank: there.bank - here.bank,
  };
}


export interface SkyDancerArcadeVisualCoursePose extends SkyDancerArcadeCoursePose {
  z: number;
}

/**
 * V10.4: one visual course frame for scenery and combat presentation.
 * The older relative pose subtracts course centres but leaves that delta in world axes.
 * When the current tangent turns, rotating each child while leaving its centre in world axes
 * makes neighbouring layers appear to slide independently.  This helper rotates the complete
 * relative position into the player's current yaw/pitch frame before any renderer uses it.
 */
export function arcadeCourseRelativeVisualPose(
  stage: SkyDancerArcadeStageDefinition,
  distance: number,
  depth: number,
): SkyDancerArcadeVisualCoursePose {
  const here = arcadeCoursePose(stage, distance);
  const there = arcadeCoursePose(stage, distance + depth);
  const dx = there.x - here.x;
  const dy = there.y - here.y;
  const dz = -depth;

  // Heading is measured against forward -Z, so +here.yaw aligns the current tangent to -Z.
  const cy = Math.cos(here.yaw), sy = Math.sin(here.yaw);
  const x1 = dx * cy + dz * sy;
  const z1 = -dx * sy + dz * cy;

  // Remove the current climb/dive as one frame as well.  Bank is a visual roll, not path position.
  const cp = Math.cos(here.pitch), sp = Math.sin(here.pitch);
  const y1 = dy * cp + z1 * sp;
  const z2 = -dy * sp + z1 * cp;

  return {
    x: x1,
    y: y1,
    z: z2,
    yaw: there.yaw - here.yaw,
    pitch: there.pitch - here.pitch,
    bank: there.bank - here.bank,
  };
}

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
  city: { turns: 1.35, lateral: 1.0, vertical: 4.2, phase: 0.15 },
  canyon: { turns: 2.15, lateral: 1.16, vertical: 6.8, phase: 0.72 },
  cloud: { turns: 1.62, lateral: 0.92, vertical: 8.6, phase: 1.18 },
  storm: { turns: 2.42, lateral: 1.12, vertical: 9.4, phase: 1.91 },
  desert: { turns: 1.28, lateral: 0.9, vertical: 5.0, phase: 2.46 },
  ice: { turns: 2.72, lateral: 1.14, vertical: 10.6, phase: 2.98 },
  ruins: { turns: 2.08, lateral: 1.02, vertical: 11.2, phase: 3.57 },
  night: { turns: 2.86, lateral: 1.18, vertical: 7.8, phase: 4.13 },
  volcano: { turns: 2.24, lateral: 1.08, vertical: 12.8, phase: 4.71 },
  orbit: { turns: 1.76, lateral: 0.92, vertical: 15.8, phase: 5.22 },
  citadel: { turns: 2.48, lateral: 1.1, vertical: 9.8, phase: 5.81 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function courseCenter(stage: SkyDancerArcadeStageDefinition, distance: number): { x: number; y: number } {
  const profile = COURSE_PROFILES[stage.biome];
  const stageLength = Math.max(1, stage.durationSeconds * stage.courseSpeed);
  const u = distance / stageLength;
  const phase = profile.phase + stage.order * 0.17;
  const lateralAmplitude = (18 + stage.curveStrength * 40) * profile.lateral;

  const p1 = phase + u * TAU * profile.turns;
  const p2 = phase * 0.61 + 1.17 + u * TAU * (profile.turns * 0.53 + 0.31);
  const x = lateralAmplitude * (
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
  if (stage.biome === "cloud") y += Math.sin(authoredU * Math.PI) * 4.2;
  if (stage.biome === "canyon") y -= Math.sin(authoredU * Math.PI) * 3.8;
  if (stage.biome === "ruins") y += Math.sin(authoredU * Math.PI * 2) * 3.2;
  if (stage.biome === "volcano") y -= Math.sin(authoredU * Math.PI) * 8.5;
  if (stage.biome === "orbit") y += u * 24;
  if (stage.biome === "citadel") y += Math.sin(authoredU * Math.PI) * 5.2;

  return { x, y };
}

export function arcadeCoursePose(stage: SkyDancerArcadeStageDefinition, distance: number): SkyDancerArcadeCoursePose {
  const center = courseCenter(stage, distance);
  const sample = 6;
  const before = courseCenter(stage, distance - sample);
  const after = courseCenter(stage, distance + sample);
  const dx = (after.x - before.x) / (sample * 2);
  const dy = (after.y - before.y) / (sample * 2);
  const yaw = clamp(Math.atan(dx), -0.34, 0.34);
  const pitch = clamp(Math.atan(dy), -0.19, 0.19);
  return {
    x: center.x,
    y: center.y,
    yaw,
    pitch,
    bank: clamp(-yaw * 1.28, -0.38, 0.38),
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

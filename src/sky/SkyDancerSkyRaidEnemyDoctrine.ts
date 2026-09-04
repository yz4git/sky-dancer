import type { CartEnemyState } from "../cart/CartCombat";
import {
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidEnemySpawnPriority,
  type SkyDancerSkyRaidEnemyClass,
  type SkyDancerSkyRaidEnemyDoctrine,
} from "./SkyDancerSkyRaidRules";

let activeElapsedSeconds: number | null = null;

export function setSkyDancerSkyRaidEnemyDoctrineElapsed(elapsedSeconds: number | null): void {
  activeElapsedSeconds = elapsedSeconds === null ? null : Math.max(0, elapsedSeconds);
}

export function skyDancerSkyRaidEnemyClassFor(enemy: CartEnemyState): SkyDancerSkyRaidEnemyClass {
  if (enemy.kind === "heavy" || enemy.archetype === "tank") return "heavy";
  if (enemy.archetype === "striker") return "striker";
  if (enemy.archetype === "orbiter") return "orbiter";
  if (enemy.archetype === "drifter") return "drifter";
  if (enemy.archetype === "bomber") return "bomber";
  return "standard";
}

export function getSkyDancerSkyRaidEnemyDoctrine(
  enemy: CartEnemyState,
): SkyDancerSkyRaidEnemyDoctrine | null {
  if (activeElapsedSeconds === null || enemy.kind === "boss") return null;
  return skyDancerSkyRaidEnemyDoctrine(skyDancerSkyRaidActFor(activeElapsedSeconds).id);
}

export function skyDancerSkyRaidSpawnPreference(
  enemy: CartEnemyState,
  elapsedSeconds: number,
  spawnSerial: number,
): number {
  if (enemy.kind === "boss") return -999;
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  return skyDancerSkyRaidEnemySpawnPriority(act.id, skyDancerSkyRaidEnemyClassFor(enemy), spawnSerial);
}

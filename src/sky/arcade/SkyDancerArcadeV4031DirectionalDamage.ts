import * as THREE from "three";
import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";
import { applySkyDancerArcadeV4032LocalizedReaction } from "./SkyDancerArcadeV4032LocalizedReaction";

export type SkyDancerArcadeV4031DamageZone = "left-wing" | "right-wing" | "fuselage" | "tail";

export interface SkyDancerArcadeV4031ImpactSignal {
  serial?: number;
  enemyId: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  x?: number;
  y?: number;
  boss: boolean;
  missile?: boolean;
  destroyed: boolean;
}

export interface SkyDancerArcadeV4031DirectionalState {
  latestZone: SkyDancerArcadeV4031DamageZone;
  zones: readonly SkyDancerArcadeV4031DamageZone[];
  hitCount: number;
}

interface RegistryEntry {
  latestZone: SkyDancerArcadeV4031DamageZone;
  zones: SkyDancerArcadeV4031DamageZone[];
  hitCount: number;
}

const registry = new Map<number, RegistryEntry>();
const seenImpactSerials = new Set<number>();
let registryStageSerial = -1;
let fallbackSerial = 1_000_000;

const heavyKinds = new Set<SkyDancerArcadeEnemyKind>(["bomber", "missile-boat", "gunship"]);
const agileKinds = new Set<SkyDancerArcadeEnemyKind>(["ace", "striker", "raider"]);

/**
 * V40.31 converts the real player-to-target attack line into a render-only damage location.
 * Arcade hitboxes stay center-based; this function never changes collision or damage authority.
 */
export function skyDancerArcadeV4031ResolveDamageZone(input: {
  impactX: number;
  impactY: number;
  playerX: number;
  playerY: number;
  missile: boolean;
  serial: number;
}): SkyDancerArcadeV4031DamageZone {
  const fromPlayerX = input.playerX - input.impactX;
  const fromPlayerY = input.playerY - input.impactY;
  const lateral = Math.abs(fromPlayerX);
  const vertical = Math.abs(fromPlayerY);

  // Strong side approach reads as the near wing. This gives left/right attacks persistent visual consequence.
  if (lateral > .5 + vertical * .32) return fromPlayerX < 0 ? "left-wing" : "right-wing";
  // A materially different altitude line lands on the upper/lower fuselage rather than pretending it was a wing hit.
  if (vertical > .42) return "fuselage";
  // Centered missiles and straight pursuit fire arrive from the rear quarter and therefore favor engine/tail damage.
  if (input.missile || (lateral < .24 && vertical < .22)) return "tail";
  // Small diagonal gun corrections alternate between body and the nearer wing to avoid a fake fixed decal.
  if (input.serial % 3 === 0) return "fuselage";
  return fromPlayerX < 0 ? "left-wing" : "right-wing";
}

export function syncSkyDancerArcadeV4031DirectionalDamage(
  impacts: readonly SkyDancerArcadeV4031ImpactSignal[],
  stageSerial: number,
  playerX: number,
  playerY: number,
): void {
  if (stageSerial !== registryStageSerial) {
    registry.clear();
    seenImpactSerials.clear();
    registryStageSerial = stageSerial;
  }

  for (const impact of impacts) {
    if (impact.boss || impact.kind === "boss") continue;
    const serial = impact.serial ?? fallbackSerial++;
    if (seenImpactSerials.has(serial)) continue;
    seenImpactSerials.add(serial);
    // The production snapshot always supplies impact x/y. Defaults keep older presentation-only test callers compatible.
    const zone = skyDancerArcadeV4031ResolveDamageZone({
      impactX: impact.x ?? playerX,
      impactY: impact.y ?? playerY,
      playerX,
      playerY,
      missile: Boolean(impact.missile),
      serial,
    });
    const previous = registry.get(impact.enemyId);
    const zones = previous ? [...previous.zones, zone].slice(-3) : [zone];
    registry.set(impact.enemyId, {
      latestZone: zone,
      zones,
      hitCount: (previous?.hitCount ?? 0) + 1,
    });
  }
}

export function skyDancerArcadeV4031DirectionalForEnemy(enemyId: number): SkyDancerArcadeV4031DirectionalState {
  const entry = registry.get(enemyId);
  return entry
    ? { latestZone: entry.latestZone, zones: [...entry.zones], hitCount: entry.hitCount }
    : { latestZone: "fuselage", zones: [], hitCount: 0 };
}

export function resetSkyDancerArcadeV4031DirectionalDamage(): void {
  registry.clear();
  seenImpactSerials.clear();
  registryStageSerial = -1;
  fallbackSerial = 1_000_000;
}

function zoneAnchor(zone: SkyDancerArcadeV4031DamageZone, bulk: number): THREE.Vector3 {
  if (zone === "left-wing") return new THREE.Vector3(-.54 * bulk, .035, .16);
  if (zone === "right-wing") return new THREE.Vector3(.54 * bulk, .035, .16);
  if (zone === "tail") return new THREE.Vector3(0, .015, .48);
  return new THREE.Vector3(0, .13, .12);
}

function resolvedZone(zones: readonly SkyDancerArcadeV4031DamageZone[], index: number, fallback: SkyDancerArcadeV4031DamageZone): SkyDancerArcadeV4031DamageZone {
  if (zones.length === 0) return fallback;
  return zones[Math.min(index, zones.length - 1)] ?? fallback;
}

/** Moves the existing V40.30 marks; it creates no gameplay object, light, hitbox, or extra damage event. */
export function applySkyDancerArcadeV4031DirectionalDamage(
  rig: THREE.Group,
  enemyId: number,
  kind: SkyDancerArcadeEnemyKind,
): void {
  const state = skyDancerArcadeV4031DirectionalForEnemy(enemyId);
  const bulk = heavyKinds.has(kind) ? 1.24 : agileKinds.has(kind) ? .92 : 1;
  const scars = rig.getObjectsByProperty("name", "arcade-v4030-damage-scar");
  const breaches = rig.getObjectsByProperty("name", "arcade-v4030-damage-breach");
  const latestAnchor = zoneAnchor(state.latestZone, bulk);

  for (let index = 0; index < scars.length; index += 1) {
    const scar = scars[index];
    const zone = resolvedZone(state.zones, index, state.latestZone);
    const anchor = zoneAnchor(zone, bulk);
    const side = zone === "left-wing" ? -1 : zone === "right-wing" ? 1 : (enemyId + index) % 2 === 0 ? 1 : -1;
    scar.position.set(
      anchor.x + side * (.035 + index * .018),
      anchor.y + (index - 1) * .055,
      anchor.z + index * .055,
    );
    scar.rotation.set(.12 * side, .08 * side, .28 * side + index * .16);
    scar.userData.arcadeV4031DamageZone = zone;
    scar.userData.arcadeV4031PresentationOnly = true;
  }

  for (let index = 0; index < breaches.length; index += 1) {
    const breach = breaches[index];
    const zone = resolvedZone(state.zones, index, state.latestZone);
    const anchor = zoneAnchor(zone, bulk);
    const side = zone === "left-wing" ? -1 : zone === "right-wing" ? 1 : (enemyId + index + 1) % 2 === 0 ? 1 : -1;
    breach.position.set(
      anchor.x + side * (.025 + index * .014),
      anchor.y - index * .035,
      anchor.z + .035 + index * .05,
    );
    breach.userData.arcadeV4031DamageZone = zone;
    breach.userData.arcadeV4031PresentationOnly = true;
  }

  const sparks = rig.getObjectByName("arcade-v4030-damage-sparks");
  if (sparks) {
    sparks.position.copy(latestAnchor).add(new THREE.Vector3(0, .025, .08));
    sparks.userData.arcadeV4031DamageZone = state.latestZone;
    sparks.userData.arcadeV4031PresentationOnly = true;
  }

  rig.userData.arcadeV4031DirectionalDamage = true;
  rig.userData.arcadeV4031LatestZone = state.latestZone;
  rig.userData.arcadeV4031HitCount = state.hitCount;
  rig.userData.arcadeV4031GameplayUnchanged = true;
  rig.userData.arcadeV4031CollisionUnchanged = true;
  applySkyDancerArcadeV4032LocalizedReaction(rig, enemyId, kind, state);
}

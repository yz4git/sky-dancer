import * as THREE from "three";
import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV4032DamageZone = "left-wing" | "right-wing" | "fuselage" | "tail";

export interface SkyDancerArcadeV4032DirectionalState {
  latestZone: SkyDancerArcadeV4032DamageZone;
  zones: readonly SkyDancerArcadeV4032DamageZone[];
  hitCount: number;
}

export interface SkyDancerArcadeV4032ReactionProfile {
  intensity: number;
  wingZone: "left-wing" | "right-wing" | null;
  fragments: boolean;
  sparks: boolean;
  smoke: boolean;
}

const heavyKinds = new Set<SkyDancerArcadeEnemyKind>(["bomber", "missile-boat", "gunship"]);
const agileKinds = new Set<SkyDancerArcadeEnemyKind>(["ace", "striker", "raider"]);
const clamp01 = (value: number): number => THREE.MathUtils.clamp(value, 0, 1);

export function skyDancerArcadeV4032ReactionProfile(
  state: SkyDancerArcadeV4032DirectionalState,
  severity: number,
): SkyDancerArcadeV4032ReactionProfile {
  const recent = state.zones.length > 0 ? state.zones : [state.latestZone];
  let wingZone: "left-wing" | "right-wing" | null = null;
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const zone = recent[index];
    if (zone === "left-wing" || zone === "right-wing") {
      wingZone = zone;
      break;
    }
  }
  const normalizedSeverity = clamp01(severity);
  const intensity = clamp01((normalizedSeverity - .3) / .7);
  return {
    intensity,
    wingZone,
    fragments: wingZone !== null && normalizedSeverity >= .4,
    sparks: recent.includes("fuselage") && normalizedSeverity >= .36,
    smoke: recent.includes("tail") && normalizedSeverity >= .48,
  };
}

function zoneAnchor(zone: SkyDancerArcadeV4032DamageZone, bulk: number): THREE.Vector3 {
  if (zone === "left-wing") return new THREE.Vector3(-.56 * bulk, .04, .17);
  if (zone === "right-wing") return new THREE.Vector3(.56 * bulk, .04, .17);
  if (zone === "tail") return new THREE.Vector3(0, .02, .52);
  return new THREE.Vector3(0, .14, .13);
}

function createWingFragments(): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.02, .01, 0), new THREE.Vector3(-.14, .06, .14),
    new THREE.Vector3(.03, .025, .02), new THREE.Vector3(.14, -.035, .18),
    new THREE.Vector3(-.01, -.025, .04), new THREE.Vector3(-.08, -.12, .2),
    new THREE.Vector3(.015, .045, .01), new THREE.Vector3(.09, .13, .16),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: 0xc7b7a1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const fragments = new THREE.LineSegments(geometry, material);
  fragments.name = "arcade-v4032-wing-fragments";
  fragments.visible = false;
  fragments.renderOrder = 9;
  fragments.userData.arcadeV4032PresentationOnly = true;
  return fragments;
}

function createLocalSparks(): THREE.Points {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.04, .01, 0),
    new THREE.Vector3(.05, .035, .055),
    new THREE.Vector3(-.075, -.03, .09),
    new THREE.Vector3(.09, -.055, .13),
    new THREE.Vector3(-.11, .07, .16),
    new THREE.Vector3(.13, .02, .2),
    new THREE.Vector3(-.055, -.09, .23),
  ]);
  const material = new THREE.PointsMaterial({
    color: 0xffa04b,
    size: .065,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const sparks = new THREE.Points(geometry, material);
  sparks.name = "arcade-v4032-local-sparks";
  sparks.visible = false;
  sparks.renderOrder = 10;
  sparks.userData.arcadeV4032PresentationOnly = true;
  return sparks;
}

function createTailSmoke(): THREE.Points {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(.018, .018, .09),
    new THREE.Vector3(-.028, .035, .18),
    new THREE.Vector3(.04, .02, .28),
    new THREE.Vector3(-.035, .055, .38),
    new THREE.Vector3(.055, .04, .49),
    new THREE.Vector3(-.045, .075, .6),
  ]);
  const material = new THREE.PointsMaterial({
    color: 0x6f7479,
    size: .105,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const smoke = new THREE.Points(geometry, material);
  smoke.name = "arcade-v4032-tail-smoke";
  smoke.visible = false;
  smoke.renderOrder = 5;
  smoke.userData.arcadeV4032PresentationOnly = true;
  return smoke;
}

function ensureReactionRig(rig: THREE.Group): THREE.Group {
  const existing = rig.getObjectByName("arcade-v4032-local-reaction");
  if (existing instanceof THREE.Group) return existing;
  const reaction = new THREE.Group();
  reaction.name = "arcade-v4032-local-reaction";
  reaction.userData.arcadeV4032PresentationOnly = true;
  reaction.userData.arcadeV4032GameplayUnchanged = true;
  reaction.userData.arcadeV4032CollisionUnchanged = true;
  reaction.add(createWingFragments(), createLocalSparks(), createTailSmoke());
  rig.add(reaction);
  return reaction;
}

/**
 * V40.32 turns V40.31's recent local damage history into bounded pre-destruction reactions.
 * It only animates render objects already parented to the V40.30 presentation rig.
 */
export function applySkyDancerArcadeV4032LocalizedReaction(
  rig: THREE.Group,
  enemyId: number,
  kind: SkyDancerArcadeEnemyKind,
  state: SkyDancerArcadeV4032DirectionalState,
): void {
  const reaction = ensureReactionRig(rig);
  const rawSeverity = Number(rig.userData.arcadeV4030DamageBlend ?? 0);
  const severity = Number.isFinite(rawSeverity) ? clamp01(rawSeverity) : 0;
  const profile = skyDancerArcadeV4032ReactionProfile(state, severity);
  const bulk = heavyKinds.has(kind) ? 1.24 : agileKinds.has(kind) ? .92 : 1;
  const now = typeof performance === "undefined" ? 0 : performance.now() * .001;

  const fragments = reaction.getObjectByName("arcade-v4032-wing-fragments");
  if (fragments instanceof THREE.LineSegments && fragments.material instanceof THREE.LineBasicMaterial) {
    fragments.visible = profile.fragments;
    fragments.material.opacity = profile.fragments ? .24 + profile.intensity * .48 : 0;
    if (profile.wingZone) {
      const side = profile.wingZone === "left-wing" ? -1 : 1;
      fragments.position.copy(zoneAnchor(profile.wingZone, bulk)).add(new THREE.Vector3(side * .025, .02, .07));
      fragments.rotation.set(
        side * (.12 + Math.sin(now * 8 + enemyId) * .08),
        Math.sin(now * 6.3 + enemyId * .17) * .18,
        side * (.28 + Math.sin(now * 10.5 + enemyId * .31) * .16),
      );
      fragments.scale.setScalar(.78 + profile.intensity * .42);
    }
  }

  const sparks = reaction.getObjectByName("arcade-v4032-local-sparks");
  if (sparks instanceof THREE.Points && sparks.material instanceof THREE.PointsMaterial) {
    sparks.visible = profile.sparks;
    sparks.material.opacity = profile.sparks
      ? (.22 + profile.intensity * .5) * (.72 + Math.sin(now * 25 + enemyId * .43) * .28)
      : 0;
    sparks.position.copy(zoneAnchor("fuselage", bulk)).add(new THREE.Vector3(0, .025, .055));
    sparks.rotation.z = Math.sin(now * 9 + enemyId * .19) * .32;
    sparks.scale.setScalar(.82 + profile.intensity * .38);
  }

  const smoke = reaction.getObjectByName("arcade-v4032-tail-smoke");
  if (smoke instanceof THREE.Points && smoke.material instanceof THREE.PointsMaterial) {
    smoke.visible = profile.smoke;
    smoke.material.opacity = profile.smoke
      ? (.1 + profile.intensity * .24) * (.88 + Math.sin(now * 5.5 + enemyId * .13) * .12)
      : 0;
    smoke.position.copy(zoneAnchor("tail", bulk)).add(new THREE.Vector3(0, .015, .05));
    smoke.rotation.z = Math.sin(now * 2.7 + enemyId * .11) * .08;
    smoke.scale.set(1 + profile.intensity * .2, 1 + profile.intensity * .16, 1 + profile.intensity * .3);
  }

  reaction.userData.arcadeV4032LocalizedReaction = true;
  reaction.userData.arcadeV4032LatestZone = state.latestZone;
  reaction.userData.arcadeV4032Intensity = profile.intensity;
  reaction.userData.arcadeV4032WingFragments = profile.fragments;
  reaction.userData.arcadeV4032FuselageSparks = profile.sparks;
  reaction.userData.arcadeV4032TailSmoke = profile.smoke;
}

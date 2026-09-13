import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition, SkyDancerArcadeStageId } from "./SkyDancerArcadeData";

interface BossEdgeTuning {
  color: number;
  compactOpacity: number;
  desktopOpacity: number;
  scale: number;
}

export interface SkyDancerArcadeV4027BossEdgeProfile {
  color: number;
  opacity: number;
  scale: number;
}

const BOSS_EDGE_TUNING: Record<SkyDancerArcadeStageId, BossEdgeTuning> = {
  "dawn-city": { color: 0xffe6c2, compactOpacity: .075, desktopOpacity: .035, scale: 1.0105 },
  "red-canyon": { color: 0xdff8ff, compactOpacity: .09, desktopOpacity: .04, scale: 1.011 },
  "cloud-fleet": { color: 0xffe8f5, compactOpacity: .11, desktopOpacity: .05, scale: 1.012 },
  "storm-carrier": { color: 0xfff4c8, compactOpacity: .18, desktopOpacity: .08, scale: 1.016 },
  "desert-fortress": { color: 0xe9ffff, compactOpacity: .10, desktopOpacity: .045, scale: 1.0115 },
  "ice-cavern": { color: 0xffdce8, compactOpacity: .14, desktopOpacity: .06, scale: 1.013 },
  "floating-ruins": { color: 0xffedc6, compactOpacity: .12, desktopOpacity: .05, scale: 1.012 },
  "night-metro": { color: 0xffe6ad, compactOpacity: .15, desktopOpacity: .065, scale: 1.014 },
  "volcano-core": { color: 0xd5fbff, compactOpacity: .19, desktopOpacity: .085, scale: 1.017 },
  "orbital-ascent": { color: 0xffe7fb, compactOpacity: .10, desktopOpacity: .045, scale: 1.011 },
  "prism-citadel": { color: 0xecffd0, compactOpacity: .20, desktopOpacity: .09, scale: 1.018 },
};

/**
 * V40.27 is presentation-only. The body edge is deliberately much weaker than the V40.20 OPEN
 * weakpoint outline so the vulnerable core remains the strongest focal cue.
 */
export function skyDancerArcadeV4027BossEdgeProfile(
  stageId: SkyDancerArcadeStageId,
  compactLandscape: boolean,
): SkyDancerArcadeV4027BossEdgeProfile {
  const tuning = BOSS_EDGE_TUNING[stageId];
  return {
    color: tuning.color,
    opacity: compactLandscape ? tuning.compactOpacity : tuning.desktopOpacity,
    scale: tuning.scale,
  };
}

function isBossBodyMesh(object: THREE.Object3D): object is THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  if (!(object instanceof THREE.Mesh) || object.name !== "arcade-baked-airframe") return false;
  if (Array.isArray(object.material) || !(object.material instanceof THREE.MeshStandardMaterial)) return false;
  // Signal/cyan strips are intentionally excluded. Their emissive material already provides separation.
  return object.material.emissive.getHex() === 0x000000 || object.material.emissiveIntensity <= .3;
}

/**
 * Adds a bounded BackSide shell to the baked carrier body only. Weakpoints, engine trails and V40.5/V40.6
 * final-form decorations remain outside this layer. Geometry is shared rather than cloned to keep phone cost low.
 */
export function applySkyDancerArcadeV4027BossEdgeSeparation(
  group: THREE.Group,
  stage: SkyDancerArcadeStageDefinition,
): number {
  const bodyMeshes = group.getObjectsByProperty("name", "arcade-baked-airframe").filter(isBossBodyMesh);
  let shellCount = 0;

  for (const body of bodyMeshes) {
    const desktop = skyDancerArcadeV4027BossEdgeProfile(stage.id, false);
    const material = new THREE.MeshBasicMaterial({
      color: desktop.color,
      transparent: true,
      opacity: desktop.opacity,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      toneMapped: false,
    });
    const shell = new THREE.Mesh(body.geometry, material);
    shell.name = "arcade-v4027-boss-edge-shell";
    shell.scale.setScalar(desktop.scale);
    shell.frustumCulled = body.frustumCulled;
    shell.renderOrder = 4;
    shell.userData.arcadeV4027BossEdge = true;
    shell.userData.arcadeV4027PresentationOnly = true;
    shell.userData.arcadeV4027SharedGeometry = true;
    shell.onBeforeRender = (renderer) => {
      const compactLandscape = renderer.domElement.clientWidth > renderer.domElement.clientHeight
        && renderer.domElement.clientHeight <= 560;
      const profile = skyDancerArcadeV4027BossEdgeProfile(stage.id, compactLandscape);
      material.color.setHex(profile.color);
      material.opacity = profile.opacity;
      shell.scale.setScalar(profile.scale);
    };
    body.add(shell);
    shellCount += 1;
  }

  group.userData.arcadeV4027BossEdgeSeparation = shellCount > 0;
  group.userData.arcadeV4027BossEdgeShellCount = shellCount;
  group.userData.arcadeV4027LogicalCollisionUnchanged = true;
  group.userData.arcadeV4027GameplayUnchanged = true;
  return shellCount;
}

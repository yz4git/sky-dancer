import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

const CHUNK_VERTEX_OFFSETS: Partial<Record<SkyDancerArcadeStageDefinition["biome"], number>> = {
  canyon: 4.5,
  ice: 10.5,
  volcano: 10.5,
};

/**
 * V15 Visual Playcheck tuning.
 *
 * The 844×390 browser playcheck showed that baked canyon / ice / volcano decoration can
 * still project too far into the phone flight lane after a strong course yaw. Move only
 * authored side-decoration vertices away from the centre. Dynamic terrain, hazards and
 * collision geometry are untouched.
 */
export function skyDancerArcadeV15CorridorVertexX(
  stage: SkyDancerArcadeStageDefinition,
  x: number,
): number {
  const offset = CHUNK_VERTEX_OFFSETS[stage.biome] ?? 0;
  if (offset <= 0 || Math.abs(x) < 12) return x;
  return x + Math.sign(x) * offset;
}

export function skyDancerArcadeV15OrbitChunkVisible(index: number): boolean {
  return index % 2 === 0;
}

export function skyDancerArcadeV15OrbitCueVisible(index: number): boolean {
  return index % 2 === 0;
}

export function skyDancerArcadeV15IceFangX(x: number): number {
  if (Math.abs(x) < 1e-5) return x;
  return x + Math.sign(x) * 8.5;
}

function tuneBakedChunkGeometry(
  chunk: THREE.Object3D,
  stage: SkyDancerArcadeStageDefinition,
): void {
  const offset = CHUNK_VERTEX_OFFSETS[stage.biome] ?? 0;
  if (offset <= 0) return;
  const touched = new Set<string>();
  chunk.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    const geometry = object.geometry;
    if (touched.has(geometry.uuid)) return;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!position) return;
    for (let index = 0; index < position.count; index += 1) {
      position.setX(index, skyDancerArcadeV15CorridorVertexX(stage, position.getX(index)));
    }
    position.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    touched.add(geometry.uuid);
  });
  chunk.userData.arcadeV15PhoneCorridorTuned = true;
}

function tuneIceCues(scene: THREE.Scene): void {
  for (const fang of scene.getObjectsByProperty("name", "arcade-ice-pressure-fang")) {
    fang.position.x = skyDancerArcadeV15IceFangX(fang.position.x);
    fang.scale.setScalar(.74);
    fang.userData.arcadeV15IcePressureOutsideHeroLine = true;
  }
  for (const arch of scene.getObjectsByProperty("name", "arcade-ice-wave-arch")) {
    if (Math.abs(arch.position.x) > 1e-5) arch.position.x += Math.sign(arch.position.x) * 4.5;
    arch.scale.setScalar(.88);
    arch.userData.arcadeV15OpenIceRib = true;
  }
}

function tuneOrbitCues(scene: THREE.Scene): void {
  const cues = scene.getObjectsByProperty("name", "arcade-orbit-helix-cue");
  cues.forEach((cue, cueIndex) => {
    cue.visible = skyDancerArcadeV15OrbitCueVisible(cueIndex);
    cue.userData.arcadeV15OpenOrbitCue = true;
    if (!cue.visible) return;

    const torusMeshes: THREE.Mesh[] = [];
    cue.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry.type === "TorusGeometry") torusMeshes.push(object);
    });
    torusMeshes.forEach((arc, arcIndex) => {
      // One offset arc is enough to describe the corkscrew. The opposing arc was visually
      // reconnecting it into a full ring at phone scale.
      arc.visible = arcIndex === 0;
      if (!arc.visible) return;
      const side = cueIndex % 4 === 0 ? -1 : 1;
      arc.position.x += side * 8;
      arc.position.y += ((cueIndex % 3) - 1) * 3.5;
      arc.scale.setScalar(.88);
      arc.userData.arcadeV15OffsetHelixArc = true;
    });
  });
}

/** Apply presentation-only V15 edits after ReferenceWorld has authored the stage. */
export function applySkyDancerArcadeV15VisualTuning(
  scene: THREE.Scene,
  stage: SkyDancerArcadeStageDefinition,
): void {
  const environment = scene.getObjectByName("arcade-course-environment");
  if (!environment) return;

  const chunks = environment.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
  chunks.forEach((chunk, index) => {
    if (stage.biome === "orbit") {
      chunk.visible = skyDancerArcadeV15OrbitChunkVisible(index);
      chunk.userData.arcadeV15OpenOrbitChunk = true;
    } else {
      tuneBakedChunkGeometry(chunk, stage);
    }
  });

  if (stage.biome === "ice") tuneIceCues(scene);
  if (stage.biome === "orbit") tuneOrbitCues(scene);
}

import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

interface RockFinishProfile {
  outward: number;
  heightScale: number;
  roughness: number;
}

const PROFILE: Partial<Record<SkyDancerArcadeStageDefinition["biome"], RockFinishProfile>> = {
  canyon: { outward: 9, heightScale: .82, roughness: 1.15 },
  volcano: { outward: 11, heightScale: .86, roughness: 1.35 },
};

function finishLegacyMesh(mesh: THREE.Mesh, profile: RockFinishProfile, phase: number): boolean {
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position || position.itemSize !== 3) return false;

  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const x = position.getX(vertex);
    const y = position.getY(vertex);
    const z = position.getZ(vertex);
    if (Math.abs(x) < 18) continue;

    const side = Math.sign(x) || 1;
    const baseY = -25;
    const heightY = baseY + (y - baseY) * profile.heightScale;
    const ridge = (
      Math.sin(y * .31 + z * .17 + phase) * .72
      + Math.sin(z * .27 - y * .11 + phase * 1.7) * .38
    ) * profile.roughness;

    position.setXYZ(
      vertex,
      x + side * (profile.outward + ridge * .55),
      heightY + Math.sin(x * .08 + z * .09 + phase) * .34,
      z + ridge,
    );
  }

  position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
  mesh.userData.arcadeV4026NaturalRockFinish = true;
  mesh.userData.arcadeV4026PresentationOnly = true;
  return true;
}

function legacyBakedMeshes(chunk: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  for (const container of chunk.children) {
    // ReferenceWorld moves its unnamed static primitives into one unnamed structures group and
    // bakes that group's children. V16 hero setpieces are separately named direct-child groups,
    // so this is a stable ownership seam that cannot reach the authored hero rocks.
    if (!(container instanceof THREE.Group) || container.name !== "") continue;
    for (const object of container.children) {
      if (object instanceof THREE.Mesh && object.name === "arcade-baked-airframe") meshes.push(object);
    }
  }
  return meshes;
}

/**
 * V40.26 — Legacy Rock Finish.
 * Presentation-only cleanup for the original ReferenceWorld canyon/volcano static scenery.
 * Route geometry, hazards, collision/runtime state and V16 hero setpieces remain untouched.
 */
export function applySkyDancerArcadeV4026LegacyRockFinish(
  scene: THREE.Scene,
  stage: SkyDancerArcadeStageDefinition,
): void {
  const profile = PROFILE[stage.biome];
  if (!profile) return;
  const environment = scene.getObjectByName("arcade-course-environment");
  if (!environment) return;

  const chunks = environment.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
  chunks.forEach((chunk, chunkIndex) => {
    let finished = 0;
    for (const mesh of legacyBakedMeshes(chunk)) {
      if (finishLegacyMesh(mesh, profile, chunkIndex * .73 + stage.order * .41)) finished += 1;
    }
    chunk.userData.arcadeV4026LegacyRockFinish = finished > 0;
    chunk.userData.arcadeV4026FinishedMeshCount = finished;
    chunk.userData.arcadeV4026LogicalCollisionUnchanged = true;
  });
}

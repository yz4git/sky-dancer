import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";

interface GroundDensityRuntime {
  scene: THREE.Scene;
}

const WORLD_CHUNK = 210;
const GROUND_Y = -66.45;
const TILE_RADIUS = 2;
const MAX_FIELDS = 240;
const MAX_BUILDINGS = 430;
const MAX_TREES = 700;
const MAX_ROADS = 120;
const MAX_TOWERS = 48;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x6d2b79f5 + salt * 1013, 0x1b873593) ^ Math.imul(z - salt * 733, 0x85ebca6b);
  n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12;
  return (n >>> 0) / 0xffffffff;
}

function pick<T>(items: readonly T[], index: number): T {
  const safeIndex = ((index % items.length) + items.length) % items.length;
  return items[safeIndex];
}

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  dummy: THREE.Object3D,
  color?: THREE.Color,
): number {
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  if (color) mesh.setColorAt(index, color);
  return index + 1;
}

/**
 * High-altitude world density for V31.
 *
 * The 5x5 deterministic neighborhood now reads first as a landscape: large
 * patchwork fields, thin roads, forest belts and several small settlements per
 * view. Buildings remain deliberately modest so one white city block can never
 * dominate the chase-camera composition. Every ground layer stays opaque and
 * depth-writing, preserving V30's black-gap fix.
 */
export class SkyDancerGroundDensityV31 {
  private readonly root = new THREE.Group();
  private readonly fields: THREE.InstancedMesh;
  private readonly buildings: THREE.InstancedMesh;
  private readonly trees: THREE.InstancedMesh;
  private readonly roads: THREE.InstancedMesh;
  private readonly towers: THREE.InstancedMesh;
  private tileX = Number.NaN;
  private tileZ = Number.NaN;

  constructor(runtime: GroundDensityRuntime) {
    this.root.name = "sky-dancer-v31-ground-density";
    this.fields = this.makeFields();
    this.buildings = this.makeBuildings();
    this.trees = this.makeTrees();
    this.roads = this.makeRoads();
    this.towers = this.makeTowers();
    this.root.add(this.fields, this.roads, this.buildings, this.trees, this.towers);
    runtime.scene.add(this.root);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    const nextTileX = Math.floor(snapshot.x / WORLD_CHUNK);
    const nextTileZ = Math.floor(snapshot.z / WORLD_CHUNK);
    if (nextTileX === this.tileX && nextTileZ === this.tileZ) return;
    this.tileX = nextTileX;
    this.tileZ = nextTileZ;
    this.root.position.set(nextTileX * WORLD_CHUNK, 0, nextTileZ * WORLD_CHUNK);
    this.rebuild(nextTileX, nextTileZ);
  }

  private rebuild(centerTileX: number, centerTileZ: number): void {
    const dummy = new THREE.Object3D();
    const fieldPalette = [0x477f4b, 0x5e934f, 0x77a85a, 0x8da75b, 0x688c4b, 0x4f8561, 0x9c9a55].map((value) => new THREE.Color(value));
    const buildingPalette = [0x718997, 0x849aa5, 0x9eaaad, 0x657d8c, 0x8c9690].map((value) => new THREE.Color(value));
    const treePalette = [0x285d3b, 0x356c43, 0x447b49, 0x24543a, 0x4c7a45].map((value) => new THREE.Color(value));
    const roadPalette = [0x6d7f82, 0x788789, 0x607478].map((value) => new THREE.Color(value));
    const towerPalette = [0x748f9a, 0x91a7ad, 0x67818d].map((value) => new THREE.Color(value));

    let fieldIndex = 0;
    let buildingIndex = 0;
    let treeIndex = 0;
    let roadIndex = 0;
    let towerIndex = 0;

    for (let dz = -TILE_RADIUS; dz <= TILE_RADIUS; dz += 1) {
      for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx += 1) {
        const tileX = centerTileX + dx;
        const tileZ = centerTileZ + dz;
        const localBaseX = dx * WORLD_CHUNK;
        const localBaseZ = dz * WORLD_CHUNK;
        const density = hash2(tileX, tileZ, 1);
        const settlementX = localBaseX + (hash2(tileX, tileZ, 2) - 0.5) * 92;
        const settlementZ = localBaseZ + (hash2(tileX, tileZ, 3) - 0.5) * 92;

        const fieldCount = 6 + Math.floor(hash2(tileX, tileZ, 4) * 3);
        for (let i = 0; i < fieldCount && fieldIndex < MAX_FIELDS; i += 1) {
          const column = i % 3;
          const row = Math.floor(i / 3);
          const width = 28 + hash2(tileX, tileZ, 20 + i) * 32;
          const depth = 24 + hash2(tileX, tileZ, 40 + i) * 34;
          const offsetX = (column - 1) * 56 + (hash2(tileX, tileZ, 60 + i) - 0.5) * 18;
          const offsetZ = (row - 0.8) * 62 + (hash2(tileX, tileZ, 80 + i) - 0.5) * 20;
          dummy.position.set(localBaseX + offsetX, GROUND_Y + 0.30, localBaseZ + offsetZ);
          dummy.rotation.set(0, (hash2(tileX, tileZ, 100 + i) - 0.5) * 0.22, 0);
          dummy.scale.set(width, 0.12, depth);
          fieldIndex = setInstance(this.fields, fieldIndex, dummy, pick(fieldPalette, tileX * 7 + tileZ * 11 + i));
        }

        // Two narrow road axes create strong scale cues without reviving the
        // wide low-altitude road slabs that caused earlier black-ground overlap.
        for (let axis = 0; axis < 2 && roadIndex < MAX_ROADS; axis += 1) {
          const longAxis = axis === 0;
          const length = 150 + hash2(tileX, tileZ, 130 + axis) * 70;
          const width = 2.4 + hash2(tileX, tileZ, 140 + axis) * 1.7;
          dummy.position.set(
            settlementX + (longAxis ? 0 : (hash2(tileX, tileZ, 150) - 0.5) * 26),
            GROUND_Y + 0.48,
            settlementZ + (longAxis ? (hash2(tileX, tileZ, 151) - 0.5) * 26 : 0),
          );
          dummy.rotation.set(0, (hash2(tileX, tileZ, 160 + axis) - 0.5) * 0.16 + (longAxis ? 0 : Math.PI / 2), 0);
          dummy.scale.set(width, 0.07, length);
          roadIndex = setInstance(this.roads, roadIndex, dummy, pick(roadPalette, tileX + tileZ + axis));
        }

        const buildingCount = 8 + Math.floor(density * 8);
        for (let i = 0; i < buildingCount && buildingIndex < MAX_BUILDINGS; i += 1) {
          const angle = hash2(tileX, tileZ, 200 + i) * Math.PI * 2;
          const radius = 12 + hash2(tileX, tileZ, 240 + i) * 44;
          const width = 4.2 + hash2(tileX, tileZ, 280 + i) * 4.8;
          const depth = 4.0 + hash2(tileX, tileZ, 320 + i) * 5.0;
          const height = 5.0 + hash2(tileX, tileZ, 360 + i) * (density > 0.76 ? 16 : 9);
          dummy.position.set(
            settlementX + Math.cos(angle) * radius,
            GROUND_Y + 0.52 + height * 0.5,
            settlementZ + Math.sin(angle) * radius,
          );
          dummy.rotation.set(0, angle * 0.2 + (hash2(tileX, tileZ, 400 + i) - 0.5) * 0.28, 0);
          dummy.scale.set(width, height, depth);
          buildingIndex = setInstance(this.buildings, buildingIndex, dummy, pick(buildingPalette, i + tileX * 5 + tileZ * 3));
        }

        const treeCount = 16 + Math.floor(hash2(tileX, tileZ, 450) * 12);
        for (let i = 0; i < treeCount && treeIndex < MAX_TREES; i += 1) {
          const angle = hash2(tileX, tileZ, 480 + i) * Math.PI * 2;
          const radius = 64 + hash2(tileX, tileZ, 520 + i) * 70;
          const height = 4.0 + hash2(tileX, tileZ, 560 + i) * 5.5;
          const width = 2.4 + hash2(tileX, tileZ, 600 + i) * 2.7;
          dummy.position.set(
            settlementX + Math.cos(angle) * radius,
            GROUND_Y + 0.50 + height * 0.5,
            settlementZ + Math.sin(angle) * radius,
          );
          dummy.rotation.set(0, angle, 0);
          dummy.scale.set(width, height, width);
          treeIndex = setInstance(this.trees, treeIndex, dummy, pick(treePalette, i + tileX * 3 + tileZ * 5));
        }

        if (density > 0.72 && towerIndex < MAX_TOWERS) {
          const height = 20 + density * 22;
          dummy.position.set(settlementX - 7, GROUND_Y + 0.55 + height * 0.5, settlementZ + 8);
          dummy.rotation.set(0, hash2(tileX, tileZ, 700) * 0.35, 0);
          dummy.scale.set(4.4, height, 4.4);
          towerIndex = setInstance(this.towers, towerIndex, dummy, pick(towerPalette, tileX * 7 + tileZ * 11));
        }
      }
    }

    this.finishInstances(this.fields, fieldIndex);
    this.finishInstances(this.buildings, buildingIndex);
    this.finishInstances(this.trees, treeIndex);
    this.finishInstances(this.roads, roadIndex);
    this.finishInstances(this.towers, towerIndex);
  }

  private finishInstances(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private makeFields(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: false, depthWrite: true, depthTest: true, toneMapped: false, fog: false }),
      MAX_FIELDS,
    );
    mesh.name = "sky-dancer-v31-patchwork-fields";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeBuildings(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, transparent: false, depthWrite: true, fog: false }),
      MAX_BUILDINGS,
    );
    mesh.name = "sky-dancer-v31-settlement-buildings";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeTrees(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 5),
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, transparent: false, depthWrite: true, fog: false }),
      MAX_TREES,
    );
    mesh.name = "sky-dancer-v31-forest-belts";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeRoads(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: false, depthWrite: true, depthTest: true, toneMapped: false, fog: false }),
      MAX_ROADS,
    );
    mesh.name = "sky-dancer-v31-road-network";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeTowers(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, transparent: false, depthWrite: true, fog: false }),
      MAX_TOWERS,
    );
    mesh.name = "sky-dancer-v31-landmark-towers";
    mesh.frustumCulled = false;
    return mesh;
  }
}

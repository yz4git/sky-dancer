import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";

interface GroundDensityRuntime {
  scene: THREE.Scene;
}

const WORLD_CHUNK = 210;
const GROUND_Y = -66.45;
const TILE_RADIUS = 2;
const MAX_BUILDINGS = 360;
const MAX_TREES = 620;
const MAX_ROADS = 110;
const MAX_TOWERS = 40;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x6d2b79f5 + salt * 1013, 0x1b873593) ^ Math.imul(z - salt * 733, 0x85ebca6b);
  n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12;
  return (n >>> 0) / 0xffffffff;
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
 * All detail is opaque, instanced and depth-writing. A deterministic 5x5 tile
 * neighborhood is rebuilt only when the aircraft enters a new 210 m chunk, so
 * the camera always has near/mid/far landmarks without reviving the low-altitude
 * Cart scenery that caused V29/V30 ground overlap and black gaps.
 */
export class SkyDancerGroundDensityV31 {
  private readonly root = new THREE.Group();
  private readonly buildings: THREE.InstancedMesh;
  private readonly trees: THREE.InstancedMesh;
  private readonly roads: THREE.InstancedMesh;
  private readonly towers: THREE.InstancedMesh;
  private tileX = Number.NaN;
  private tileZ = Number.NaN;

  constructor(runtime: GroundDensityRuntime) {
    this.root.name = "sky-dancer-v31-ground-density";
    this.buildings = this.makeBuildings();
    this.trees = this.makeTrees();
    this.roads = this.makeRoads();
    this.towers = this.makeTowers();
    this.root.add(this.roads, this.buildings, this.trees, this.towers);
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
    const buildingPalette = [0xb9c8cd, 0x9fb2bb, 0xd3d8d5, 0x93a6af, 0xc6c7ba].map((value) => new THREE.Color(value));
    const treePalette = [0x315f40, 0x3d7249, 0x4d7f51, 0x2d6648].map((value) => new THREE.Color(value));
    const roadPalette = [0x71868b, 0x7d8f91, 0x667c81].map((value) => new THREE.Color(value));
    const towerPalette = [0x8eaeb8, 0xb2c4c8, 0x7898a3].map((value) => new THREE.Color(value));

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
        const settlementX = localBaseX + (hash2(tileX, tileZ, 2) - 0.5) * 116;
        const settlementZ = localBaseZ + (hash2(tileX, tileZ, 3) - 0.5) * 116;

        // Two soft road axes make the settlement readable at 300 m without
        // reintroducing the thick black vehicle-era road slabs.
        for (let axis = 0; axis < 2 && roadIndex < MAX_ROADS; axis += 1) {
          const longAxis = axis === 0;
          const length = 118 + hash2(tileX, tileZ, 10 + axis) * 68;
          const width = 2.2 + hash2(tileX, tileZ, 20 + axis) * 1.8;
          dummy.position.set(
            settlementX + (longAxis ? 0 : (hash2(tileX, tileZ, 30) - 0.5) * 22),
            GROUND_Y + 0.48,
            settlementZ + (longAxis ? (hash2(tileX, tileZ, 31) - 0.5) * 22 : 0),
          );
          dummy.rotation.set(0, (hash2(tileX, tileZ, 40 + axis) - 0.5) * 0.18 + (longAxis ? 0 : Math.PI / 2), 0);
          dummy.scale.set(width, 0.08, length);
          roadIndex = setInstance(this.roads, roadIndex, dummy, roadPalette[(tileX + tileZ + axis + 99) % roadPalette.length]);
        }

        const buildingCount = 5 + Math.floor(density * 7);
        for (let i = 0; i < buildingCount && buildingIndex < MAX_BUILDINGS; i += 1) {
          const angle = hash2(tileX, tileZ, 100 + i) * Math.PI * 2;
          const radius = 14 + hash2(tileX, tileZ, 140 + i) * 52;
          const width = 3.0 + hash2(tileX, tileZ, 180 + i) * 4.8;
          const depth = 3.0 + hash2(tileX, tileZ, 220 + i) * 5.2;
          const height = 3.5 + hash2(tileX, tileZ, 260 + i) * (density > 0.72 ? 19 : 10);
          dummy.position.set(
            settlementX + Math.cos(angle) * radius,
            GROUND_Y + 0.55 + height * 0.5,
            settlementZ + Math.sin(angle) * radius,
          );
          dummy.rotation.set(0, angle * 0.25 + (hash2(tileX, tileZ, 300 + i) - 0.5) * 0.35, 0);
          dummy.scale.set(width, height, depth);
          buildingIndex = setInstance(this.buildings, buildingIndex, dummy, buildingPalette[(i + Math.abs(tileX) + Math.abs(tileZ)) % buildingPalette.length]);
        }

        // Forest belts fill the negative space between settlements and make
        // banking shots read as landscape instead of an empty green board.
        const treeCount = 12 + Math.floor(hash2(tileX, tileZ, 400) * 11);
        for (let i = 0; i < treeCount && treeIndex < MAX_TREES; i += 1) {
          const angle = hash2(tileX, tileZ, 430 + i) * Math.PI * 2;
          const radius = 58 + hash2(tileX, tileZ, 470 + i) * 72;
          const height = 2.2 + hash2(tileX, tileZ, 510 + i) * 3.8;
          const width = 1.4 + hash2(tileX, tileZ, 550 + i) * 2.2;
          dummy.position.set(
            settlementX + Math.cos(angle) * radius,
            GROUND_Y + 0.55 + height * 0.5,
            settlementZ + Math.sin(angle) * radius,
          );
          dummy.rotation.set(0, angle, 0);
          dummy.scale.set(width, height, width);
          treeIndex = setInstance(this.trees, treeIndex, dummy, treePalette[(i + tileX * 3 + tileZ * 5 + 97) % treePalette.length]);
        }

        if (density > 0.74 && towerIndex < MAX_TOWERS) {
          const height = 18 + density * 24;
          dummy.position.set(settlementX - 8, GROUND_Y + 0.55 + height * 0.5, settlementZ + 7);
          dummy.rotation.set(0, hash2(tileX, tileZ, 700) * 0.4, 0);
          dummy.scale.set(4.2, height, 4.2);
          towerIndex = setInstance(this.towers, towerIndex, dummy, towerPalette[(Math.abs(tileX) + Math.abs(tileZ)) % towerPalette.length]);
        }
      }
    }

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

  private makeBuildings(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, transparent: false, depthWrite: true }),
      MAX_BUILDINGS,
    );
    mesh.name = "sky-dancer-v31-settlement-buildings";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeTrees(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 5),
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, transparent: false, depthWrite: true }),
      MAX_TREES,
    );
    mesh.name = "sky-dancer-v31-forest-belts";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeRoads(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: false, depthWrite: true, depthTest: true, toneMapped: false }),
      MAX_ROADS,
    );
    mesh.name = "sky-dancer-v31-road-network";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeTowers(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, transparent: false, depthWrite: true }),
      MAX_TOWERS,
    );
    mesh.name = "sky-dancer-v31-landmark-towers";
    mesh.frustumCulled = false;
    return mesh;
  }
}

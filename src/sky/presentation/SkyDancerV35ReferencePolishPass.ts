import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

const CITY_SNAP = 420;
const GROUND_Y = -66.30;
const MAX_FOCUS_BUILDINGS = 500;
const MAX_FOCUS_STREETS = 40;
const MAX_FOCUS_RIVER = 24;
const FRONT_MOUNTAIN_FAR_COUNT = 22;
const FRONT_MOUNTAIN_NEAR_COUNT = 20;
const FRONT_CLOUD_COUNT = 32;
const FOCUS_CITY_LOCAL_CENTER_Z = 160;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x5bd1e995 + salt * 809, 0x27d4eb2d) ^ Math.imul(z - salt * 617, 0x165667b1);
  n ^= n >>> 15;
  n = Math.imul(n, 0x85ebca6b);
  n ^= n >>> 13;
  return (n >>> 0) / 0xffffffff;
}

interface CameraPresentationRuntime extends SkyDancerFxRuntime {
  applyCameraPresentation?(snapshot: CartArenaSessionSnapshot): void;
}

function installPolishCameraFraming(runtime: SkyDancerFxRuntime): void {
  const install = () => {
    const cameraRuntime = runtime as CameraPresentationRuntime;
    if (cameraRuntime.camera.userData.skyDancerV35PolishFraming === true) return;
    const inherited = cameraRuntime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(cameraRuntime);
    cameraRuntime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      cameraRuntime.camera.rotateX(0.075);
    };
    cameraRuntime.camera.userData.skyDancerV35PolishFraming = true;
  };
  if (typeof queueMicrotask === "function") queueMicrotask(install);
  else install();
}

/**
 * Capture-driven V35 final owner.
 *
 * Pass 4 put the numerical city center on the camera ground ray, but the real
 * capture still read as countryside because nearly all mass projected into a
 * narrow horizon band. Pass 5 deliberately spans the city from near-midground
 * to the focal point, keeps the closest blocks low, builds height toward the
 * center/back, and strengthens the mountain silhouette behind the skyline.
 */
export class SkyDancerV35ReferencePolishPass {
  private readonly focusRoot = new THREE.Group();
  private readonly focusBuildings: THREE.InstancedMesh;
  private readonly focusStreets: THREE.InstancedMesh;
  private readonly focusRiver: THREE.InstancedMesh;
  private readonly frontMountainsFar: THREE.InstancedMesh;
  private readonly frontMountainsNear: THREE.InstancedMesh;
  private readonly frontClouds: THREE.InstancedMesh;
  private focusTileX = Number.NaN;
  private focusTileZ = Number.NaN;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.focusRoot.name = "sky-dancer-v35-reference-focus-city";
    this.focusRoot.userData.skyDancerV35LocalCenterZ = FOCUS_CITY_LOCAL_CENTER_Z;
    this.focusBuildings = this.makeFocusBuildings();
    this.focusStreets = this.makeFocusStreets();
    this.focusRiver = this.makeFocusRiver();
    this.frontMountainsFar = this.makeFrontMountainBelt(
      "sky-dancer-v35-front-mountains-far",
      FRONT_MOUNTAIN_FAR_COUNT,
      true,
    );
    this.frontMountainsNear = this.makeFrontMountainBelt(
      "sky-dancer-v35-front-mountains-near",
      FRONT_MOUNTAIN_NEAR_COUNT,
      false,
    );
    this.frontClouds = this.makeFrontClouds();
    this.focusRoot.add(
      this.focusStreets,
      this.focusRiver,
      this.focusBuildings,
      this.frontMountainsFar,
      this.frontMountainsNear,
      this.frontClouds,
    );
    runtime.scene.add(this.focusRoot);
    installPolishCameraFraming(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.hideCoarseForegroundLayers();
    this.rebalanceRecoveredFields();
    this.rebalanceForestBelts();
    this.updateFocusCity(snapshot);
  }

  private hideCoarseForegroundLayers(): void {
    for (const name of [
      "sky-dancer-v35-city-low",
      "sky-dancer-v35-city-mid",
      "sky-dancer-v35-city-high",
      "sky-dancer-v35-metro-road-grid",
      "sky-dancer-v35-metro-river",
      "sky-dancer-v35-mountain-far",
      "sky-dancer-v35-mountain-near",
      "sky-dancer-v35-cloud-main",
      "sky-dancer-v35-cloud-shade",
      "sky-dancer-v31-settlement-buildings",
      "sky-dancer-v31-landmark-towers",
      "sky-dancer-v31-road-network",
    ]) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }
  }

  private rebalanceRecoveredFields(): void {
    const fields = this.runtime.scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    if (fields instanceof THREE.InstancedMesh && fields.material instanceof THREE.MeshBasicMaterial) {
      fields.visible = true;
      fields.material.transparent = true;
      fields.material.opacity = 0.64;
      fields.material.depthWrite = true;
      fields.material.fog = true;
      fields.material.needsUpdate = true;
    }
  }

  private rebalanceForestBelts(): void {
    const forest = this.runtime.scene.getObjectByName("sky-dancer-v31-forest-belts");
    if (!(forest instanceof THREE.InstancedMesh) || !(forest.material instanceof THREE.MeshLambertMaterial)) return;
    forest.visible = true;
    forest.material.transparent = true;
    forest.material.opacity = 0.30;
    forest.material.color.setHex(0x4b7757);
    forest.material.fog = true;
    forest.material.needsUpdate = true;
  }

  private updateFocusCity(snapshot: CartArenaSessionSnapshot): void {
    const tileX = Math.floor(snapshot.x / CITY_SNAP);
    const tileZ = Math.floor(snapshot.z / CITY_SNAP);
    if (tileX === this.focusTileX && tileZ === this.focusTileZ) return;
    this.focusTileX = tileX;
    this.focusTileZ = tileZ;

    // Pass 4 centered at world z≈500 but projected too close to the horizon.
    // Pass 5 starts the urban fabric around z≈264 and ends around z≈540 so the
    // lower half of the view contains city scale cues while the skyline remains
    // near the reference focal point.
    this.focusRoot.position.set(tileX * CITY_SNAP + 140, 0, tileZ * CITY_SNAP + 240);
    this.focusRoot.userData.skyDancerV35WorldCenterZ = this.focusRoot.position.z + FOCUS_CITY_LOCAL_CENTER_Z;
    this.rebuildFocusCity(tileX, tileZ);
  }

  private rebuildFocusCity(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    const palette = [0x96aab3, 0xaebdc2, 0xc8d0d1, 0x879da8, 0xd8dddd, 0xa1b3ba].map((value) => new THREE.Color(value));
    let buildingIndex = 0;
    let streetIndex = 0;
    let riverIndex = 0;
    const seed = Math.floor(hash2(tileX, tileZ, 400) * 1000);
    const spacing = 9.2;
    const startZ = 24;

    for (let row = 0; row < 31; row += 1) {
      const z = startZ + row * spacing;
      const riverX = 22 + Math.sin((z + seed) * 0.025) * 17;
      for (let column = -15; column <= 15 && buildingIndex < MAX_FOCUS_BUILDINGS; column += 1) {
        const x = column * spacing;
        const roadColumn = (column + 15) % 5 === 0;
        const roadRow = row % 5 === 0;
        if (roadColumn || roadRow || Math.abs(x - riverX) < 7.0) continue;

        const noise = hash2(tileX + column, tileZ + row, 800 + seed);
        const centerDistance = Math.hypot(x * 0.88, (z - FOCUS_CITY_LOCAL_CENTER_Z) * 0.52);
        const core = THREE.MathUtils.clamp(1 - centerDistance / 158, 0, 1);
        const depthGain = THREE.MathUtils.clamp((z - 26) / 118, 0.18, 1);
        let height = 3.2 + noise * 5.8 + core * depthGain * (7.0 + noise * 22.0);
        let width = 2.25 + hash2(column, row, 1000 + seed) * 1.95;
        let depth = 2.25 + hash2(row, column, 1100 + seed) * 2.05;

        const landmark = (row === 14 && column === -5) || (row === 19 && column === 5) || (row === 23 && column === 0);
        if (landmark) {
          height = 54 + hash2(column, row, 1200 + seed) * 22;
          width = 4.9;
          depth = 4.9;
        }

        dummy.position.set(
          x + (hash2(column, row, 1300 + seed) - 0.5) * 1.0,
          GROUND_Y + 0.72 + height * 0.5,
          z + (hash2(row, column, 1400 + seed) - 0.5) * 1.0,
        );
        dummy.rotation.set(0, (hash2(column, row, 1500 + seed) - 0.5) * 0.04, 0);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        this.focusBuildings.setMatrixAt(buildingIndex, dummy.matrix);
        this.focusBuildings.setColorAt(buildingIndex, palette[(row * 3 + column + palette.length * 8) % palette.length]);
        buildingIndex += 1;
      }
    }

    for (let column = -15; column <= 15 && streetIndex < MAX_FOCUS_STREETS; column += 5) {
      dummy.position.set(column * spacing, GROUND_Y + 0.78, 162);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.08, 0.07, 300);
      dummy.updateMatrix();
      this.focusStreets.setMatrixAt(streetIndex++, dummy.matrix);
    }
    for (let row = 0; row < 31 && streetIndex < MAX_FOCUS_STREETS; row += 5) {
      dummy.position.set(0, GROUND_Y + 0.79, startZ + row * spacing);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(1.02, 0.07, 302);
      dummy.updateMatrix();
      this.focusStreets.setMatrixAt(streetIndex++, dummy.matrix);
    }

    const riverSegmentLength = 13.0;
    for (let segment = 0; segment < MAX_FOCUS_RIVER; segment += 1) {
      const z = 17 + segment * riverSegmentLength;
      const x = 22 + Math.sin((z + seed) * 0.025) * 17;
      const nextX = 22 + Math.sin((z + riverSegmentLength + seed) * 0.025) * 17;
      dummy.position.set((x + nextX) * 0.5, GROUND_Y + 0.80, z + riverSegmentLength * 0.5);
      dummy.rotation.set(0, Math.atan2(nextX - x, riverSegmentLength), 0);
      dummy.scale.set(9.8 + hash2(tileX, tileZ, 1700 + segment) * 2.8, 0.08, riverSegmentLength * 1.12);
      dummy.updateMatrix();
      this.focusRiver.setMatrixAt(riverIndex++, dummy.matrix);
    }

    this.focusBuildings.count = buildingIndex;
    this.focusBuildings.instanceMatrix.needsUpdate = true;
    if (this.focusBuildings.instanceColor) this.focusBuildings.instanceColor.needsUpdate = true;
    this.focusStreets.count = streetIndex;
    this.focusStreets.instanceMatrix.needsUpdate = true;
    this.focusRiver.count = riverIndex;
    this.focusRiver.instanceMatrix.needsUpdate = true;
  }

  private makeFocusBuildings(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        fog: true,
        toneMapped: false,
      }),
      MAX_FOCUS_BUILDINGS,
    );
    mesh.name = "sky-dancer-v35-focus-buildings";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeFocusStreets(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x7b8d92,
        transparent: true,
        opacity: 0.84,
        fog: true,
        toneMapped: false,
      }),
      MAX_FOCUS_STREETS,
    );
    mesh.name = "sky-dancer-v35-focus-streets";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeFocusRiver(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x3e9fc5,
        fog: true,
        toneMapped: false,
      }),
      MAX_FOCUS_RIVER,
    );
    mesh.name = "sky-dancer-v35-focus-river";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeFrontMountainBelt(name: string, count: number, far: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 5),
      new THREE.MeshBasicMaterial({
        color: far ? 0x7190a1 : 0x4f7488,
        transparent: true,
        opacity: far ? 0.52 : 0.78,
        depthWrite: false,
        depthTest: true,
        fog: true,
        toneMapped: false,
      }),
      count,
    );
    mesh.name = name;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < count; index += 1) {
      const x = -540 + index * (1080 / Math.max(1, count - 1));
      const height = far
        ? 86 + (index % 6) * 8.0 + Math.sin(index * 1.57) * 5
        : 108 + (index % 6) * 9.0 + Math.sin(index * 1.79) * 7;
      const width = far ? 102 + (index % 5) * 15 : 88 + (index % 5) * 14;
      const z = far ? 485 + (index % 4) * 20 : 405 + (index % 4) * 18;
      dummy.position.set(x, GROUND_Y + height * 0.49, z);
      dummy.rotation.set(0, (index % 3 - 1) * 0.10, 0);
      dummy.scale.set(width, height, width * (far ? 0.58 : 0.52));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeFrontClouds(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xf6f9fa,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        depthTest: true,
        fog: true,
        toneMapped: false,
      }),
      FRONT_CLOUD_COUNT,
    );
    mesh.name = "sky-dancer-v35-front-cloud-patches";
    const dummy = new THREE.Object3D();
    for (let index = 0; index < FRONT_CLOUD_COUNT; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2) % 8;
      const z = 105 + lane * 32 + Math.sin(index * 1.31) * 12;
      const x = side * (48 + (index % 6) * 27) + Math.cos(index * 1.87) * 12;
      const size = 12.5 + (index % 5) * 2.1;
      dummy.position.set(x, -42 - (index % 4) * 1.6, z);
      dummy.rotation.set(0.02 * (index % 3), index * 0.27, 0.015 * (index % 5));
      dummy.scale.set(size * 1.74, size * 0.14, size * 1.10);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }
}

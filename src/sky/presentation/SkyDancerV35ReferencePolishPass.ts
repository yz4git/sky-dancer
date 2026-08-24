import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

const CITY_SNAP = 420;
const GROUND_Y = -66.30;
const MAX_FOCUS_BUILDINGS = 500;
const MAX_FOCUS_STREETS = 30;
const FRONT_MOUNTAIN_COUNT = 28;
const FRONT_CLOUD_COUNT = 28;

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
 * Capture-driven V35 polish.
 *
 * The first two V35 WebGL captures proved that object-count targets alone were
 * insufficient: a dense city can still read as sparse when its world tile sits
 * beside/behind the aircraft, and coarse legacy settlements can dominate the
 * foreground. This final owner places the compact metro deterministically in
 * the forward opening corridor, suppresses coarse legacy blocks, and authors a
 * guaranteed angular mountain belt plus thin below-flight cloud patches.
 */
export class SkyDancerV35ReferencePolishPass {
  private readonly focusRoot = new THREE.Group();
  private readonly focusBuildings: THREE.InstancedMesh;
  private readonly focusStreets: THREE.InstancedMesh;
  private readonly frontMountains: THREE.InstancedMesh;
  private readonly frontClouds: THREE.InstancedMesh;
  private focusTileX = Number.NaN;
  private focusTileZ = Number.NaN;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.focusRoot.name = "sky-dancer-v35-reference-focus-city";
    this.focusBuildings = this.makeFocusBuildings();
    this.focusStreets = this.makeFocusStreets();
    this.frontMountains = this.makeFrontMountainBelt();
    this.frontClouds = this.makeFrontClouds();
    this.focusRoot.add(this.focusStreets, this.focusBuildings, this.frontMountains, this.frontClouds);
    runtime.scene.add(this.focusRoot);
    installPolishCameraFraming(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.hideCoarseForegroundLayers();
    this.rebalanceRecoveredFields();
    this.updateFocusCity(snapshot);
  }

  private hideCoarseForegroundLayers(): void {
    for (const name of [
      "sky-dancer-v35-city-low",
      "sky-dancer-v35-city-mid",
      "sky-dancer-v35-city-high",
      "sky-dancer-v35-metro-road-grid",
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

    const river = this.runtime.scene.getObjectByName("sky-dancer-v35-metro-river");
    if (river instanceof THREE.InstancedMesh && river.material instanceof THREE.MeshStandardMaterial) {
      river.visible = true;
      river.material.color.setHex(0x4aa4c5);
      river.material.emissive.setHex(0x0c4a61);
      river.material.emissiveIntensity = 0.16;
      river.material.roughness = 0.34;
      river.material.needsUpdate = true;
    }
  }

  private rebalanceRecoveredFields(): void {
    const fields = this.runtime.scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    if (fields instanceof THREE.InstancedMesh && fields.material instanceof THREE.MeshBasicMaterial) {
      fields.visible = true;
      fields.material.transparent = true;
      fields.material.opacity = 0.38;
      fields.material.fog = true;
      fields.material.needsUpdate = true;
    }
  }

  private updateFocusCity(snapshot: CartArenaSessionSnapshot): void {
    const tileX = Math.floor(snapshot.x / CITY_SNAP);
    const tileZ = Math.floor(snapshot.z / CITY_SNAP);
    if (tileX === this.focusTileX && tileZ === this.focusTileZ) return;
    this.focusTileX = tileX;
    this.focusTileZ = tileZ;

    // The historical world grid starts the common opening run near x≈560,z≈160.
    // A fixed per-tile offset keeps the metro world-stable while placing it in
    // the north-facing forward corridor instead of beside/behind the aircraft.
    this.focusRoot.position.set(tileX * CITY_SNAP + 140, 0, tileZ * CITY_SNAP + 150);
    this.rebuildFocusCity(tileX, tileZ);
  }

  private rebuildFocusCity(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    const palette = [0x9cadb5, 0xb4c1c5, 0xcbd2d3, 0x8fa3ad, 0xdbe0df, 0xa8b8be].map((value) => new THREE.Color(value));
    let buildingIndex = 0;
    let streetIndex = 0;
    const seed = Math.floor(hash2(tileX, tileZ, 400) * 1000);
    const spacing = 10.8;
    const startZ = 32;

    for (let row = 0; row < 28; row += 1) {
      const z = startZ + row * spacing;
      const riverX = 28 + Math.sin((z + seed) * 0.022) * 18;
      for (let column = -14; column <= 14 && buildingIndex < MAX_FOCUS_BUILDINGS; column += 1) {
        const x = column * spacing;
        const roadColumn = (column + 14) % 6 === 0;
        const roadRow = row % 6 === 0;
        if (roadColumn || roadRow || Math.abs(x - riverX) < 8.2) continue;

        const noise = hash2(tileX + column, tileZ + row, 800 + seed);
        const centerDistance = Math.hypot(x * 0.82, (z - 168) * 0.52);
        const core = THREE.MathUtils.clamp(1 - centerDistance / 176, 0, 1);
        let height = 4.0 + noise * 7.0 + core * (5.0 + noise * 17.5);
        let width = 2.7 + hash2(column, row, 1000 + seed) * 2.1;
        let depth = 2.7 + hash2(row, column, 1100 + seed) * 2.2;

        const landmark = (row === 10 && column === -5) || (row === 14 && column === 5) || (row === 18 && column === 0);
        if (landmark) {
          height = 46 + hash2(column, row, 1200 + seed) * 19;
          width = 4.7;
          depth = 4.7;
        }

        dummy.position.set(
          x + (hash2(column, row, 1300 + seed) - 0.5) * 1.35,
          GROUND_Y + 0.72 + height * 0.5,
          z + (hash2(row, column, 1400 + seed) - 0.5) * 1.35,
        );
        dummy.rotation.set(0, (hash2(column, row, 1500 + seed) - 0.5) * 0.055, 0);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        this.focusBuildings.setMatrixAt(buildingIndex, dummy.matrix);
        this.focusBuildings.setColorAt(buildingIndex, palette[(row * 3 + column + palette.length * 8) % palette.length]);
        buildingIndex += 1;
      }
    }

    for (let column = -14; column <= 14 && streetIndex < MAX_FOCUS_STREETS; column += 6) {
      dummy.position.set(column * spacing, GROUND_Y + 0.78, 178);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.0, 0.07, 318);
      dummy.updateMatrix();
      this.focusStreets.setMatrixAt(streetIndex++, dummy.matrix);
    }
    for (let row = 0; row < 28 && streetIndex < MAX_FOCUS_STREETS; row += 6) {
      dummy.position.set(0, GROUND_Y + 0.79, startZ + row * spacing);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(0.95, 0.07, 326);
      dummy.updateMatrix();
      this.focusStreets.setMatrixAt(streetIndex++, dummy.matrix);
    }

    this.focusBuildings.count = buildingIndex;
    this.focusBuildings.instanceMatrix.needsUpdate = true;
    if (this.focusBuildings.instanceColor) this.focusBuildings.instanceColor.needsUpdate = true;
    this.focusStreets.count = streetIndex;
    this.focusStreets.instanceMatrix.needsUpdate = true;
  }

  private makeFocusBuildings(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.56,
        metalness: 0.08,
        flatShading: true,
        fog: true,
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
      new THREE.MeshBasicMaterial({ color: 0x8c9b9e, fog: true, toneMapped: false }),
      MAX_FOCUS_STREETS,
    );
    mesh.name = "sky-dancer-v35-focus-streets";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeFrontMountainBelt(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 5),
      new THREE.MeshBasicMaterial({
        color: 0x52798d,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        depthTest: true,
        fog: true,
        toneMapped: false,
      }),
      FRONT_MOUNTAIN_COUNT,
    );
    mesh.name = "sky-dancer-v35-front-mountain-belt";
    const dummy = new THREE.Object3D();
    for (let index = 0; index < FRONT_MOUNTAIN_COUNT; index += 1) {
      const x = -540 + index * (1080 / (FRONT_MOUNTAIN_COUNT - 1));
      const height = 60 + (index % 7) * 7.5 + Math.sin(index * 1.8) * 5;
      const width = 76 + (index % 5) * 13;
      const z = 520 + (index % 4) * 34;
      dummy.position.set(x, GROUND_Y + height * 0.49, z);
      dummy.rotation.set(0, (index % 3 - 1) * 0.10, 0);
      dummy.scale.set(width, height, width * (0.50 + (index % 3) * 0.07));
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
        color: 0xf5f8f9,
        transparent: true,
        opacity: 0.40,
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
      const lane = Math.floor(index / 2) % 7;
      const z = 205 + lane * 46 + Math.sin(index * 1.31) * 18;
      const x = side * (64 + (index % 6) * 31) + Math.cos(index * 1.87) * 14;
      const size = 15 + (index % 5) * 2.7;
      dummy.position.set(x, -28 - (index % 4) * 2.4, z);
      dummy.rotation.set(0.02 * (index % 3), index * 0.27, 0.015 * (index % 5));
      dummy.scale.set(size * 1.72, size * 0.19, size * 1.08);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }
}

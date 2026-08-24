import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { scheduleSkyDancerV35ReferenceFraming } from "./SkyDancerCameraPresentation";

const CITY_SNAP = 420;
const GROUND_Y = -66.30;
const MAX_FOCUS_BUILDINGS = 500;
const MAX_FOCUS_STREETS = 40;
const MAX_FOCUS_RIVER = 24;
const FRONT_MOUNTAIN_FAR_COUNT = 22;
const FRONT_MOUNTAIN_NEAR_COUNT = 20;
const FRONT_CLOUD_COUNT = 32;
const FOCUS_CITY_LOCAL_CENTER_Z = 160;
const LEGACY_DYNAMIC_LAYER_NAMES = [
  "sky-dancer-v32-polish-ridge-near",
  "sky-dancer-v32-polish-ridge-far",
  "sky-dancer-v32-ridge-near",
  "sky-dancer-v32-ridge-far",
  "sky-dancer-v32-polish-cloud-main",
  "sky-dancer-v32-polish-cloud-shade",
  "sky-dancer-v32-hero-clouds",
  "sky-dancer-v32-hero-cloud-shade",
] as const;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x5bd1e995 + salt * 809, 0x27d4eb2d) ^ Math.imul(z - salt * 617, 0x165667b1);
  n ^= n >>> 15;
  n = Math.imul(n, 0x85ebca6b);
  n ^= n >>> 13;
  return (n >>> 0) / 0xffffffff;
}

/**
 * Capture-driven V35 presentation owner.
 *
 * The earlier implementation built a complete first-pass city, mountains and
 * clouds, then built this focal composition and hid the first pass every frame.
 * This class preserves the latest capture-tuned midground while owning only the
 * final visible hierarchy. Tile crossings now do one bounded rebuild, and
 * steady-state frames avoid scene searches and bulk allocations. Gameplay
 * coordinates and the 300 m flight model remain untouched.
 */
export class SkyDancerV35ReferencePass {
  private readonly focusRoot = new THREE.Group();
  private readonly focusBuildings: THREE.InstancedMesh;
  private readonly focusStreets: THREE.InstancedMesh;
  private readonly focusRiver: THREE.InstancedMesh;
  private readonly frontMountainsFar: THREE.InstancedMesh;
  private readonly frontMountainsNear: THREE.InstancedMesh;
  private readonly frontClouds: THREE.InstancedMesh;
  private readonly instanceDummy = new THREE.Object3D();
  private readonly cityPalette = [0x96aab3, 0xaebdc2, 0xc8d0d1, 0x879da8, 0xd8dddd, 0xa1b3ba]
    .map((value) => new THREE.Color(value));
  private readonly atmosphereColor = new THREE.Color(0x68acd2);
  private readonly legacyDynamicLayers: THREE.Object3D[];
  private readonly fields: THREE.Object3D | undefined;
  private readonly forest: THREE.Object3D | undefined;
  private readonly settlements: THREE.Object3D | undefined;
  private readonly towers: THREE.Object3D | undefined;
  private readonly roads: THREE.Object3D | undefined;
  private readonly v34Masses: THREE.Object3D | undefined;
  private focusTileX = Number.NaN;
  private focusTileZ = Number.NaN;
  private hierarchyTuned = false;
  private heroTuned = false;

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
    this.legacyDynamicLayers = LEGACY_DYNAMIC_LAYER_NAMES
      .map((name) => runtime.scene.getObjectByName(name))
      .filter((object): object is THREE.Object3D => object !== undefined);
    this.fields = runtime.scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    this.forest = runtime.scene.getObjectByName("sky-dancer-v31-forest-belts");
    this.settlements = runtime.scene.getObjectByName("sky-dancer-v31-settlement-buildings");
    this.towers = runtime.scene.getObjectByName("sky-dancer-v31-landmark-towers");
    this.roads = runtime.scene.getObjectByName("sky-dancer-v31-road-network");
    this.v34Masses = runtime.scene.getObjectByName("sky-dancer-v34-irregular-terrain-masses");

    this.hideStaticLegacyLayers();
    runtime.scene.add(this.focusRoot);
    runtime.scene.userData.skyDancerV35ReferenceOwner = "single-pass";
    runtime.camera.far = Math.max(runtime.camera.far, 1900);
    runtime.camera.updateProjectionMatrix();
    scheduleSkyDancerV35ReferenceFraming(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    // V32 restores these own layers in its update, so cached references are
    // suppressed after V32 without repeated scene traversal.
    for (const object of this.legacyDynamicLayers) object.visible = false;
    if (!this.hierarchyTuned) this.tuneFinalHierarchy();
    this.updateFocusCity(snapshot);
    this.tuneAtmosphere();
    this.tuneHeroAircraft();
  }

  private hideStaticLegacyLayers(): void {
    if (this.settlements) this.settlements.visible = false;
    if (this.towers) this.towers.visible = false;
    if (this.roads) this.roads.visible = false;
    if (this.v34Masses) this.v34Masses.visible = false;
  }

  private tuneFinalHierarchy(): void {
    this.hierarchyTuned = true;
    this.hideStaticLegacyLayers();

    if (this.fields instanceof THREE.InstancedMesh && this.fields.material instanceof THREE.MeshBasicMaterial) {
      this.fields.visible = true;
      this.fields.material.transparent = true;
      this.fields.material.opacity = 0.64;
      this.fields.material.depthWrite = true;
      this.fields.material.fog = true;
      this.fields.material.needsUpdate = true;
    }

    if (this.forest instanceof THREE.InstancedMesh && this.forest.material instanceof THREE.MeshLambertMaterial) {
      this.forest.visible = true;
      this.forest.material.transparent = true;
      this.forest.material.opacity = 0.30;
      this.forest.material.color.setHex(0x4b7757);
      this.forest.material.fog = true;
      this.forest.material.needsUpdate = true;
    }
  }

  private tuneAtmosphere(): void {
    const fog = this.runtime.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.color.setHex(0x92c4d8);
      fog.near = 620;
      fog.far = 1760;
    }
    if (this.runtime.scene.background !== this.atmosphereColor) {
      this.runtime.scene.background = this.atmosphereColor;
    }
  }

  private tuneHeroAircraft(): void {
    if (this.heroTuned) return;
    this.heroTuned = true;
    this.runtime.playerVisual.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.roughness = Math.min(material.roughness, 0.38);
        material.metalness = Math.max(material.metalness, 0.18);
        material.needsUpdate = true;
      }
    });
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
    const dummy = this.instanceDummy;
    const palette = this.cityPalette;
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

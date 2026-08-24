import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

const CITY_SNAP = 420;
const GROUND_Y = -66.30;
const MAX_FOCUS_BUILDINGS = 360;
const MAX_FOCUS_STREETS = 24;

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
      cameraRuntime.camera.rotateX(0.045);
    };
    cameraRuntime.camera.userData.skyDancerV35PolishFraming = true;
  };
  if (typeof queueMicrotask === "function") queueMicrotask(install);
  else install();
}

/**
 * Second V35 pass driven by the first real WebGL capture.
 *
 * The first V35 capture successfully restored world density, but it still read
 * as scattered suburban towers. This pass concentrates smaller buildings into
 * the forward central corridor, adds unmistakable angular ridges and readable
 * below-flight clouds, and lowers the horizon another small amount.
 */
export class SkyDancerV35ReferencePolishPass {
  private readonly focusRoot = new THREE.Group();
  private readonly focusBuildings: THREE.InstancedMesh;
  private readonly focusStreets: THREE.InstancedMesh;
  private readonly atmosphereRoot = new THREE.Group();
  private focusTileX = Number.NaN;
  private focusTileZ = Number.NaN;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.focusRoot.name = "sky-dancer-v35-reference-focus-city";
    this.focusBuildings = this.makeFocusBuildings();
    this.focusStreets = this.makeFocusStreets();
    this.focusRoot.add(this.focusStreets, this.focusBuildings);

    this.atmosphereRoot.name = "sky-dancer-v35-reference-focus-atmosphere";
    this.atmosphereRoot.add(
      this.makeMountainMesh("sky-dancer-v35-focus-mountains-far", 0x6f91a4, 30, true),
      this.makeMountainMesh("sky-dancer-v35-focus-mountains-near", 0x537789, 26, false),
      this.makeCloudMesh("sky-dancer-v35-focus-clouds", 34),
    );

    runtime.scene.add(this.focusRoot, this.atmosphereRoot);
    installPolishCameraFraming(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.hideFirstPassForegroundClutter();
    this.rebalanceRecoveredFields();
    this.updateFocusCity(snapshot);
    this.atmosphereRoot.position.set(snapshot.x, 0, snapshot.z);
  }

  private hideFirstPassForegroundClutter(): void {
    for (const name of [
      "sky-dancer-v35-city-low",
      "sky-dancer-v35-city-mid",
      "sky-dancer-v35-city-high",
      "sky-dancer-v35-metro-road-grid",
      "sky-dancer-v35-mountain-far",
      "sky-dancer-v35-mountain-near",
      "sky-dancer-v35-cloud-main",
      "sky-dancer-v35-cloud-shade",
    ]) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }

    const river = this.runtime.scene.getObjectByName("sky-dancer-v35-metro-river");
    if (river instanceof THREE.InstancedMesh && river.material instanceof THREE.MeshStandardMaterial) {
      river.visible = true;
      river.material.color.setHex(0x49a7c8);
      river.material.emissive.setHex(0x0b4b64);
      river.material.emissiveIntensity = 0.18;
      river.material.roughness = 0.3;
      river.material.needsUpdate = true;
    }
  }

  private rebalanceRecoveredFields(): void {
    const fields = this.runtime.scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    if (fields instanceof THREE.InstancedMesh && fields.material instanceof THREE.MeshBasicMaterial) {
      fields.visible = true;
      fields.material.transparent = true;
      fields.material.opacity = 0.48;
      fields.material.fog = true;
      fields.material.needsUpdate = true;
    }

    const roads = this.runtime.scene.getObjectByName("sky-dancer-v31-road-network");
    if (roads instanceof THREE.InstancedMesh && roads.material instanceof THREE.MeshBasicMaterial) {
      roads.material.color.setHex(0x7d9094);
      roads.material.fog = true;
      roads.material.needsUpdate = true;
    }
  }

  private updateFocusCity(snapshot: CartArenaSessionSnapshot): void {
    const tileX = Math.floor(snapshot.x / CITY_SNAP);
    const tileZ = Math.floor(snapshot.z / CITY_SNAP);
    if (tileX === this.focusTileX && tileZ === this.focusTileZ) return;
    this.focusTileX = tileX;
    this.focusTileZ = tileZ;
    this.focusRoot.position.set(tileX * CITY_SNAP, 0, tileZ * CITY_SNAP);
    this.rebuildFocusCity(tileX, tileZ);
  }

  private rebuildFocusCity(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    const palette = [0x9fb2bb, 0xb6c3c7, 0xcbd3d4, 0x8fa6b1, 0xdde2e1, 0xa9bcc3].map((value) => new THREE.Color(value));
    let buildingIndex = 0;
    let streetIndex = 0;
    const seed = Math.floor(hash2(tileX, tileZ, 400) * 1000);
    const spacing = 13.5;
    const startZ = 54;

    for (let row = 0; row < 23; row += 1) {
      const z = startZ + row * spacing;
      const riverX = 34 + Math.sin((z + seed) * 0.022) * 20;
      for (let column = -11; column <= 11 && buildingIndex < MAX_FOCUS_BUILDINGS; column += 1) {
        const x = column * spacing;
        const roadColumn = (column + 11) % 5 === 0;
        const roadRow = row % 5 === 0;
        if (roadColumn || roadRow || Math.abs(x - riverX) < 10.5) continue;

        const noise = hash2(tileX + column, tileZ + row, 800 + seed);
        const centerDistance = Math.hypot(x * 0.78, (z - 165) * 0.48);
        const core = THREE.MathUtils.clamp(1 - centerDistance / 170, 0, 1);
        let height = 4.5 + noise * 8.5 + core * (6 + noise * 20);
        let width = 3.4 + hash2(column, row, 1000 + seed) * 3.2;
        let depth = 3.4 + hash2(row, column, 1100 + seed) * 3.2;

        const landmark = (row === 9 && column === -5) || (row === 11 && column === 5) || (row === 14 && column === 0);
        if (landmark) {
          height = 49 + hash2(column, row, 1200 + seed) * 25;
          width = 5.2;
          depth = 5.2;
        }

        dummy.position.set(
          x + (hash2(column, row, 1300 + seed) - 0.5) * 2.1,
          GROUND_Y + 0.7 + height * 0.5,
          z + (hash2(row, column, 1400 + seed) - 0.5) * 2.1,
        );
        dummy.rotation.set(0, (hash2(column, row, 1500 + seed) - 0.5) * 0.075, 0);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        this.focusBuildings.setMatrixAt(buildingIndex, dummy.matrix);
        this.focusBuildings.setColorAt(buildingIndex, palette[(row * 3 + column + palette.length * 8) % palette.length]);
        buildingIndex += 1;
      }
    }

    for (let column = -11; column <= 11 && streetIndex < MAX_FOCUS_STREETS; column += 5) {
      dummy.position.set(column * spacing, GROUND_Y + 0.78, 196);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.55, 0.08, 312);
      dummy.updateMatrix();
      this.focusStreets.setMatrixAt(streetIndex++, dummy.matrix);
    }
    for (let row = 0; row < 23 && streetIndex < MAX_FOCUS_STREETS; row += 5) {
      dummy.position.set(0, GROUND_Y + 0.79, startZ + row * spacing);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(1.45, 0.08, 310);
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
        roughness: 0.54,
        metalness: 0.10,
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
      new THREE.MeshBasicMaterial({ color: 0x788b91, fog: true, toneMapped: false }),
      MAX_FOCUS_STREETS,
    );
    mesh.name = "sky-dancer-v35-focus-streets";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeMountainMesh(name: string, color: number, count: number, far: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 5),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: far ? 0.46 : 0.66,
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
      const angle = index / count * Math.PI * 2 + Math.sin(index * 1.83) * 0.05;
      const radius = far ? 760 + (index % 6) * 24 : 500 + (index % 5) * 22;
      const height = far ? 78 + (index % 7) * 6 : 88 + (index % 6) * 7;
      const width = far ? 116 + (index % 5) * 16 : 98 + (index % 5) * 15;
      dummy.position.set(Math.cos(angle) * radius, GROUND_Y + height * 0.49, Math.sin(angle) * radius);
      dummy.rotation.set(0, -angle + (index % 3) * 0.07, 0);
      dummy.scale.set(width, height, width * (0.50 + (index % 3) * 0.07));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeCloudMesh(name: string, count: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xf3f7f8,
        transparent: true,
        opacity: 0.44,
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
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2) % 7;
      const z = 95 + lane * 42 + Math.sin(index * 1.37) * 19;
      const x = side * (62 + (index % 6) * 31) + Math.cos(index * 1.91) * 16;
      const size = 11 + (index % 5) * 2.4;
      dummy.position.set(x, -13 - (index % 4) * 2.0, z);
      dummy.rotation.set(0, index * 0.31, 0);
      dummy.scale.set(size * 1.75, size * 0.24, size * 1.06);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }
}

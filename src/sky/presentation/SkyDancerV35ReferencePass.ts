import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { scheduleSkyDancerV35ReferenceFraming } from "./SkyDancerCameraPresentation";

const METRO_SNAP = 360;
const CLOUD_SNAP = 420;
const GROUND_Y = -66.38;
const MAX_CITY_LOW = 220;
const MAX_CITY_MID = 132;
const MAX_CITY_HIGH = 64;
const MAX_ROADS = 48;
const MAX_RIVER = 24;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x6d2b79f5 + salt * 919, 0x1b873593) ^ Math.imul(z - salt * 733, 0x85ebca6b);
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
 * V35 reference-art-direction pass.
 *
 * V34 intentionally reduced the rectangular field read, but in combination
 * with V32 hiding V31 settlement meshes it also removed the metropolitan scale
 * that made the strongest earlier Sky Dancer captures work. V35 is the final
 * owner of visual hierarchy: recover useful V31 density, suppress the degraded
 * ridge/cloud stacks, add a fixed-cost metro core, and keep low clouds below the
 * aircraft. No gameplay coordinates or the 300 m flight model are changed.
 */
export class SkyDancerV35ReferencePass {
  private readonly metroRoot = new THREE.Group();
  private readonly cityLow: THREE.InstancedMesh;
  private readonly cityMid: THREE.InstancedMesh;
  private readonly cityHigh: THREE.InstancedMesh;
  private readonly roads: THREE.InstancedMesh;
  private readonly river: THREE.InstancedMesh;
  private readonly mountainRoot = new THREE.Group();
  private readonly cloudRoot = new THREE.Group();
  private metroTileX = Number.NaN;
  private metroTileZ = Number.NaN;
  private cloudTileX = Number.NaN;
  private cloudTileZ = Number.NaN;
  private heroTuned = false;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.metroRoot.name = "sky-dancer-v35-reference-metro";
    this.cityLow = this.makeBuildingMesh("sky-dancer-v35-city-low", 0x93a9b3, MAX_CITY_LOW, 0.72, 0.04);
    this.cityMid = this.makeBuildingMesh("sky-dancer-v35-city-mid", 0xb3c1c6, MAX_CITY_MID, 0.58, 0.08);
    this.cityHigh = this.makeBuildingMesh("sky-dancer-v35-city-high", 0xd4dde0, MAX_CITY_HIGH, 0.42, 0.16);
    this.roads = this.makeRoadMesh();
    this.river = this.makeRiverMesh();
    this.metroRoot.add(this.roads, this.river, this.cityLow, this.cityMid, this.cityHigh);

    this.mountainRoot.name = "sky-dancer-v35-angular-mountains";
    this.mountainRoot.add(
      this.makeMountainMesh("sky-dancer-v35-mountain-far", 0x668aa0, 34, true),
      this.makeMountainMesh("sky-dancer-v35-mountain-near", 0x496f82, 30, false),
    );

    this.cloudRoot.name = "sky-dancer-v35-below-flight-clouds";
    this.cloudRoot.add(
      this.makeCloudMesh("sky-dancer-v35-cloud-main", 0xf4f8fa, 44, 0.34, false),
      this.makeCloudMesh("sky-dancer-v35-cloud-shade", 0xb8d1dc, 44, 0.14, true),
    );

    runtime.scene.add(this.metroRoot, this.mountainRoot, this.cloudRoot);
    runtime.camera.far = Math.max(runtime.camera.far, 1900);
    runtime.camera.updateProjectionMatrix();
    scheduleSkyDancerV35ReferenceFraming(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.restoreUsefulWorldDensity();
    this.suppressRegressedLayers();
    this.updateMetro(snapshot);
    this.updateAtmosphereAnchors(snapshot);
    this.tuneAtmosphere();
    this.tuneHeroAircraft();
  }

  private restoreUsefulWorldDensity(): void {
    const fields = this.runtime.scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    if (fields instanceof THREE.InstancedMesh) {
      fields.visible = true;
      if (fields.material instanceof THREE.MeshBasicMaterial) {
        fields.material.transparent = true;
        fields.material.opacity = 0.67;
        fields.material.depthWrite = true;
        fields.material.fog = true;
        fields.material.needsUpdate = true;
      }
    }

    const settlements = this.runtime.scene.getObjectByName("sky-dancer-v31-settlement-buildings");
    if (settlements instanceof THREE.InstancedMesh) {
      settlements.visible = true;
      if (settlements.material instanceof THREE.MeshLambertMaterial) {
        settlements.material.color.setHex(0xe1ebed);
        settlements.material.fog = true;
        settlements.material.needsUpdate = true;
      }
    }

    const towers = this.runtime.scene.getObjectByName("sky-dancer-v31-landmark-towers");
    if (towers instanceof THREE.InstancedMesh) {
      towers.visible = true;
      if (towers.material instanceof THREE.MeshStandardMaterial || towers.material instanceof THREE.MeshLambertMaterial) {
        towers.material.color.setHex(0xc8d8dc);
        towers.material.fog = true;
        towers.material.needsUpdate = true;
      }
    }

    const roads = this.runtime.scene.getObjectByName("sky-dancer-v31-road-network");
    if (roads instanceof THREE.InstancedMesh) {
      roads.visible = true;
      if (roads.material instanceof THREE.MeshBasicMaterial) {
        roads.material.color.setHex(0x61787f);
        roads.material.fog = true;
        roads.material.needsUpdate = true;
      }
    }
  }

  private suppressRegressedLayers(): void {
    const v34Masses = this.runtime.scene.getObjectByName("sky-dancer-v34-irregular-terrain-masses");
    if (v34Masses) v34Masses.visible = false;

    // The V34 vertical stretch turned the shallow V32 ridges into large rounded
    // mid-screen masses. V35 owns a new faceted horizon instead.
    for (const name of [
      "sky-dancer-v32-polish-ridge-near",
      "sky-dancer-v32-polish-ridge-far",
      "sky-dancer-v32-ridge-near",
      "sky-dancer-v32-ridge-far",
    ]) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }

    // Keep the reference requirement: cloud patches below the flight plane,
    // never an opaque cloud sea occupying the horizon.
    for (const name of [
      "sky-dancer-v32-polish-cloud-main",
      "sky-dancer-v32-polish-cloud-shade",
      "sky-dancer-v32-hero-clouds",
      "sky-dancer-v32-hero-cloud-shade",
    ]) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }
  }

  private updateMetro(snapshot: CartArenaSessionSnapshot): void {
    const tileX = Math.floor(snapshot.x / METRO_SNAP);
    const tileZ = Math.floor(snapshot.z / METRO_SNAP);
    if (tileX === this.metroTileX && tileZ === this.metroTileZ) return;
    this.metroTileX = tileX;
    this.metroTileZ = tileZ;
    this.metroRoot.position.set(tileX * METRO_SNAP, 0, tileZ * METRO_SNAP);
    this.rebuildMetro(tileX, tileZ);
  }

  private rebuildMetro(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    const lowPalette = [0x91a9b4, 0xa4b6bc, 0x829aa8, 0xb1bec0, 0x7791a0].map((value) => new THREE.Color(value));
    const midPalette = [0xb8c7ca, 0xc6d0d0, 0xaabac0, 0xd2d9d8, 0x9db0b9].map((value) => new THREE.Color(value));
    const highPalette = [0xdbe3e4, 0xe7ebea, 0xbccbd0, 0xcfdadd, 0xaec3cc].map((value) => new THREE.Color(value));
    let lowIndex = 0;
    let midIndex = 0;
    let highIndex = 0;
    let roadIndex = 0;
    let riverIndex = 0;

    const spacingX = 18;
    const spacingZ = 18;
    const cityCenterZ = 84;
    const seedOffset = Math.floor(hash2(tileX, tileZ, 900) * 1000);

    for (let row = -5; row <= 10; row += 1) {
      for (let column = -8; column <= 8; column += 1) {
        const baseX = column * spacingX;
        const baseZ = row * spacingZ + cityCenterZ;
        const riverX = 32 + Math.sin((baseZ + seedOffset) * 0.021) * 22;
        const roadColumn = (column + 8) % 4 === 0;
        const roadRow = (row + 5) % 4 === 0;
        if (roadColumn || roadRow || Math.abs(baseX - riverX) < 13) continue;

        const noise = hash2(tileX + column, tileZ + row, 1200 + seedOffset);
        const centerDistance = Math.hypot(baseX * 0.82, (baseZ - 92) * 0.58);
        const core = THREE.MathUtils.clamp(1 - centerDistance / 175, 0, 1);
        const footprintX = 5.2 + hash2(column, row, 1400 + seedOffset) * 5.4;
        const footprintZ = 5.0 + hash2(column, row, 1600 + seedOffset) * 5.6;
        const height = 6.5 + noise * 13 + core * (7 + noise * 26);
        const jitterX = (hash2(column, row, 1800 + seedOffset) - 0.5) * 4.2;
        const jitterZ = (hash2(row, column, 1900 + seedOffset) - 0.5) * 4.2;
        dummy.position.set(baseX + jitterX, GROUND_Y + 0.62 + height * 0.5, baseZ + jitterZ);
        dummy.rotation.set(0, (hash2(column, row, 2000 + seedOffset) - 0.5) * 0.1, 0);
        dummy.scale.set(footprintX, height, footprintZ);

        if (height > 31 && highIndex < MAX_CITY_HIGH) {
          highIndex = setInstance(this.cityHigh, highIndex, dummy, highPalette[(row + column + highPalette.length * 8) % highPalette.length]);
        } else if (height > 17 && midIndex < MAX_CITY_MID) {
          midIndex = setInstance(this.cityMid, midIndex, dummy, midPalette[(row * 3 + column + midPalette.length * 8) % midPalette.length]);
        } else if (lowIndex < MAX_CITY_LOW) {
          lowIndex = setInstance(this.cityLow, lowIndex, dummy, lowPalette[(row * 5 + column + lowPalette.length * 8) % lowPalette.length]);
        }
      }
    }

    // A recognisable skyline landmark, intentionally much taller than the
    // surrounding grid so the city reads at iPhone scale like the reference.
    const landmarks = [
      { x: 66, z: 118, h: 66, w: 7.2 },
      { x: -58, z: 92, h: 48, w: 6.3 },
      { x: 8, z: 152, h: 43, w: 6.0 },
    ];
    for (const landmark of landmarks) {
      if (highIndex >= MAX_CITY_HIGH) break;
      dummy.position.set(landmark.x, GROUND_Y + 0.7 + landmark.h * 0.5, landmark.z);
      dummy.rotation.set(0, 0.08 * Math.sign(landmark.x), 0);
      dummy.scale.set(landmark.w, landmark.h, landmark.w * 0.86);
      highIndex = setInstance(this.cityHigh, highIndex, dummy, new THREE.Color(0xe6edef));
    }

    // Orthogonal streets provide the visual scale cues that were lost when the
    // V34 irregular ground masses replaced the patchwork city hierarchy.
    for (let lane = -8; lane <= 8 && roadIndex < MAX_ROADS; lane += 4) {
      dummy.position.set(lane * spacingX, GROUND_Y + 0.74, cityCenterZ + 40);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(3.2, 0.12, 300);
      roadIndex = setInstance(this.roads, roadIndex, dummy);
    }
    for (let lane = -5; lane <= 11 && roadIndex < MAX_ROADS; lane += 4) {
      dummy.position.set(0, GROUND_Y + 0.76, lane * spacingZ + cityCenterZ);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(3.0, 0.12, 310);
      roadIndex = setInstance(this.roads, roadIndex, dummy);
    }

    const segmentLength = 18;
    for (let segment = 0; segment < MAX_RIVER; segment += 1) {
      const z = -84 + segment * segmentLength;
      const x = 32 + Math.sin((z + seedOffset) * 0.021) * 22;
      const nextX = 32 + Math.sin((z + segmentLength + seedOffset) * 0.021) * 22;
      dummy.position.set((x + nextX) * 0.5, GROUND_Y + 0.70, z + segmentLength * 0.5);
      dummy.rotation.set(0, Math.atan2(nextX - x, segmentLength), 0);
      dummy.scale.set(20 + hash2(tileX, tileZ, 2400 + segment) * 7, 0.13, segmentLength * 1.08);
      riverIndex = setInstance(this.river, riverIndex, dummy);
    }

    this.finish(this.cityLow, lowIndex);
    this.finish(this.cityMid, midIndex);
    this.finish(this.cityHigh, highIndex);
    this.finish(this.roads, roadIndex);
    this.finish(this.river, riverIndex);
  }

  private updateAtmosphereAnchors(snapshot: CartArenaSessionSnapshot): void {
    this.mountainRoot.position.set(snapshot.x, 0, snapshot.z);
    const cloudTileX = Math.floor(snapshot.x / CLOUD_SNAP);
    const cloudTileZ = Math.floor(snapshot.z / CLOUD_SNAP);
    if (cloudTileX !== this.cloudTileX || cloudTileZ !== this.cloudTileZ) {
      this.cloudTileX = cloudTileX;
      this.cloudTileZ = cloudTileZ;
      this.cloudRoot.position.set(cloudTileX * CLOUD_SNAP, 0, cloudTileZ * CLOUD_SNAP);
    }
  }

  private tuneAtmosphere(): void {
    const fog = this.runtime.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.color.setHex(0x92c4d8);
      fog.near = 620;
      fog.far = 1760;
    }
    this.runtime.scene.background = new THREE.Color(0x68acd2);
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

  private makeBuildingMesh(
    name: string,
    color: number,
    maxCount: number,
    roughness: number,
    metalness: number,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        flatShading: true,
        fog: true,
      }),
      maxCount,
    );
    mesh.name = name;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeRoadMesh(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x5f737b, fog: true, toneMapped: false }),
      MAX_ROADS,
    );
    mesh.name = "sky-dancer-v35-metro-road-grid";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeRiverMesh(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x2e9ac3,
        emissive: 0x0d506d,
        emissiveIntensity: 0.24,
        roughness: 0.22,
        metalness: 0.02,
        fog: true,
      }),
      MAX_RIVER,
    );
    mesh.name = "sky-dancer-v35-metro-river";
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeMountainMesh(name: string, color: number, count: number, far: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: far ? 0.45 : 0.68,
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
      const angle = index / count * Math.PI * 2 + Math.sin(index * 2.17) * 0.055;
      const radius = far ? 820 + (index % 6) * 28 : 590 + (index % 5) * 26;
      const height = far ? 47 + (index % 7) * 5.2 : 38 + (index % 6) * 5.8;
      const width = far ? 112 + (index % 5) * 18 : 86 + (index % 5) * 16;
      dummy.position.set(Math.cos(angle) * radius, GROUND_Y + height * 0.48, Math.sin(angle) * radius);
      dummy.rotation.set(0, -angle + (index % 3) * 0.08, 0);
      dummy.scale.set(width, height, width * (0.48 + (index % 3) * 0.08));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeCloudMesh(
    name: string,
    color: number,
    count: number,
    opacity: number,
    shade: boolean,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
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
      const angle = index / count * Math.PI * 2 + Math.sin(index * 1.63) * 0.24;
      const radius = 150 + (index % 9) * 31;
      const size = 11 + (index % 5) * 2.6;
      const y = -24 - (index % 4) * 3.1 - (shade ? 1.2 : 0);
      dummy.position.set(
        Math.cos(angle) * radius + Math.sin(index * 2.33) * 18,
        y,
        Math.sin(angle) * radius + Math.cos(index * 1.91) * 18,
      );
      dummy.rotation.set(0.03 * (index % 3), angle, 0.02 * (index % 5));
      dummy.scale.set(size * 1.65, size * (shade ? 0.20 : 0.28), size * 1.06);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private finish(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

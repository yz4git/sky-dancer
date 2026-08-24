import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";

const WORLD_SNAP = 420;
const GROUND_Y = -66.77;
const MAX_CITY_LOW = 150;
const MAX_CITY_MID = 96;
const MAX_CITY_HIGH = 42;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x51ed270b + salt * 911, 0x1b873593) ^ Math.imul(z - salt * 593, 0x85ebca6b);
  n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12;
  return (n >>> 0) / 0xffffffff;
}

/** Final screenshot-driven composition owner for the V32 reference pass. */
export class SkyDancerReferencePolishV32 {
  private readonly groundRoot = new THREE.Group();
  private readonly atmosphereRoot = new THREE.Group();
  private readonly cityLow: THREE.InstancedMesh;
  private readonly cityMid: THREE.InstancedMesh;
  private readonly cityHigh: THREE.InstancedMesh;
  private readonly ridgeNear: THREE.InstancedMesh;
  private readonly ridgeFar: THREE.InstancedMesh;
  private readonly cloudMain: THREE.InstancedMesh;
  private readonly cloudShade: THREE.InstancedMesh;
  private tileX = Number.NaN;
  private tileZ = Number.NaN;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.groundRoot.name = "sky-dancer-v32-polish-ground";
    this.atmosphereRoot.name = "sky-dancer-v32-polish-atmosphere";

    this.cityLow = this.makeCity("sky-dancer-v32-polish-city-low", 0x5f7480, MAX_CITY_LOW);
    this.cityMid = this.makeCity("sky-dancer-v32-polish-city-mid", 0x758993, MAX_CITY_MID);
    this.cityHigh = this.makeCity("sky-dancer-v32-polish-city-high", 0x91a2a9, MAX_CITY_HIGH);
    this.groundRoot.add(this.cityLow, this.cityMid, this.cityHigh);

    this.ridgeNear = this.makeRidge("sky-dancer-v32-polish-ridge-near", 0x416b70, 26, false);
    this.ridgeFar = this.makeRidge("sky-dancer-v32-polish-ridge-far", 0x6e8c94, 30, true);
    this.cloudMain = this.makeCloudBank("sky-dancer-v32-polish-cloud-main", 0xf3f8fa, 72, false);
    this.cloudShade = this.makeCloudBank("sky-dancer-v32-polish-cloud-shade", 0xbacdd7, 72, true);
    this.atmosphereRoot.add(this.ridgeFar, this.ridgeNear, this.cloudShade, this.cloudMain);

    runtime.scene.add(this.groundRoot, this.atmosphereRoot);
    this.enlargeHeroAircraft();
    this.hideSupersededPresentation();
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.groundRoot.visible = true;
    this.atmosphereRoot.visible = true;
    this.hideSupersededPresentation();

    // The WebGL constructor prewarms the inheritance chain before a complete
    // gameplay snapshot exists. V32 is visual-only, so ignore that frame.
    if (!snapshot || !Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.z)) return;

    const nextTileX = Math.floor(snapshot.x / WORLD_SNAP);
    const nextTileZ = Math.floor(snapshot.z / WORLD_SNAP);
    if (nextTileX !== this.tileX || nextTileZ !== this.tileZ) {
      this.tileX = nextTileX;
      this.tileZ = nextTileZ;
      this.groundRoot.position.set(nextTileX * WORLD_SNAP, 0, nextTileZ * WORLD_SNAP);
      this.rebuildCity(nextTileX, nextTileZ);
    }

    this.atmosphereRoot.position.set(snapshot.x, 0, snapshot.z);
  }

  private hideSupersededPresentation(): void {
    const names = [
      // Older mountains / horizon silhouettes.
      "sky-dancer-v24-horizon-silhouettes",
      "sky-dancer-v28-mountain-depth",
      "sky-dancer-v30-mountain-belt",
      "sky-dancer-v32-ridge-near",
      "sky-dancer-v32-ridge-far",
      // Older clouds. Keeping several generations visible at once was what made
      // the #350 capture look like flat white shelves across the whole horizon.
      "sky-dancer-v24-far-cloud-layer",
      "sky-dancer-v25-horizon-cloud-banks",
      "sky-dancer-v28-layered-cloud-banks",
      "sky-dancer-v29-reference-cloud-bank",
      "sky-dancer-v31-low-clouds",
      "sky-dancer-v31-mid-clouds",
      "sky-dancer-v32-hero-clouds",
      "sky-dancer-v32-hero-cloud-shade",
      // Older close city systems.
      "sky-dancer-v29-reference-skyline",
      "sky-dancer-v31-settlement-buildings",
      "sky-dancer-v31-landmark-towers",
      "sky-dancer-v32-city-low",
      "sky-dancer-v32-city-mid",
      "sky-dancer-v32-city-high",
    ];
    for (const name of names) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }
  }

  private rebuildCity(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    let low = 0;
    let mid = 0;
    let high = 0;

    // World +X projects left in the common north-facing chase view, therefore
    // the hero skyline uses negative X so it occupies the reference's right side.
    const districts = [
      { x: -315, z: 485, count: 48, hero: true },
      { x: 380, z: 610, count: 15, hero: false },
      { x: -575, z: 690, count: 13, hero: false },
      { x: 90, z: 760, count: 12, hero: false },
    ] as const;

    for (let district = 0; district < districts.length; district += 1) {
      const spec = districts[district];
      const cx = spec.x + (hash2(tileX, tileZ, 20 + district) - 0.5) * 42;
      const cz = spec.z + (hash2(tileX, tileZ, 30 + district) - 0.5) * 50;
      for (let i = 0; i < spec.count; i += 1) {
        const a = hash2(tileX, tileZ, 120 + district * 71 + i) * Math.PI * 2;
        const r = 6 + hash2(tileX, tileZ, 400 + district * 67 + i) * (spec.hero ? 54 : 34);
        const density = Math.max(0, 1 - r / (spec.hero ? 60 : 40));
        const noise = hash2(tileX, tileZ, 700 + district * 59 + i);
        const footprint = 2.8 + hash2(tileX, tileZ, 940 + district * 47 + i) * (spec.hero ? 4.6 : 3.2);
        let height = 5 + noise * 11 + density * (spec.hero ? 23 : 7);
        if (spec.hero && i === 0) height = 58;
        if (spec.hero && i === 1) height = 42;
        if (spec.hero && i === 2) height = 34;

        dummy.position.set(
          cx + Math.cos(a) * r,
          GROUND_Y + 0.7 + height * 0.5,
          cz + Math.sin(a) * r,
        );
        dummy.rotation.set(0, a * 0.10, 0);
        const width = spec.hero && i === 0 ? 5.2 : footprint;
        dummy.scale.set(width, height, width * (0.82 + hash2(tileX, tileZ, 1300 + i) * 0.30));
        dummy.updateMatrix();

        if (height > 27 && high < MAX_CITY_HIGH) this.cityHigh.setMatrixAt(high++, dummy.matrix);
        else if (height > 13 && mid < MAX_CITY_MID) this.cityMid.setMatrixAt(mid++, dummy.matrix);
        else if (low < MAX_CITY_LOW) this.cityLow.setMatrixAt(low++, dummy.matrix);
      }
    }

    this.finish(this.cityLow, low);
    this.finish(this.cityMid, mid);
    this.finish(this.cityHigh, high);
  }

  private makeCity(name: string, color: number, maxCount: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.58,
        metalness: 0.08,
        flatShading: true,
        fog: true,
      }),
      maxCount,
    );
    mesh.name = name;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeRidge(name: string, color: number, count: number, far: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: far,
        opacity: far ? 0.58 : 0.88,
        depthWrite: false,
        fog: true,
        toneMapped: false,
      }),
      count,
    );
    mesh.name = name;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const angle = i / count * Math.PI * 2 + Math.sin(i * 1.37) * 0.045;
      const radius = far ? 820 + (i % 6) * 38 : 590 + (i % 5) * 31;
      const width = far ? 135 + (i % 5) * 20 : 92 + (i % 5) * 16;
      const height = far ? 25 + (i % 6) * 2.8 : 19 + (i % 5) * 2.7;
      dummy.position.set(Math.cos(angle) * radius, GROUND_Y - height * 0.18, Math.sin(angle) * radius);
      dummy.rotation.set((i % 3 - 1) * 0.05, -angle + i * 0.07, (i % 4 - 1.5) * 0.02);
      dummy.scale.set(width, height, width * (0.31 + (i % 3) * 0.05));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeCloudBank(name: string, color: number, maxCount: number, shade: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: shade ? 0.16 : 0.91,
        depthWrite: false,
        depthTest: true,
        fog: true,
        toneMapped: false,
      }),
      maxCount,
    );
    mesh.name = name;
    const dummy = new THREE.Object3D();
    let index = 0;

    // Sparse horizon banks: three broad cumulus clusters plus one taller cloud
    // on the right. Tight lobe spacing makes each cluster read as one cloud.
    const clusters = [
      { angle: -0.72, radius: 430, baseY: 34, lobes: 16, tall: true },
      { angle: 0.08, radius: 500, baseY: 30, lobes: 15, tall: false },
      { angle: 1.10, radius: 470, baseY: 28, lobes: 14, tall: false },
      { angle: 2.62, radius: 520, baseY: 33, lobes: 14, tall: false },
    ] as const;

    for (let c = 0; c < clusters.length; c += 1) {
      const spec = clusters[c];
      const cx = Math.cos(spec.angle) * spec.radius;
      const cz = Math.sin(spec.angle) * spec.radius;
      for (let l = 0; l < spec.lobes && index < maxCount; l += 1) {
        const seed = 2000 + c * 109 + l * 37;
        const a = hash2(c, l, seed) * Math.PI * 2;
        const upper = l >= Math.floor(spec.lobes * 0.62);
        const ring = l === 0 ? 0 : 1.2 + hash2(l, c, seed + 1) * (upper ? 4.0 : 6.5);
        const size = (upper ? 7.2 : 9.2) + hash2(c, l, seed + 2) * (upper ? 4.8 : 6.2);
        const lift = upper ? 5 + hash2(c, l, seed + 3) * (spec.tall ? 16 : 9) : 0;
        dummy.position.set(
          cx + Math.cos(a) * ring,
          spec.baseY + lift + (hash2(c, l, seed + 4) - 0.45) * size * 0.24 - (shade ? size * 0.10 : 0),
          cz + Math.sin(a) * ring * 0.70,
        );
        dummy.rotation.set(hash2(c, l, seed + 5) * 0.08, a, hash2(l, c, seed + 6) * 0.08);
        dummy.scale.set(size * 1.10, size * (shade ? 0.52 : 0.94), size);
        dummy.updateMatrix();
        mesh.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private enlargeHeroAircraft(): void {
    const player = this.runtime.playerVisual;
    if (player.userData.skyDancerV32PolishScale === true) return;
    // Combined with the base V32 scale this is about 1.82x V31 visually.
    player.scale.multiplyScalar(1.38);
    player.userData.skyDancerV32PolishScale = true;
  }

  private finish(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }
}

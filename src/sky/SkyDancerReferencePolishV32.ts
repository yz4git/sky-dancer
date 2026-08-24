import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";

const WORLD_SNAP = 420;
const GROUND_Y = -66.77;
const MAX_CITY_LOW = 190;
const MAX_CITY_MID = 130;
const MAX_CITY_HIGH = 58;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x51ed270b + salt * 911, 0x1b873593) ^ Math.imul(z - salt * 593, 0x85ebca6b);
  n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12;
  return (n >>> 0) / 0xffffffff;
}

/**
 * Final reference-composition authority for V32.
 *
 * The first V32 audit proved that the general direction was correct but also
 * showed three remaining problems: cone mountains still read as pyramids,
 * districts could appear too close, and individual cloud lobes did not read as
 * one cumulus body. This layer replaces only those visible parts while keeping
 * V31 ground integrity and all gameplay untouched.
 */
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

    this.cityLow = this.makeCity("sky-dancer-v32-polish-city-low", 0x718794, MAX_CITY_LOW);
    this.cityMid = this.makeCity("sky-dancer-v32-polish-city-mid", 0x8fa2aa, MAX_CITY_MID);
    this.cityHigh = this.makeCity("sky-dancer-v32-polish-city-high", 0xaebdc2, MAX_CITY_HIGH);
    this.groundRoot.add(this.cityLow, this.cityMid, this.cityHigh);

    this.ridgeNear = this.makeRidge("sky-dancer-v32-polish-ridge-near", 0x3f6470, 28, false);
    this.ridgeFar = this.makeRidge("sky-dancer-v32-polish-ridge-far", 0x698690, 34, true);
    this.cloudMain = this.makeCloudBank("sky-dancer-v32-polish-cloud-main", 0xf1f7fa, 90, false);
    this.cloudShade = this.makeCloudBank("sky-dancer-v32-polish-cloud-shade", 0xb9ced8, 90, true);
    this.atmosphereRoot.add(this.ridgeFar, this.ridgeNear, this.cloudShade, this.cloudMain);

    runtime.scene.add(this.groundRoot, this.atmosphereRoot);
    this.enlargeHeroAircraft();
    this.hideSupersededV32();
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.groundRoot.visible = true;
    this.atmosphereRoot.visible = true;
    this.hideSupersededV32();

    // The base WebGL constructor prewarms the FX inheritance chain before every
    // subclass has a live gameplay snapshot. V32 is presentation-only, so an
    // incomplete prewarm frame should simply leave the static roots visible.
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

  private hideSupersededV32(): void {
    for (const name of [
      "sky-dancer-v32-ridge-near",
      "sky-dancer-v32-ridge-far",
      "sky-dancer-v32-hero-clouds",
      "sky-dancer-v32-hero-cloud-shade",
      "sky-dancer-v32-city-low",
      "sky-dancer-v32-city-mid",
      "sky-dancer-v32-city-high",
    ]) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }
  }

  private rebuildCity(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    let low = 0;
    let mid = 0;
    let high = 0;

    const districtCount = 5;
    for (let district = 0; district < districtCount; district += 1) {
      const hero = district === 0;
      let cx: number;
      let cz: number;
      if (hero) {
        // At the common north-facing opening this sits in the forward/right
        // quadrant, but far enough away to read as a skyline instead of a wall.
        cx = 365 + (hash2(tileX, tileZ, 10) - 0.5) * 34;
        cz = 365 + (hash2(tileX, tileZ, 11) - 0.5) * 34;
      } else {
        const angle = (district - 1) / (districtCount - 1) * Math.PI * 2
          + hash2(tileX, tileZ, 40 + district) * 0.20;
        const radius = 420 + hash2(tileX, tileZ, 60 + district) * 210;
        cx = Math.cos(angle) * radius;
        cz = Math.sin(angle) * radius;
      }

      const count = hero ? 52 : 24 + Math.floor(hash2(tileX, tileZ, 90 + district) * 7);
      for (let i = 0; i < count; i += 1) {
        const a = hash2(tileX, tileZ, 120 + district * 71 + i) * Math.PI * 2;
        const r = 7 + hash2(tileX, tileZ, 400 + district * 67 + i) * (hero ? 62 : 46);
        const footprint = 3.2 + hash2(tileX, tileZ, 700 + district * 59 + i) * (hero ? 5.4 : 4.0);
        const density = Math.max(0, 1 - r / (hero ? 68 : 52));
        const noise = hash2(tileX, tileZ, 1000 + district * 53 + i);
        let height = 6 + noise * 13 + density * (hero ? 24 : 10);
        if (hero && i === 0) height = 62;
        if (hero && i === 1) height = 45;

        dummy.position.set(
          cx + Math.cos(a) * r,
          GROUND_Y + 0.72 + height * 0.5,
          cz + Math.sin(a) * r,
        );
        dummy.rotation.set(0, a * 0.11, 0);
        const width = hero && i === 0 ? 5.6 : footprint;
        dummy.scale.set(width, height, width * (0.84 + hash2(tileX, tileZ, 1300 + i) * 0.28));
        dummy.updateMatrix();

        if (height > 28 && high < MAX_CITY_HIGH) this.cityHigh.setMatrixAt(high++, dummy.matrix);
        else if (height > 14 && mid < MAX_CITY_MID) this.cityMid.setMatrixAt(mid++, dummy.matrix);
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
        roughness: 0.52,
        metalness: 0.10,
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
    // Icosahedra are embedded deeply into the ground so only the irregular
    // upper facets remain visible. At horizon distance this produces connected
    // polygon ridges instead of repeated perfect triangles.
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: far,
        opacity: far ? 0.76 : 0.94,
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
      const radius = far ? 780 + (i % 7) * 33 : 525 + (i % 6) * 26;
      const width = far ? 120 + (i % 5) * 18 : 78 + (i % 5) * 14;
      const height = far ? 28 + (i % 6) * 3.2 : 22 + (i % 5) * 3.0;
      dummy.position.set(
        Math.cos(angle) * radius,
        GROUND_Y - height * 0.12,
        Math.sin(angle) * radius,
      );
      dummy.rotation.set((i % 3 - 1) * 0.06, -angle + i * 0.07, (i % 4 - 1.5) * 0.025);
      dummy.scale.set(width, height, width * (0.34 + (i % 3) * 0.06));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeCloudBank(name: string, color: number, count: number, shade: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: shade ? 0.46 : 0.92,
        depthWrite: false,
        depthTest: true,
        fog: true,
        toneMapped: false,
      }),
      count,
    );
    mesh.name = name;
    const dummy = new THREE.Object3D();
    let index = 0;
    const clusters = 5;
    const lobes = 18;
    for (let c = 0; c < clusters; c += 1) {
      const angle = c / clusters * Math.PI * 2 + 0.16;
      const radius = 270 + (c % 3) * 78;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const baseY = 17 + (c % 3) * 8;

      for (let l = 0; l < lobes; l += 1) {
        const seed = 2000 + c * 109 + l * 37;
        const a = hash2(c, l, seed) * Math.PI * 2;
        const tower = l >= 12;
        const ring = l === 0 ? 0 : 1.5 + hash2(l, c, seed + 1) * (tower ? 5.5 : 8.5);
        const size = (tower ? 8.5 : 10.5) + hash2(c, l, seed + 2) * (tower ? 5.8 : 7.5);
        const lift = tower ? 7 + hash2(c, l, seed + 3) * 10 : 0;
        dummy.position.set(
          cx + Math.cos(a) * ring,
          baseY + lift + (hash2(c, l, seed + 4) - 0.42) * size * 0.34 - (shade ? size * 0.17 : 0),
          cz + Math.sin(a) * ring * 0.68,
        );
        dummy.rotation.set(hash2(c, l, seed + 5) * 0.10, a, hash2(l, c, seed + 6) * 0.10);
        dummy.scale.set(size * 1.28, size * (shade ? 0.62 : 0.90), size);
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
    // V32 already applied 1.32. This additional factor yields roughly 1.7x
    // V31 visual size while leaving collision and simulation geometry unchanged.
    player.scale.multiplyScalar(1.28);
    player.userData.skyDancerV32PolishScale = true;
  }

  private finish(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }
}

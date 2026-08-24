import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";

const WORLD_SNAP = 420;
const GROUND_Y = -66.77;
const MAX_CITY_LOW = 144;
const MAX_CITY_MID = 96;
const MAX_CITY_HIGH = 36;

function hash2(x: number, z: number, salt = 0): number {
  let n = Math.imul(x + 0x7f4a7c15 + salt * 977, 0x1b873593) ^ Math.imul(z - salt * 631, 0x85ebca6b);
  n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12;
  return (n >>> 0) / 0xffffffff;
}

/**
 * Reference-match presentation layer for V32.
 *
 * V31 solved ground integrity and mobile-safe density. V32 spends only a small,
 * fixed draw-call budget on composition: layered distant ridges, clustered city
 * districts, rolling faceted hills, coherent cumulus banks, a deeper sky, and
 * extra hero-aircraft silhouette detail. Gameplay/collision data is untouched.
 */
export class SkyDancerReferenceWorldV32 {
  private readonly groundRoot = new THREE.Group();
  private readonly atmosphereRoot = new THREE.Group();
  private readonly rollingHillsA: THREE.InstancedMesh;
  private readonly rollingHillsB: THREE.InstancedMesh;
  private readonly cityLow: THREE.InstancedMesh;
  private readonly cityMid: THREE.InstancedMesh;
  private readonly cityHigh: THREE.InstancedMesh;
  private readonly ridgeNear: THREE.InstancedMesh;
  private readonly ridgeFar: THREE.InstancedMesh;
  private readonly cloudMain: THREE.InstancedMesh;
  private readonly cloudShade: THREE.InstancedMesh;
  private readonly skyDome: THREE.Mesh;
  private readonly referenceFog = new THREE.Fog(0x86b7cd, 760, 1760);
  private tileX = Number.NaN;
  private tileZ = Number.NaN;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.groundRoot.name = "sky-dancer-v32-reference-ground";
    this.atmosphereRoot.name = "sky-dancer-v32-reference-atmosphere";

    this.rollingHillsA = this.makeRollingHills("sky-dancer-v32-rolling-hills-a", 0x4e7c45, 40);
    this.rollingHillsB = this.makeRollingHills("sky-dancer-v32-rolling-hills-b", 0x668f50, 40);
    this.cityLow = this.makeCityMesh("sky-dancer-v32-city-low", 0x8ea3aa, MAX_CITY_LOW);
    this.cityMid = this.makeCityMesh("sky-dancer-v32-city-mid", 0xa4b4ba, MAX_CITY_MID);
    this.cityHigh = this.makeCityMesh("sky-dancer-v32-city-high", 0xb9c5c9, MAX_CITY_HIGH);
    this.groundRoot.add(this.rollingHillsA, this.rollingHillsB, this.cityLow, this.cityMid, this.cityHigh);

    this.ridgeNear = this.makeRidge("sky-dancer-v32-ridge-near", 0x547b72, 28, 0.94);
    this.ridgeFar = this.makeRidge("sky-dancer-v32-ridge-far", 0x73949a, 34, 0.78);
    this.cloudMain = this.makeCloudMesh("sky-dancer-v32-hero-clouds", 0xe9f4f8, 84, 0.95, false);
    this.cloudShade = this.makeCloudMesh("sky-dancer-v32-hero-cloud-shade", 0xb8d2dd, 84, 0.72, true);
    this.skyDome = this.makeSkyDome();
    this.atmosphereRoot.add(this.skyDome, this.ridgeFar, this.ridgeNear, this.cloudShade, this.cloudMain);

    runtime.scene.add(this.groundRoot, this.atmosphereRoot);
    this.installHeroAircraftDetail();
    this.hideLegacyComposition();
    runtime.camera.far = Math.max(runtime.camera.far, 1850);
    runtime.camera.updateProjectionMatrix();
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.restoreOwnPresentation();
    this.hideLegacyComposition();
    this.updateEnemyReadability(snapshot);

    const nextTileX = Math.floor(snapshot.x / WORLD_SNAP);
    const nextTileZ = Math.floor(snapshot.z / WORLD_SNAP);
    if (nextTileX !== this.tileX || nextTileZ !== this.tileZ) {
      this.tileX = nextTileX;
      this.tileZ = nextTileZ;
      this.groundRoot.position.set(nextTileX * WORLD_SNAP, 0, nextTileZ * WORLD_SNAP);
      this.rebuildGround(nextTileX, nextTileZ);
    }

    this.atmosphereRoot.position.set(snapshot.x, 0, snapshot.z);
    this.skyDome.position.y = this.runtime.camera.position.y;
  }

  private restoreOwnPresentation(): void {
    this.groundRoot.visible = true;
    this.atmosphereRoot.visible = true;
    this.skyDome.visible = true;
    this.ridgeNear.visible = true;
    this.ridgeFar.visible = true;
    this.cloudMain.visible = true;
    this.cloudShade.visible = true;
    if (this.runtime.scene.fog !== this.referenceFog) this.runtime.scene.fog = this.referenceFog;
  }

  private hideLegacyComposition(): void {
    const hideNames = [
      "sky-dancer-v30-mountain-belt",
      "sky-dancer-v24-horizon-silhouettes",
      "sky-dancer-v31-settlement-buildings",
      "sky-dancer-v31-landmark-towers",
      "sky-dancer-v31-low-clouds",
      "sky-dancer-v31-mid-clouds",
      "sky-dancer-v24-far-cloud-layer",
      "sky-dancer-v24-sky-dome",
      "sky-dancer-v30-sky",
    ];
    for (const name of hideNames) {
      const object = this.runtime.scene.getObjectByName(name);
      if (object) object.visible = false;
    }
  }

  private updateEnemyReadability(snapshot: CartArenaSessionSnapshot): void {
    for (const enemy of snapshot.enemies) {
      if (!enemy.alive) continue;
      const group = this.runtime.enemyGroups.get(enemy.id);
      if (!group || group.userData.skyDancerV32ScaleApplied === true) continue;
      group.scale.multiplyScalar(enemy.kind === "boss" ? 1.1 : 1.06);
      group.userData.skyDancerV32ScaleApplied = true;
    }
  }

  private rebuildGround(tileX: number, tileZ: number): void {
    const dummy = new THREE.Object3D();
    let hillA = 0;
    let hillB = 0;
    let low = 0;
    let mid = 0;
    let high = 0;

    for (let index = 0; index < 76; index += 1) {
      const angle = hash2(tileX, tileZ, 10 + index) * Math.PI * 2;
      const radius = 82 + hash2(tileX, tileZ, 110 + index) * 430;
      const width = 20 + hash2(tileX, tileZ, 210 + index) * 44;
      const height = 3.5 + hash2(tileX, tileZ, 310 + index) * 8.5;
      dummy.position.set(Math.cos(angle) * radius, GROUND_Y + height * 0.44, Math.sin(angle) * radius);
      dummy.rotation.set(0, angle + hash2(tileX, tileZ, 410 + index), 0);
      dummy.scale.set(width, height, width * (0.72 + hash2(tileX, tileZ, 510 + index) * 0.5));
      dummy.updateMatrix();
      if (index % 2 === 0) this.rollingHillsA.setMatrixAt(hillA++, dummy.matrix);
      else this.rollingHillsB.setMatrixAt(hillB++, dummy.matrix);
    }

    const districtCount = 6;
    for (let district = 0; district < districtCount; district += 1) {
      const angle = district / districtCount * Math.PI * 2 + hash2(tileX, tileZ, 700 + district) * 0.35;
      const radius = 180 + hash2(tileX, tileZ, 760 + district) * 330;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const hero = district === Math.floor(hash2(tileX, tileZ, 820) * districtCount);
      const buildingCount = hero ? 32 : 16 + Math.floor(hash2(tileX, tileZ, 840 + district) * 8);

      for (let i = 0; i < buildingCount; i += 1) {
        const a = hash2(tileX, tileZ, 900 + district * 53 + i) * Math.PI * 2;
        const r = 10 + hash2(tileX, tileZ, 1200 + district * 47 + i) * (hero ? 58 : 38);
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        const footprint = 3.5 + hash2(tileX, tileZ, 1500 + district * 41 + i) * 5.5;
        const heightNoise = hash2(tileX, tileZ, 1800 + district * 37 + i);
        const coreBoost = hero ? Math.max(0, 1 - r / 62) : 0;
        const height = 5 + heightNoise * 12 + coreBoost * (18 + heightNoise * 26);
        dummy.position.set(x, GROUND_Y + 0.7 + height * 0.5, z);
        dummy.rotation.set(0, a * 0.18, 0);
        dummy.scale.set(footprint, height, footprint * (0.82 + hash2(tileX, tileZ, 2100 + i) * 0.38));
        dummy.updateMatrix();

        if (height > 26 && high < MAX_CITY_HIGH) this.cityHigh.setMatrixAt(high++, dummy.matrix);
        else if (height > 13 && mid < MAX_CITY_MID) this.cityMid.setMatrixAt(mid++, dummy.matrix);
        else if (low < MAX_CITY_LOW) this.cityLow.setMatrixAt(low++, dummy.matrix);
      }
    }

    this.finish(this.rollingHillsA, hillA);
    this.finish(this.rollingHillsB, hillB);
    this.finish(this.cityLow, low);
    this.finish(this.cityMid, mid);
    this.finish(this.cityHigh, high);
  }

  private makeRollingHills(name: string, color: number, maxCount: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshLambertMaterial({ color, flatShading: true, fog: true }),
      maxCount,
    );
    mesh.name = name;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeCityMesh(name: string, color: number, maxCount: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08, flatShading: true, fog: true }),
      maxCount,
    );
    mesh.name = name;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeRidge(name: string, color: number, count: number, opacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 7),
      new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, fog: true, toneMapped: false }),
      count,
    );
    mesh.name = name;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const angle = i / count * Math.PI * 2 + Math.sin(i * 1.71) * 0.05;
      const far = name.includes("far");
      const radius = far ? 720 + (i % 7) * 34 : 470 + (i % 6) * 26;
      const height = far ? 46 + (i % 8) * 5.5 : 26 + (i % 7) * 4.6;
      const width = far ? 92 + (i % 5) * 18 : 62 + (i % 5) * 13;
      dummy.position.set(Math.cos(angle) * radius, GROUND_Y + height * 0.5, Math.sin(angle) * radius);
      dummy.rotation.set(0, -angle + i * 0.07, 0);
      dummy.scale.set(width, height, width * (0.48 + (i % 3) * 0.08));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeCloudMesh(name: string, color: number, count: number, opacity: number, shade: boolean): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: true, fog: true, toneMapped: false }),
      count,
    );
    mesh.name = name;
    const dummy = new THREE.Object3D();
    let index = 0;
    const clusters = 7;
    const lobes = 12;
    for (let c = 0; c < clusters; c += 1) {
      const angle = c / clusters * Math.PI * 2 + (c % 2 ? 0.12 : -0.08);
      const radius = 245 + (c % 4) * 62;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const cy = 9 + (c % 3) * 8;
      for (let l = 0; l < lobes; l += 1) {
        const seed = c * 97 + l * 31;
        const a = hash2(c, l, seed) * Math.PI * 2;
        const ring = l === 0 ? 0 : 3 + hash2(l, c, seed + 1) * 18;
        const size = 8 + hash2(c, l, seed + 2) * 9;
        dummy.position.set(
          cx + Math.cos(a) * ring,
          cy + (hash2(c, l, seed + 3) - 0.35) * size * 0.72 - (shade ? size * 0.16 : 0),
          cz + Math.sin(a) * ring * 0.68,
        );
        dummy.rotation.set(hash2(c, l, seed + 4) * 0.22, a, hash2(l, c, seed + 5) * 0.18);
        dummy.scale.set(size * 1.18, size * (shade ? 0.72 : 1.0), size);
        dummy.updateMatrix();
        mesh.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private makeSkyDome(): THREE.Mesh {
    const material = new THREE.ShaderMaterial({
      name: "sky-dancer-v32-sky-material",
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 zenith = vec3(0.035, 0.245, 0.485);
          vec3 midSky = vec3(0.105, 0.445, 0.705);
          vec3 horizon = vec3(0.565, 0.780, 0.875);
          float upper = smoothstep(0.02, 0.88, h);
          vec3 sky = mix(horizon, midSky, smoothstep(-0.14, 0.38, h));
          sky = mix(sky, zenith, upper);
          float haze = pow(max(0.0, 1.0 - abs(h + 0.03)), 9.0);
          sky += vec3(0.07, 0.085, 0.085) * haze;
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1150, 28, 14), material);
    dome.name = "sky-dancer-v32-sky-dome";
    dome.renderOrder = -3000;
    dome.frustumCulled = false;
    return dome;
  }

  private installHeroAircraftDetail(): void {
    const player = this.runtime.playerVisual;
    if (player.userData.skyDancerV32HeroDetail === true) return;
    player.scale.multiplyScalar(1.18);
    player.userData.skyDancerV32HeroDetail = true;

    const root = new THREE.Group();
    root.name = "sky-dancer-v32-player-detail";
    const dark = new THREE.MeshStandardMaterial({ color: 0x17384e, roughness: 0.34, metalness: 0.48, flatShading: true });
    const blue = new THREE.MeshStandardMaterial({ color: 0x1a77b7, roughness: 0.36, metalness: 0.24, flatShading: true });
    const rim = new THREE.MeshBasicMaterial({ color: 0x8beaff, toneMapped: false });

    for (const x of [-0.43, 0.43]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.34, 0.92, 8), dark);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(x, 0.95, -1.72);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 5, 10), rim);
      ring.position.set(x, 0.95, -2.17);
      root.add(nacelle, ring);
    }

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.16), blue);
      rail.position.set(side * 1.45, 0.99, -0.47);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.74, 0.62), dark);
      fin.position.set(side * 0.62, 1.42, -1.42);
      fin.rotation.z = side * -0.09;
      root.add(rail, fin);
    }

    const canopySpine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.92), dark);
    canopySpine.position.set(0, 1.45, 0.54);
    root.add(canopySpine);
    player.add(root);
  }

  private finish(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }
}

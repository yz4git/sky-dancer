import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";

interface CloudRuntime {
  scene: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
}

type CloudLayerConfig = {
  name: string;
  clusters: number;
  lobes: number;
  radiusMin: number;
  radiusMax: number;
  yMin: number;
  yMax: number;
  sizeMin: number;
  sizeMax: number;
  opacity: number;
  solid: boolean;
};

const WORLD_SNAP = 420;
const LEGACY_CLOUD_NAMES = [
  "sky-dancer-base-cloud-deck",
  "sky-dancer-v25-horizon-cloud-banks",
  "sky-dancer-v28-layered-cloud-banks",
  "sky-dancer-v29-reference-cloud-bank",
] as const;

function rand(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Texture-free V31 cumulus system.
 *
 * Old cloud passes are suppressed by both their known names and a conservative
 * name-based sweep. Replacement clusters are distributed evenly around each
 * flight chunk with slight seeded jitter, guaranteeing useful forward/side cloud
 * mass instead of occasionally rolling an empty camera hemisphere.
 */
export class SkyDancerCloudQualityV31 {
  private readonly root = new THREE.Group();
  private readonly layers: THREE.InstancedMesh[] = [];
  private snapX = Number.NaN;
  private snapZ = Number.NaN;

  constructor(private readonly runtime: CloudRuntime) {
    this.root.name = "sky-dancer-v31-cloud-system";
    const configs: CloudLayerConfig[] = [
      {
        name: "sky-dancer-v31-low-clouds",
        clusters: 12,
        lobes: 10,
        radiusMin: 250,
        radiusMax: 500,
        yMin: -38,
        yMax: -23,
        sizeMin: 4.0,
        sizeMax: 6.8,
        opacity: 1,
        solid: true,
      },
      {
        name: "sky-dancer-v31-mid-clouds",
        clusters: 16,
        lobes: 12,
        radiusMin: 390,
        radiusMax: 680,
        yMin: -20,
        yMax: 4,
        sizeMin: 5.2,
        sizeMax: 9.2,
        opacity: 0.98,
        solid: true,
      },
      {
        name: "sky-dancer-v31-horizon-clouds",
        clusters: 20,
        lobes: 14,
        radiusMin: 590,
        radiusMax: 900,
        yMin: -8,
        yMax: 22,
        sizeMin: 7.0,
        sizeMax: 12.0,
        opacity: 0.90,
        solid: false,
      },
    ];

    configs.forEach((config, index) => {
      const layer = this.buildLayer(config, index * 10000 + 71);
      this.layers.push(layer);
      this.root.add(layer);
    });
    runtime.scene.add(this.root);
    if (runtime.camera) {
      runtime.camera.far = Math.max(runtime.camera.far, 1250);
      runtime.camera.updateProjectionMatrix();
    }
    this.hideLegacyClouds();
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.hideLegacyClouds();
    const x = Math.floor(snapshot.x / WORLD_SNAP) * WORLD_SNAP;
    const z = Math.floor(snapshot.z / WORLD_SNAP) * WORLD_SNAP;
    if (x === this.snapX && z === this.snapZ) return;
    this.snapX = x;
    this.snapZ = z;
    this.root.position.set(x, 0, z);
  }

  private hideLegacyClouds(): void {
    for (const name of LEGACY_CLOUD_NAMES) {
      const cloud = this.runtime.scene.getObjectByName(name);
      if (cloud) cloud.visible = false;
    }

    this.runtime.scene.traverse((object) => {
      if (object === this.root || this.layers.includes(object as THREE.InstancedMesh)) return;
      const name = object.name.toLowerCase();
      if (name.includes("cloud") && !name.includes("v31")) {
        object.visible = false;
        object.userData.skyDancerV31LegacyCloudHidden = true;
      }
    });

    for (const child of this.runtime.scene.children) {
      if (!(child instanceof THREE.InstancedMesh) || this.layers.includes(child)) continue;
      const material = child.material;
      if (child.name) continue;
      if (child.geometry.type !== "DodecahedronGeometry") continue;
      if (!(material instanceof THREE.MeshLambertMaterial)) continue;
      if (!material.transparent || material.opacity < 0.35 || material.opacity > 0.5) continue;
      child.visible = false;
      child.userData.skyDancerV31LegacyCloudHidden = true;
    }
  }

  private buildLayer(config: CloudLayerConfig, seedOffset: number): THREE.InstancedMesh {
    const count = config.clusters * config.lobes;
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      vertexColors: true,
      flatShading: true,
      transparent: !config.solid,
      opacity: config.opacity,
      depthWrite: config.solid,
      depthTest: true,
      fog: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = config.name;
    mesh.frustumCulled = false;

    const light = new THREE.Color(0xf8fcff);
    const mid = new THREE.Color(0xdcecf3);
    const shade = new THREE.Color(0x9fbfce);
    const sample = new THREE.Color();
    const dummy = new THREE.Object3D();
    let index = 0;

    for (let cluster = 0; cluster < config.clusters; cluster += 1) {
      const baseSeed = seedOffset + cluster * 97;
      const evenAngle = cluster / config.clusters * Math.PI * 2;
      const angle = evenAngle + (rand(baseSeed + 1) - 0.5) * 0.22;
      const radius = THREE.MathUtils.lerp(config.radiusMin, config.radiusMax, rand(baseSeed + 2));
      const centerX = Math.cos(angle) * radius;
      const centerZ = Math.sin(angle) * radius;
      const centerY = THREE.MathUtils.lerp(config.yMin, config.yMax, rand(baseSeed + 3));
      const spread = THREE.MathUtils.lerp(7, 13, rand(baseSeed + 4));

      for (let lobe = 0; lobe < config.lobes; lobe += 1) {
        const seed = baseSeed + lobe * 17;
        const lobeAngle = rand(seed + 5) * Math.PI * 2;
        const ring = lobe === 0 ? 0 : 1.8 + rand(seed + 6) * spread;
        const size = THREE.MathUtils.lerp(config.sizeMin, config.sizeMax, rand(seed + 7));
        const verticalBias = lobe === 0
          ? size * 0.22
          : (rand(seed + 8) - 0.34) * size * 0.92 + (lobe % 4 === 0 ? size * 0.42 : 0);

        dummy.position.set(
          centerX + Math.cos(lobeAngle) * ring,
          centerY + verticalBias,
          centerZ + Math.sin(lobeAngle) * ring * 0.82,
        );
        dummy.rotation.set(rand(seed + 9) * 0.32, rand(seed + 10) * Math.PI, rand(seed + 11) * 0.26);
        dummy.scale.set(
          size * THREE.MathUtils.lerp(0.94, 1.18, rand(seed + 12)),
          size * THREE.MathUtils.lerp(0.84, 1.20, rand(seed + 13)),
          size * THREE.MathUtils.lerp(0.94, 1.20, rand(seed + 14)),
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);

        const heightTone = THREE.MathUtils.clamp(0.46 + verticalBias / Math.max(1, size) * 0.38 + rand(seed + 15) * 0.2, 0, 1);
        sample.lerpColors(shade, mid, THREE.MathUtils.clamp(heightTone * 1.35, 0, 1));
        sample.lerp(light, Math.max(0, heightTone - 0.50) * 1.30);
        mesh.setColorAt(index, sample);
        index += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
}

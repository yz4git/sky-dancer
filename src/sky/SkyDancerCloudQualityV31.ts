import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";

interface CloudRuntime {
  scene: THREE.Scene;
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
};

const WORLD_SNAP = 420;
const LEGACY_CLOUD_NAMES = [
  "sky-dancer-base-cloud-deck",
  "sky-dancer-v28-layered-cloud-banks",
  "sky-dancer-v29-reference-cloud-bank",
] as const;

function rand(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Texture-free volumetric-style cloud replacement for V31.
 * Each visible cloud is a cluster of faceted icosahedron lobes. Three depth
 * layers produce parallax and horizon mass while keeping every layer to one
 * InstancedMesh draw call on mobile.
 */
export class SkyDancerCloudQualityV31 {
  private readonly root = new THREE.Group();
  private readonly layers: THREE.InstancedMesh[] = [];
  private snapX = Number.NaN;
  private snapZ = Number.NaN;
  private legacyHidden = false;

  constructor(private readonly runtime: CloudRuntime) {
    this.root.name = "sky-dancer-v31-cloud-system";
    const configs: CloudLayerConfig[] = [
      {
        name: "sky-dancer-v31-low-clouds",
        clusters: 18,
        lobes: 7,
        radiusMin: 120,
        radiusMax: 470,
        yMin: -34,
        yMax: -20,
        sizeMin: 5.5,
        sizeMax: 10.5,
        opacity: 0.38,
      },
      {
        name: "sky-dancer-v31-mid-clouds",
        clusters: 15,
        lobes: 8,
        radiusMin: 260,
        radiusMax: 670,
        yMin: -17,
        yMax: -5,
        sizeMin: 7,
        sizeMax: 13,
        opacity: 0.48,
      },
      {
        name: "sky-dancer-v31-horizon-clouds",
        clusters: 20,
        lobes: 9,
        radiusMin: 560,
        radiusMax: 930,
        yMin: -8,
        yMax: 12,
        sizeMin: 10,
        sizeMax: 19,
        opacity: 0.55,
      },
    ];

    configs.forEach((config, index) => {
      const layer = this.buildLayer(config, index * 10000 + 71);
      this.layers.push(layer);
      this.root.add(layer);
    });
    runtime.scene.add(this.root);
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
    this.legacyHidden = true;
  }

  private buildLayer(config: CloudLayerConfig, seedOffset: number): THREE.InstancedMesh {
    const count = config.clusters * config.lobes;
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      vertexColors: true,
      flatShading: true,
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
      depthTest: true,
      fog: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = config.name;
    mesh.frustumCulled = false;

    const light = new THREE.Color(0xf8fcff);
    const mid = new THREE.Color(0xdcecf3);
    const shade = new THREE.Color(0xb8d1de);
    const sample = new THREE.Color();
    const dummy = new THREE.Object3D();
    let index = 0;

    for (let cluster = 0; cluster < config.clusters; cluster += 1) {
      const baseSeed = seedOffset + cluster * 97;
      const angle = rand(baseSeed + 1) * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(config.radiusMin, config.radiusMax, rand(baseSeed + 2));
      const centerX = Math.cos(angle) * radius;
      const centerZ = Math.sin(angle) * radius;
      const centerY = THREE.MathUtils.lerp(config.yMin, config.yMax, rand(baseSeed + 3));
      const clusterStretch = THREE.MathUtils.lerp(1.1, 2.4, rand(baseSeed + 4));

      for (let lobe = 0; lobe < config.lobes; lobe += 1) {
        const seed = baseSeed + lobe * 17;
        const lobeAngle = rand(seed + 5) * Math.PI * 2;
        const lobeRadius = (lobe === 0 ? 0 : 4 + rand(seed + 6) * 18) * clusterStretch;
        const size = THREE.MathUtils.lerp(config.sizeMin, config.sizeMax, rand(seed + 7));
        const vertical = (rand(seed + 8) - 0.46) * size * 0.72;
        dummy.position.set(
          centerX + Math.cos(lobeAngle) * lobeRadius,
          centerY + vertical,
          centerZ + Math.sin(lobeAngle) * lobeRadius * 0.72,
        );
        dummy.rotation.set(rand(seed + 9) * 0.6, rand(seed + 10) * Math.PI, rand(seed + 11) * 0.45);
        dummy.scale.set(
          size * THREE.MathUtils.lerp(1.05, 1.85, rand(seed + 12)),
          size * THREE.MathUtils.lerp(0.42, 0.82, rand(seed + 13)),
          size * THREE.MathUtils.lerp(0.85, 1.5, rand(seed + 14)),
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);

        const heightTone = THREE.MathUtils.clamp(0.25 + (vertical / Math.max(1, size)) * 0.7 + rand(seed + 15) * 0.35, 0, 1);
        sample.lerpColors(shade, mid, Math.min(1, heightTone * 1.35));
        sample.lerp(light, Math.max(0, heightTone - 0.48) * 1.35);
        mesh.setColorAt(index, sample);
        index += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
}

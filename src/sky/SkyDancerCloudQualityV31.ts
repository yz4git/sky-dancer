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
 * Texture-free V31 cumulus system. Every visible cloud is built from tightly
 * overlapping faceted lobes instead of one stretched translucent primitive.
 * Three instanced layers preserve mobile draw-call cost while producing near,
 * middle and horizon depth at the 300 m flight level.
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
        clusters: 22,
        lobes: 9,
        radiusMin: 170,
        radiusMax: 520,
        yMin: -39,
        yMax: -25,
        sizeMin: 3.8,
        sizeMax: 6.8,
        opacity: 1,
        solid: true,
      },
      {
        name: "sky-dancer-v31-mid-clouds",
        clusters: 18,
        lobes: 9,
        radiusMin: 330,
        radiusMax: 750,
        yMin: -21,
        yMax: -8,
        sizeMin: 4.8,
        sizeMax: 8.5,
        opacity: 0.96,
        solid: true,
      },
      {
        name: "sky-dancer-v31-horizon-clouds",
        clusters: 22,
        lobes: 10,
        radiusMin: 650,
        radiusMax: 980,
        yMin: -10,
        yMax: 10,
        sizeMin: 6.5,
        sizeMax: 11.5,
        opacity: 0.82,
        solid: false,
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

    const light = new THREE.Color(0xf7fbff);
    const mid = new THREE.Color(0xdcebf2);
    const shade = new THREE.Color(0xa9c6d3);
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
      const clusterStretch = THREE.MathUtils.lerp(0.82, 1.42, rand(baseSeed + 4));

      for (let lobe = 0; lobe < config.lobes; lobe += 1) {
        const seed = baseSeed + lobe * 17;
        const lobeAngle = rand(seed + 5) * Math.PI * 2;
        const ring = lobe === 0 ? 0 : 2 + rand(seed + 6) * 7.5;
        const size = THREE.MathUtils.lerp(config.sizeMin, config.sizeMax, rand(seed + 7));
        const verticalBias = lobe === 0 ? size * 0.22 : (rand(seed + 8) - 0.38) * size * 0.70;
        dummy.position.set(
          centerX + Math.cos(lobeAngle) * ring * clusterStretch,
          centerY + verticalBias,
          centerZ + Math.sin(lobeAngle) * ring * clusterStretch * 0.84,
        );
        dummy.rotation.set(rand(seed + 9) * 0.42, rand(seed + 10) * Math.PI, rand(seed + 11) * 0.30);
        dummy.scale.set(
          size * THREE.MathUtils.lerp(0.95, 1.42, rand(seed + 12)),
          size * THREE.MathUtils.lerp(0.72, 1.16, rand(seed + 13)),
          size * THREE.MathUtils.lerp(0.92, 1.34, rand(seed + 14)),
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);

        const heightTone = THREE.MathUtils.clamp(0.48 + verticalBias / Math.max(1, size) * 0.5 + rand(seed + 15) * 0.18, 0, 1);
        sample.lerpColors(shade, mid, THREE.MathUtils.clamp(heightTone * 1.45, 0, 1));
        sample.lerp(light, Math.max(0, heightTone - 0.48) * 1.45);
        mesh.setColorAt(index, sample);
        index += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
}

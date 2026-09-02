import * as THREE from "three";
import {
  skyDancerArcadeStageById,
  type SkyDancerArcadeStageDefinition,
  type SkyDancerArcadeStageId,
} from "./arcade/SkyDancerArcadeData";
import {
  createArcadeCloudMaterial,
  createArcadeFacadeMaterial,
  createArcadeSky,
  referenceAtmosphere,
} from "./arcade/SkyDancerArcadeReferenceMaterials";
import type { SkyDancerSkyRaidAct } from "./SkyDancerSkyRaidRules";

const GROUND_Y = -66.3;
const RECENTER_DISTANCE = 230;

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 91.731 + salt * 47.117) * 43758.5453;
  return x - Math.floor(x);
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.InstancedMesh) && !(child instanceof THREE.Line)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material?.dispose());
  });
}

function basicMaterial(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.64,
    metalness: 0.22,
    flatShading: true,
    emissive: emissive || 0x000000,
    emissiveIntensity: emissive ? 0.38 : 0,
  });
}

function addCarrier(root: THREE.Group, stage: SkyDancerArcadeStageDefinition, x: number, y: number, z: number, scale = 1): void {
  const carrier = new THREE.Group();
  carrier.name = "sky-raid-arcade-carrier";
  const hull = new THREE.Mesh(new THREE.BoxGeometry(12 * scale, 4 * scale, 54 * scale), basicMaterial(stage.palette.primary));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(38 * scale, 1.1 * scale, 18 * scale), basicMaterial(stage.palette.secondary));
  const tower = new THREE.Mesh(new THREE.BoxGeometry(5 * scale, 10 * scale, 8 * scale), basicMaterial(stage.palette.secondary, stage.palette.accent));
  const glow = new THREE.Mesh(new THREE.BoxGeometry(2 * scale, 1.2 * scale, 18 * scale), new THREE.MeshBasicMaterial({ color: stage.palette.accent, transparent: true, opacity: 0.62, depthWrite: false }));
  hull.position.y = 0;
  deck.position.set(0, 1.2 * scale, -3 * scale);
  tower.position.set(5 * scale, 6 * scale, 8 * scale);
  glow.position.set(-8 * scale, 2.2 * scale, -9 * scale);
  carrier.add(hull, deck, tower, glow);
  carrier.position.set(x, y, z);
  root.add(carrier);
}

function addCloudField(root: THREE.Group, stage: SkyDancerArcadeStageDefinition, count: number, storm = false): void {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const material = createArcadeCloudMaterial(stage);
  const clouds = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = seeded(index, 2) * Math.PI * 2;
    const radius = 55 + seeded(index, 3) * 300;
    const size = 5 + seeded(index, 4) * (storm ? 15 : 11);
    const y = GROUND_Y + 32 + seeded(index, 5) * (storm ? 80 : 54);
    dummy.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    dummy.rotation.set(seeded(index, 6) * 0.2, seeded(index, 7) * Math.PI, seeded(index, 8) * 0.14);
    dummy.scale.set(size * (1.3 + seeded(index, 9) * 1.1), size * (0.35 + seeded(index, 10) * 0.38), size);
    dummy.updateMatrix();
    clouds.setMatrixAt(index, dummy.matrix);
  }
  clouds.instanceMatrix.needsUpdate = true;
  clouds.frustumCulled = false;
  clouds.name = "sky-raid-arcade-cloud-field";
  root.add(clouds);
}

function addCity(root: THREE.Group, stage: SkyDancerArcadeStageDefinition): void {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const buildings = new THREE.InstancedMesh(geometry, createArcadeFacadeMaterial(false), 84);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < 84; index += 1) {
    const angle = seeded(index, 20) * Math.PI * 2;
    const radius = 48 + seeded(index, 21) * 285;
    const height = 20 + seeded(index, 22) * 72;
    const width = 6 + seeded(index, 23) * 12;
    const depth = 6 + seeded(index, 24) * 14;
    dummy.position.set(Math.sin(angle) * radius, GROUND_Y + height * 0.5, Math.cos(angle) * radius);
    dummy.rotation.set(0, angle + seeded(index, 25) * 0.45, 0);
    dummy.scale.set(width, height, depth);
    dummy.updateMatrix();
    buildings.setMatrixAt(index, dummy.matrix);
    color.setHex(index % 5 === 0 ? stage.palette.secondary : stage.palette.primary).offsetHSL(0, 0, (seeded(index, 26) - 0.5) * 0.16);
    buildings.setColorAt(index, color);
  }
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  buildings.name = "sky-raid-arcade-city-facades";
  buildings.frustumCulled = false;
  root.add(buildings);
  addCloudField(root, stage, 36);
}

function addCanyon(root: THREE.Group, stage: SkyDancerArcadeStageDefinition): void {
  const rocks = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), basicMaterial(stage.palette.primary), 72);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < 72; index += 1) {
    const angle = seeded(index, 40) * Math.PI * 2;
    const radius = 70 + seeded(index, 41) * 285;
    const height = 28 + seeded(index, 42) * 72;
    const width = 10 + seeded(index, 43) * 24;
    dummy.position.set(Math.sin(angle) * radius, GROUND_Y + height * 0.5, Math.cos(angle) * radius);
    dummy.rotation.set(0, seeded(index, 44) * Math.PI, (seeded(index, 45) - 0.5) * 0.12);
    dummy.scale.set(width, height, width * (0.7 + seeded(index, 46) * 0.5));
    dummy.updateMatrix();
    rocks.setMatrixAt(index, dummy.matrix);
    color.setHex(index % 4 === 0 ? stage.palette.secondary : stage.palette.primary).offsetHSL(0, 0, (seeded(index, 47) - 0.5) * 0.18);
    rocks.setColorAt(index, color);
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.name = "sky-raid-arcade-canyon-masses";
  rocks.frustumCulled = false;
  root.add(rocks);
}

function addFleet(root: THREE.Group, stage: SkyDancerArcadeStageDefinition, storm: boolean): void {
  addCloudField(root, stage, storm ? 88 : 104, storm);
  addCarrier(root, stage, 0, -4, 105, storm ? 1.3 : 1.05);
  addCarrier(root, stage, -128, -18, -32, 0.66);
  addCarrier(root, stage, 142, 4, 38, 0.56);
  if (!storm) addCarrier(root, stage, 75, -22, -170, 0.48);
  if (storm) {
    const boltMaterial = new THREE.LineBasicMaterial({ color: stage.palette.accent, transparent: true, opacity: 0.82 });
    for (let index = 0; index < 8; index += 1) {
      const x = -180 + index * 52;
      const z = -125 + (index % 4) * 86;
      const points = [
        new THREE.Vector3(x, 58, z),
        new THREE.Vector3(x + 7, 34, z + 5),
        new THREE.Vector3(x - 4, 12, z + 11),
        new THREE.Vector3(x + 5, GROUND_Y + 18, z + 17),
      ];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), boltMaterial.clone());
      line.name = "sky-raid-arcade-lightning";
      root.add(line);
    }
  }
}

function addCitadel(root: THREE.Group, stage: SkyDancerArcadeStageDefinition): void {
  const spires = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), basicMaterial(stage.palette.primary, stage.palette.accent), 54);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < 54; index += 1) {
    const angle = seeded(index, 70) * Math.PI * 2;
    const radius = 54 + seeded(index, 71) * 270;
    const height = 18 + seeded(index, 72) * 55;
    const width = 4 + seeded(index, 73) * 8;
    dummy.position.set(Math.sin(angle) * radius, GROUND_Y + height * 0.58, Math.cos(angle) * radius);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(width, height, width);
    dummy.updateMatrix();
    spires.setMatrixAt(index, dummy.matrix);
    color.setHex(index % 3 === 0 ? stage.palette.secondary : stage.palette.primary);
    spires.setColorAt(index, color);
  }
  spires.instanceMatrix.needsUpdate = true;
  if (spires.instanceColor) spires.instanceColor.needsUpdate = true;
  spires.name = "sky-raid-arcade-prism-spires";
  spires.frustumCulled = false;
  root.add(spires);
  for (const radius of [54, 118, 198]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.42, 6, 64), new THREE.MeshBasicMaterial({ color: stage.palette.accent, transparent: true, opacity: 0.34, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = GROUND_Y + 2.2;
    root.add(ring);
  }
}

export class SkyDancerSkyRaidArcadeWorld {
  private readonly root = new THREE.Group();
  private readonly stageRoot = new THREE.Group();
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  private readonly fillLight = new THREE.HemisphereLight(0xcceeff, 0x172233, 0.85);
  private sky: THREE.Mesh | null = null;
  private stage: SkyDancerArcadeStageDefinition | null = null;
  private anchorX = Number.NaN;
  private anchorZ = Number.NaN;

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = "sky-raid-arcade-run-world";
    this.stageRoot.name = "sky-raid-arcade-run-stage";
    this.keyLight.name = "sky-raid-arcade-key";
    this.fillLight.name = "sky-raid-arcade-fill";
    this.keyLight.position.set(-80, 120, -60);
    this.root.add(this.stageRoot, this.keyLight, this.fillLight);
    this.scene.add(this.root);
  }

  update(actId: SkyDancerSkyRaidAct["id"], x: number, z: number, altitude: number, elapsed: number): void {
    if (!this.stage || this.stage.id !== actId) this.setStage(actId);
    if (!Number.isFinite(this.anchorX) || Math.hypot(x - this.anchorX, z - this.anchorZ) > RECENTER_DISTANCE) {
      this.anchorX = x;
      this.anchorZ = z;
      this.root.position.set(x, 0, z);
    }
    if (this.sky) this.sky.position.set(x - this.anchorX, altitude * 0.35, z - this.anchorZ);
    if (!this.stage) return;
    const atmosphere = referenceAtmosphere(this.stage);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(atmosphere.fog);
      this.scene.fog.near = this.stage.biome === "storm" ? 105 : 125;
      this.scene.fog.far = this.stage.biome === "cloud" ? 620 : 700;
    } else {
      this.scene.fog = new THREE.Fog(atmosphere.fog, 125, 700);
    }
    this.scene.background = atmosphere.horizon;
    this.keyLight.color.setHex(atmosphere.key);
    this.keyLight.intensity = atmosphere.keyIntensity;
    this.fillLight.color.copy(atmosphere.cloudLight);
    this.fillLight.groundColor.copy(atmosphere.cloudShadow);
    this.fillLight.intensity = atmosphere.ambient;
    this.stageRoot.traverse((object) => {
      if (object.name !== "sky-raid-arcade-lightning" || !(object instanceof THREE.Line)) return;
      const material = object.material as THREE.LineBasicMaterial;
      material.opacity = 0.18 + Math.pow(Math.max(0, Math.sin(elapsed * 9.3 + object.id)), 14) * 0.78;
    });
  }

  dispose(): void {
    disposeObject(this.root);
    this.root.removeFromParent();
  }

  private setStage(actId: SkyDancerSkyRaidAct["id"]): void {
    while (this.stageRoot.children.length > 0) {
      const child = this.stageRoot.children.pop();
      if (!child) break;
      disposeObject(child);
    }
    if (this.sky) {
      this.sky.removeFromParent();
      disposeObject(this.sky);
      this.sky = null;
    }
    this.stage = skyDancerArcadeStageById(actId as SkyDancerArcadeStageId);
    this.sky = createArcadeSky(this.stage);
    this.sky.name = "sky-raid-arcade-product-sky";
    this.root.add(this.sky);
    if (this.stage.biome === "city") addCity(this.stageRoot, this.stage);
    else if (this.stage.biome === "canyon") addCanyon(this.stageRoot, this.stage);
    else if (this.stage.biome === "cloud") addFleet(this.stageRoot, this.stage, false);
    else if (this.stage.biome === "storm") addFleet(this.stageRoot, this.stage, true);
    else addCitadel(this.stageRoot, this.stage);
    this.root.userData.skyRaidArcadeStage = this.stage.id;
  }
}

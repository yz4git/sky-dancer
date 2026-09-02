import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { getLatestSkyDancerCampaignSnapshotV49 } from "../SkyDancerCombatChoreographyV46";
import type { SkyDancerMissionWorldStyleV49 } from "../SkyDancerCampaignV49";

interface WorldZone {
  root: THREE.Group;
  landmarkCount: number;
}

const ANCHOR_RESET_DISTANCE = 178;
const WORLD_STYLES: readonly SkyDancerMissionWorldStyleV49[] = ["city", "clouds", "mountains", "facility", "storm", "citadel"];

function skyRaidWorldStyle(): SkyDancerMissionWorldStyleV49 | null {
  if (typeof document === "undefined" || document.documentElement.dataset.skyDancerMode !== "sky-raid") return null;
  const style = document.documentElement.dataset.skyRaidWorldStyle;
  return style === "mountains" || style === "clouds" || style === "storm" || style === "citadel" ? style : "city";
}

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function material(color: number, roughness = 0.82): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04, flatShading: true });
}

export class SkyDancerV47WorldReconstructionPass {
  private readonly routeRoot = new THREE.Group();
  private readonly zones = new Map<SkyDancerMissionWorldStyleV49, WorldZone>();
  private anchorX = Number.NaN;
  private anchorZ = Number.NaN;
  private activeStyle: SkyDancerMissionWorldStyleV49 = "city";
  private anchorResets = 0;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.routeRoot.name = "sky-dancer-v47-route-reconstruction";
    this.routeRoot.renderOrder = -2;
    runtime.scene.add(this.routeRoot);
    this.zones.set("city", this.buildCityCorridor());
    this.zones.set("clouds", this.buildCloudKnife());
    this.zones.set("mountains", this.buildIronValley());
    this.zones.set("facility", this.buildHaloFoundry());
    this.zones.set("storm", this.buildStormCrown());
    this.zones.set("citadel", this.buildLastLightCitadel());
    for (const [style, zone] of this.zones) {
      zone.root.visible = style === this.activeStyle;
      this.routeRoot.add(zone.root);
    }
    runtime.scene.userData.skyDancerV47WorldReconstruction = true;
    runtime.scene.userData.skyDancerV47Landmarks = [...this.zones.values()].reduce((sum, zone) => sum + zone.landmarkCount, 0);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    const campaign = getLatestSkyDancerCampaignSnapshotV49();
    const style = skyRaidWorldStyle() ?? campaign?.worldStyle ?? "city";
    if (style !== this.activeStyle) {
      this.activeStyle = style;
      for (const [candidate, zone] of this.zones) zone.root.visible = candidate === style;
      this.resetAnchor(snapshot);
    }

    const distanceFromAnchor = Number.isFinite(this.anchorX)
      ? Math.hypot(snapshot.x - this.anchorX, snapshot.z - this.anchorZ)
      : Number.POSITIVE_INFINITY;
    if (distanceFromAnchor > ANCHOR_RESET_DISTANCE) this.resetAnchor(snapshot);
    this.animateWorld(style, snapshot);
    this.installAuditBridge();
  }

  private resetAnchor(snapshot: CartArenaSessionSnapshot): void {
    this.anchorX = snapshot.x;
    this.anchorZ = snapshot.z;
    this.routeRoot.position.set(snapshot.x, 0, snapshot.z);
    this.routeRoot.rotation.y = snapshot.heading;
    this.anchorResets += 1;
  }

  private animateWorld(style: SkyDancerMissionWorldStyleV49, snapshot: CartArenaSessionSnapshot): void {
    const elapsed = performance.now() * 0.001;
    const zone = this.zones.get(style)?.root;
    if (!zone) return;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.8);
    zone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name.includes("beacon")) {
        const meshMaterial = object.material as THREE.MeshBasicMaterial;
        meshMaterial.opacity = 0.36 + pulse * 0.42;
      }
    });
    const speedLean = THREE.MathUtils.clamp(Math.abs(snapshot.speed ?? 0) / 70, 0, 1);
    this.routeRoot.position.y = -speedLean * 0.35;
  }

  private buildCityCorridor(): WorldZone {
    const root = new THREE.Group();
    root.name = "sky-dancer-v47-city-corridor";
    const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
    const buildings = new THREE.InstancedMesh(buildingGeometry, material(0x71889a, 0.88), 72);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 72; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2);
      const height = 20 + seeded(index, 2) * 34;
      const width = 5 + seeded(index, 3) * 8;
      const depth = 6 + seeded(index, 4) * 9;
      dummy.position.set(side * (28 + seeded(index, 5) * 54), -61 + height * 0.5, 18 + lane * 7.1);
      dummy.rotation.y = (seeded(index, 6) - 0.5) * 0.28;
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      buildings.setMatrixAt(index, dummy.matrix);
    }
    buildings.instanceMatrix.needsUpdate = true;
    buildings.name = "sky-dancer-v47-city-towers";
    buildings.frustumCulled = false;
    root.add(buildings);

    const landmarkMat = material(0x496779, 0.62);
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 10.5, 62, 8), landmarkMat);
      tower.position.set(side * 48, -31, 128);
      tower.name = "sky-dancer-v47-city-landmark";
      const crown = new THREE.Mesh(
        new THREE.TorusGeometry(9.2, 0.7, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0x8fe7ff, transparent: true, opacity: 0.46, depthWrite: false, toneMapped: false }),
      );
      crown.rotation.x = Math.PI / 2;
      crown.position.set(side * 48, -3.5, 128);
      crown.name = "sky-dancer-v47-city-beacon";
      root.add(tower, crown);
    }

    for (const z of [70, 154, 238]) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(94, 1.2, 4.2), material(0x566c78, 0.72));
      bridge.position.set(0, -27, z);
      root.add(bridge);
    }
    return { root, landmarkCount: 77 };
  }

  private buildCloudKnife(): WorldZone {
    const root = new THREE.Group();
    root.name = "sky-dancer-v47-cloud-knife";
    const cloudGeometry = new THREE.DodecahedronGeometry(1, 0);
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xeaf7fb, transparent: true, opacity: 0.50, depthWrite: false });
    const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 62);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 62; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = 12 + Math.floor(index / 2) * 8.8;
      const size = 5 + seeded(index, 10) * 8;
      dummy.position.set(side * (18 + seeded(index, 11) * 50), -8 - seeded(index, 12) * 18, z);
      dummy.scale.set(size * 1.7, size * 0.45, size);
      dummy.rotation.set(0, seeded(index, 13) * Math.PI, 0);
      dummy.updateMatrix();
      clouds.setMatrixAt(index, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    clouds.frustumCulled = false;
    root.add(clouds);

    for (const z of [58, 126, 196, 260]) {
      const gate = new THREE.Mesh(
        new THREE.TorusGeometry(13, 0.34, 6, 42),
        new THREE.MeshBasicMaterial({ color: 0xb6efff, transparent: true, opacity: 0.36, depthWrite: false, toneMapped: false }),
      );
      gate.position.set(0, -1.5 + Math.sin(z) * 3, z);
      gate.name = "sky-dancer-v47-cloud-beacon";
      root.add(gate);
    }
    return { root, landmarkCount: 66 };
  }

  private buildIronValley(): WorldZone {
    const root = new THREE.Group();
    root.name = "sky-dancer-v47-iron-valley";
    const mountainGeometry = new THREE.ConeGeometry(1, 1, 7);
    const mountains = new THREE.InstancedMesh(mountainGeometry, material(0x596254, 0.98), 42);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 42; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = 16 + Math.floor(index / 2) * 13.4;
      const height = 34 + seeded(index, 20) * 32;
      const width = 17 + seeded(index, 21) * 16;
      dummy.position.set(side * (34 + seeded(index, 22) * 46), -70 + height * 0.5, z);
      dummy.scale.set(width, height, width * 0.86);
      dummy.rotation.y = seeded(index, 23) * Math.PI;
      dummy.updateMatrix();
      mountains.setMatrixAt(index, dummy.matrix);
    }
    mountains.instanceMatrix.needsUpdate = true;
    mountains.frustumCulled = false;
    root.add(mountains);

    const archMat = material(0x48565d, 0.78);
    for (const z of [96, 188, 272]) {
      const left = new THREE.Mesh(new THREE.BoxGeometry(7, 44, 10), archMat);
      const right = left.clone();
      left.position.set(-25, -42, z);
      right.position.set(25, -42, z);
      const span = new THREE.Mesh(new THREE.BoxGeometry(56, 5, 10), archMat);
      span.position.set(0, -19, z);
      root.add(left, right, span);
    }
    return { root, landmarkCount: 51 };
  }

  private buildHaloFoundry(): WorldZone {
    const root = new THREE.Group();
    root.name = "sky-dancer-v47-halo-foundry";
    const metal = material(0x4b5b68, 0.54);
    const dark = material(0x27343d, 0.68);
    for (const z of [72, 150, 228]) {
      const core = new THREE.Mesh(new THREE.CylinderGeometry(11, 14, 48, 10), metal);
      core.position.set(z === 150 ? 0 : z === 72 ? -42 : 42, -43, z);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(21, 1.25, 7, 42),
        new THREE.MeshBasicMaterial({ color: 0x77e0ef, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false }),
      );
      ring.position.copy(core.position).setY(-23);
      ring.rotation.x = Math.PI / 2;
      ring.name = "sky-dancer-v47-foundry-beacon";
      root.add(core, ring);
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 5), dark);
        arm.position.set(core.position.x + side * 18, -34, z);
        root.add(arm);
      }
    }
    const runway = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 280), dark);
    runway.position.set(0, -54, 145);
    root.add(runway);
    return { root, landmarkCount: 13 };
  }

  private buildStormCrown(): WorldZone {
    const root = new THREE.Group();
    root.name = "sky-dancer-v47-storm-crown";
    const cloudGeometry = new THREE.IcosahedronGeometry(1, 0);
    const clouds = new THREE.InstancedMesh(
      cloudGeometry,
      new THREE.MeshLambertMaterial({ color: 0x65727b, transparent: true, opacity: 0.58, depthWrite: false }),
      54,
    );
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 54; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const size = 6 + seeded(index, 31) * 10;
      dummy.position.set(side * (22 + seeded(index, 32) * 54), -5 - seeded(index, 33) * 24, 18 + Math.floor(index / 2) * 10.2);
      dummy.scale.set(size * 1.8, size * 0.55, size);
      dummy.rotation.y = seeded(index, 34) * Math.PI;
      dummy.updateMatrix();
      clouds.setMatrixAt(index, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    clouds.frustumCulled = false;
    root.add(clouds);

    for (const [index, z] of [74, 138, 208, 270].entries()) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 38, 6), material(0x3f4a50, 0.66));
      rod.position.set(index % 2 === 0 ? -34 : 34, -34, z);
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xb9f6ff, transparent: true, opacity: 0.56, depthWrite: false, toneMapped: false }),
      );
      beacon.position.set(rod.position.x, -14, z);
      beacon.name = "sky-dancer-v47-storm-beacon";
      root.add(rod, beacon);
    }
    return { root, landmarkCount: 62 };
  }

  private buildLastLightCitadel(): WorldZone {
    const root = new THREE.Group();
    root.name = "sky-dancer-v47-last-light-citadel";
    const obsidian = material(0x303746, 0.48);
    for (const z of [66, 126, 190, 252]) {
      for (const side of [-1, 1]) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 8.5, 58, 6), obsidian);
        pylon.position.set(side * 35, -42, z);
        pylon.rotation.y = Math.PI / 6;
        root.add(pylon);
      }
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(28, 0.72, 7, 48),
        new THREE.MeshBasicMaterial({ color: 0xffb088, transparent: true, opacity: 0.30, depthWrite: false, toneMapped: false }),
      );
      halo.position.set(0, -8, z);
      halo.name = "sky-dancer-v47-citadel-beacon";
      root.add(halo);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(14, 82, 8), obsidian);
    spire.position.set(0, -35, 304);
    root.add(spire);
    return { root, landmarkCount: 13 };
  }

  private installAuditBridge(): void {
    if (typeof window === "undefined" || !navigator.webdriver) return;
    (window as unknown as Record<string, unknown>).__skyDancerGetV47World = () => ({
      activeStyle: this.activeStyle,
      anchorResets: this.anchorResets,
      landmarkCount: this.zones.get(this.activeStyle)?.landmarkCount ?? 0,
      allStyles: WORLD_STYLES,
      rootVisible: this.routeRoot.visible,
    });
  }
}

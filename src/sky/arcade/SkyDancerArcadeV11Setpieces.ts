import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import { arcadeCourseRelativeVisualPose } from "./SkyDancerArcadeCoursePath";
import { arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";

interface V11SetpieceAnchor {
  group: THREE.Group;
  fraction: number;
  beatIds: readonly string[];
  movingTrain?: THREE.Group;
  trainPhase?: number;
  spinner?: THREE.Group;
  spinRate?: number;
}

interface AnchorAnimation {
  movingTrain?: THREE.Group;
  trainPhase?: number;
  spinner?: THREE.Group;
  spinRate?: number;
}

function material(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: .62,
    metalness: .34,
    emissive,
    emissiveIntensity: emissive ? 1.55 : 0,
  });
}

function glow(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}

function box(
  group: THREE.Group,
  size: [number, number, number],
  mat: THREE.Material,
  position: [number, number, number],
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  if (name) mesh.name = name;
  group.add(mesh);
  return mesh;
}

function spike(
  group: THREE.Group,
  radius: number,
  height: number,
  mat: THREE.Material,
  position: [number, number, number],
  rotationZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 5), mat);
  mesh.position.set(...position);
  mesh.rotation.z = rotationZ;
  group.add(mesh);
  return mesh;
}

function frameGate(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  structure: THREE.Material,
  light: THREE.Material,
  y = 0,
): void {
  const sideX = width * .5;
  box(group, [1.25, height, depth], structure, [-sideX, y, 0]);
  box(group, [1.25, height, depth], structure, [sideX, y, 0]);
  box(group, [width + 1.25, 1.25, depth], structure, [0, y + height * .5, 0]);
  box(group, [width - 2.4, .18, depth + .16], light, [0, y + height * .5 - .85, 0]);
  box(group, [.18, height - 1.8, depth + .16], light, [-sideX + .78, y, 0]);
  box(group, [.18, height - 1.8, depth + .16], light, [sideX - .78, y, 0]);
}

function radialGate(
  group: THREE.Group,
  radius: number,
  segments: number,
  structure: THREE.Material,
  light: THREE.Material,
): THREE.Group {
  const ring = new THREE.Group();
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const beam = box(ring, [5.6, 1.05, 2.0], structure, [x, y, 0]);
    beam.rotation.z = angle + Math.PI * .5;
    const strip = box(ring, [3.5, .16, 2.2], light, [x * .94, y * .94, .08]);
    strip.rotation.z = angle + Math.PI * .5;
  }
  group.add(ring);
  return ring;
}

function disposeTree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((mat) => mat.dispose());
  root.clear();
}

/**
 * V13 Flagship Setpieces.
 *
 * V11.1 proved the course-anchored technique on Cloud Fleet and Night Metro. V13 applies
 * the same rule to every Arcade Run stage: signature geometry is attached to one absolute
 * course distance, transformed through the shared V10.4 course frame and only animated
 * when the object is explicitly an actor (train / portal / orbital mechanism).
 *
 * The geometry is intentionally primitive-based. Only the active stage is resident, which
 * keeps iPhone Safari memory and draw-call pressure predictable while delivering a much
 * stronger authored silhouette than a second scrolling backdrop would.
 */
export class SkyDancerArcadeV11SetpieceDirector {
  private readonly root = new THREE.Group();
  private readonly anchors: V11SetpieceAnchor[] = [];
  private stageId = "";

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = "arcade-v11-signature-setpieces";
    this.root.userData.arcadeV13FlagshipSetpieces = true;
    this.root.userData.arcadeV11CourseAnchoredSetpieces = true;
    this.scene.add(this.root);
  }

  setStage(stage: SkyDancerArcadeStageDefinition): void {
    if (this.stageId === stage.id) return;
    this.clear();
    this.stageId = stage.id;
    switch (stage.id) {
      case "dawn-city": this.buildDawnCity(stage); break;
      case "red-canyon": this.buildRedCanyon(stage); break;
      case "cloud-fleet": this.buildCloudFleet(stage); break;
      case "storm-carrier": this.buildStormCarrier(stage); break;
      case "desert-fortress": this.buildDesertFortress(stage); break;
      case "ice-cavern": this.buildIceCavern(stage); break;
      case "floating-ruins": this.buildFloatingRuins(stage); break;
      case "night-metro": this.buildNightMetro(stage); break;
      case "volcano-core": this.buildVolcanoCore(stage); break;
      case "orbital-ascent": this.buildOrbitalAscent(stage); break;
      case "prism-citadel": this.buildPrismCitadel(stage); break;
    }
  }

  update(snapshot: SkyDancerArcadeSnapshot): void {
    if (this.stageId !== snapshot.stage.id) this.setStage(snapshot.stage);
    const stageLength = snapshot.stage.durationSeconds * snapshot.stage.courseSpeed;
    const attitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);
    for (const anchor of this.anchors) {
      const anchorDistance = stageLength * anchor.fraction;
      const depth = anchorDistance - snapshot.distance;
      const pose = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, depth);
      anchor.group.position.set(pose.x, pose.y, pose.z);
      anchor.group.rotation.set(attitude.pitch, attitude.yaw, attitude.roll);
      anchor.group.visible = anchor.beatIds.includes(snapshot.timelineBeatId) && depth > -105 && depth < 230;
      anchor.group.userData.arcadeV11AbsoluteCourseDistance = anchorDistance;
      anchor.group.userData.arcadeV11RelativeDepth = depth;
      if (anchor.movingTrain) {
        const phase = anchor.trainPhase ?? 0;
        const travel = ((snapshot.runTimeSeconds * 24 + phase) % 46) - 23;
        anchor.movingTrain.position.z = travel;
        anchor.movingTrain.userData.arcadeV11IntentionalRailTravel = true;
      }
      if (anchor.spinner) {
        anchor.spinner.rotation.z = snapshot.runTimeSeconds * (anchor.spinRate ?? .34);
        anchor.spinner.userData.arcadeV13IntentionalMotion = true;
      }
    }
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.root);
  }

  private addAnchor(
    group: THREE.Group,
    fraction: number,
    beatIds: readonly string[],
    animation: AnchorAnimation = {},
  ): void {
    group.userData.arcadeV11CourseAnchor = true;
    group.userData.arcadeV13FlagshipAnchor = true;
    this.root.add(group);
    this.anchors.push({ group, fraction, beatIds, ...animation });
  }

  private buildDawnCity(stage: SkyDancerArcadeStageDefinition): void {
    const concrete = material(0x34485a);
    const glass = material(stage.palette.secondary);
    const light = glow(stage.palette.accent);
    const warm = glow(0xffbf65);
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      const sign = index % 2 === 0 ? -1 : 1;
      section.name = `arcade-v13-dawn-slalom-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "skyline-slalom";
      box(section, [8, 34 + index * 2, 12], concrete, [sign * 19, 5, 0]);
      box(section, [6.8, 27 + index * 2, 12.4], glass, [sign * 18.8, 6, 0]);
      box(section, [.24, 25, 12.8], light, [sign * 14.9, 6, 0]);
      box(section, [7.2, .3, 13], warm, [sign * 18.8, 20 + index, 0]);
      this.addAnchor(section, .145 + index * .019, ["tower-slalom"]);
    }
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-dawn-gantry-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "city-gantry-corridor";
      frameGate(section, 39, 22, 2.2, concrete, light, 1.5);
      box(section, [7, 8, 18], glass, [-24, -5, 0]);
      box(section, [7, 11, 18], glass, [24, -3.5, 0]);
      this.addAnchor(section, .315 + index * .0215, ["city-gantry"]);
    }
    for (let index = 0; index < 4; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-dawn-pursuit-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "rooftop-pursuit";
      box(section, [18, 2, 30], concrete, [-22, -8, 0]);
      box(section, [18, 2, 30], concrete, [22, -8, 0]);
      box(section, [.24, .3, 28], warm, [-13, -6.8, 0]);
      box(section, [.24, .3, 28], warm, [13, -6.8, 0]);
      this.addAnchor(section, .472 + index * .021, ["ace-pursuit", "aurora-duel"]);
    }
  }

  private buildRedCanyon(stage: SkyDancerArcadeStageDefinition): void {
    const rock = material(0x7f3527);
    const dark = material(0x3b201e);
    const light = glow(stage.palette.accent);
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-canyon-knife-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "knife-floor";
      const squeeze = index % 3 === 1 ? 2 : 0;
      box(section, [14, 30, 28], rock, [-24 + squeeze, -4, 0]);
      box(section, [14, 26, 28], rock, [24 - squeeze, -6, 0]);
      box(section, [.22, 16, 28.4], light, [-16.8 + squeeze, -1, 0]);
      box(section, [.22, 16, 28.4], light, [16.8 - squeeze, -1, 0]);
      this.addAnchor(section, .145 + index * .019, ["knife-floor"]);
    }
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-canyon-collapse-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "collapsing-stone-arch";
      frameGate(section, 35 - (index % 2) * 3, 20, 3, rock, light, -1);
      const slab = box(section, [12, 4, 8], dark, [index % 2 === 0 ? -14 : 14, 12, -3]);
      slab.rotation.z = (index % 2 === 0 ? 1 : -1) * .18;
      this.addAnchor(section, .315 + index * .021, ["collapse-arch"]);
    }
    for (let index = 0; index < 4; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-canyon-drill-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "basalt-wake";
      spike(section, 8, 24, dark, [-22, -2, 0], -Math.PI * .5);
      spike(section, 8, 24, dark, [22, -2, 0], Math.PI * .5);
      box(section, [32, .25, 2.4], light, [0, -10, 0]);
      this.addAnchor(section, .475 + index * .023, ["drill-chase", "basalt-driller"]);
    }
  }

  private buildCloudFleet(stage: SkyDancerArcadeStageDefinition): void {
    const hull = material(0xdce9ef);
    const dark = material(0x32495d);
    const deck = material(0x71899a);
    const light = glow(stage.palette.accent);
    const engine = glow(0xffcb63);
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-cloud-deck-section-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "capital-ship-deck-run";
      box(section, [34, 1.15, 38], deck, [0, -7.8, 0], "arcade-v11-cloud-flight-deck");
      box(section, [24, 7.8, 34], hull, [0, -12.1, 2]);
      box(section, [33.2, .18, .38], light, [0, -7.05, -16.5]);
      box(section, [33.2, .18, .38], light, [0, -7.05, 16.5]);
      const islandSide = index % 2 === 0 ? 1 : -1;
      box(section, [5.8, 11.5, 8], dark, [islandSide * 18.8, -1.7, 2]);
      box(section, [.8, 8.5, 8.2], light, [islandSide * 15.5, -1.7, 2]);
      this.addAnchor(section, .325 + index * .0118, ["deck-run"]);
    }
    for (let index = 0; index < 5; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-cloud-cruiser-section-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "cumulus-cruiser-approach";
      const side = index % 2 === 0 ? 1 : -1;
      box(section, [20, 8.5, 42], dark, [side * 24, -7, 0]);
      box(section, [26, 1, 30], deck, [side * 22, -2.4, -2]);
      box(section, [6, 13, 8], hull, [side * 29, 4.2, 3]);
      for (const engineSide of [-1, 1]) box(section, [4.8, 3, 6], engine, [side * 24 + engineSide * 5.4, -10.5, 16]);
      this.addAnchor(section, .475 + index * .014, ["cruiser-approach", "cumulus-cruiser"]);
    }
  }

  private buildStormCarrier(stage: SkyDancerArcadeStageDefinition): void {
    const hull = material(0x263344);
    const plate = material(stage.palette.secondary);
    const light = glow(stage.palette.accent);
    const warning = glow(0xffe46b);
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-storm-lane-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "lightning-safe-lanes";
      frameGate(section, 40, 24, 1.5, hull, light, 1);
      const lane = index % 3 - 1;
      box(section, [7.5, .25, 2], warning, [lane * 10, -9, .2]);
      this.addAnchor(section, .145 + index * .019, ["safe-lanes"]);
    }
    for (let index = 0; index < 5; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-storm-carrier-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "tempest-carrier-screen";
      const side = index % 2 === 0 ? -1 : 1;
      box(section, [18, 10, 40], hull, [side * 25, -5, 0]);
      box(section, [23, 1.2, 30], plate, [side * 23, .4, 0]);
      box(section, [4, 15, 6], hull, [side * 30, 6, 2]);
      box(section, [.3, 12, 6.3], light, [side * 20, 6, 2]);
      this.addAnchor(section, .315 + index * .026, ["carrier-screen"]);
    }
    for (let index = 0; index < 3; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-storm-eye-${index}`;
      const spinner = radialGate(section, 17 + index * 1.5, 8, plate, warning);
      this.addAnchor(section, .475 + index * .03, ["storm-eye", "tempest-carrier"], { spinner, spinRate: .22 + index * .05 });
    }
  }

  private buildDesertFortress(stage: SkyDancerArcadeStageDefinition): void {
    const stone = material(0x8d6940);
    const dark = material(0x3f3429);
    const light = glow(stage.palette.accent);
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-fortress-wall-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "fortress-artillery-wall";
      box(section, [12, 24, 24], stone, [-24, -2, 0]);
      box(section, [12, 24, 24], stone, [24, -2, 0]);
      box(section, [5, 11, 8], dark, [-17, 6, -4]);
      box(section, [5, 11, 8], dark, [17, 6, 4]);
      box(section, [.25, 15, 24.5], light, [-17.7, -1, 0]);
      box(section, [.25, 15, 24.5], light, [17.7, -1, 0]);
      this.addAnchor(section, .145 + index * .022, ["wall-barrage"]);
    }
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-fortress-breach-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "sandwall-breach";
      frameGate(section, 36 - (index % 3), 23, 3.2, stone, light, 0);
      box(section, [8, 6, 16], dark, [index % 2 === 0 ? -22 : 22, -8, 0]);
      this.addAnchor(section, .315 + index * .019, ["breach-run"]);
    }
    for (let index = 0; index < 4; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-fortress-core-${index}`;
      box(section, [16, 31, 34], stone, [-25, 1, 0]);
      box(section, [16, 31, 34], stone, [25, 1, 0]);
      box(section, [34, .25, 3], light, [0, 15, 0]);
      this.addAnchor(section, .475 + index * .024, ["fortress-core", "golden-wall"]);
    }
  }

  private buildIceCavern(stage: SkyDancerArcadeStageDefinition): void {
    const ice = material(0xa8d9e6, 0x173f55);
    const dark = material(0x315364);
    const light = glow(stage.palette.accent);
    for (let index = 0; index < 8; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-ice-rib-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "crystal-tunnel-ribs";
      spike(section, 5.5, 22, ice, [-18, 2, 0], -Math.PI * .36);
      spike(section, 5.5, 22, ice, [18, 2, 0], Math.PI * .36);
      spike(section, 4, 14, dark, [-9, 13, 0], Math.PI);
      spike(section, 4, 14, dark, [9, 13, 0], Math.PI);
      box(section, [24, .2, 2], light, [0, -10, 0]);
      this.addAnchor(section, .145 + index * .017, ["crystal-tunnel"]);
    }
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-ice-collapse-${index}`;
      const side = index % 2 === 0 ? -1 : 1;
      const slab = box(section, [14, 5, 18], ice, [side * 15, 10 - index, 0]);
      slab.rotation.z = side * .3;
      box(section, [.28, 16, 20], light, [-side * 18, -2, 0]);
      this.addAnchor(section, .315 + index * .022, ["ice-collapse"]);
    }
    for (let index = 0; index < 3; index += 1) {
      const section = new THREE.Group();
      const spinner = radialGate(section, 16 + index, 7, dark, light);
      this.addAnchor(section, .475 + index * .03, ["wyrm-trace", "glacier-wyrm"], { spinner, spinRate: (index % 2 === 0 ? 1 : -1) * .18 });
    }
  }

  private buildFloatingRuins(stage: SkyDancerArcadeStageDefinition): void {
    const stone = material(0x5d5c63);
    const dark = material(0x292c34);
    const light = glow(stage.palette.accent);
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      const spinner = radialGate(section, 16.5 + (index % 2) * 1.3, 8, stone, light);
      section.name = `arcade-v13-ruin-portal-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "ancient-portal-run";
      this.addAnchor(section, .145 + index * .024, ["portal-run"], { spinner, spinRate: (index % 2 === 0 ? 1 : -1) * .12 });
    }
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-ruin-shift-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "moving-labyrinth-silhouette";
      const side = index % 2 === 0 ? -1 : 1;
      box(section, [12, 18, 14], stone, [side * 20, (index % 3 - 1) * 5, 0]);
      box(section, [7, 8, 10], dark, [-side * 12, 9 - (index % 2) * 18, 2]);
      box(section, [.24, 13, 14.4], light, [side * 13.8, (index % 3 - 1) * 5, 0]);
      this.addAnchor(section, .315 + index * .019, ["shifting-ruins"]);
    }
    for (let index = 0; index < 4; index += 1) {
      const section = new THREE.Group();
      box(section, [9, 34, 18], stone, [-24, 2, 0]);
      box(section, [9, 34, 18], stone, [24, 2, 0]);
      frameGate(section, 37, 22, 1.4, dark, light, 2);
      this.addAnchor(section, .475 + index * .024, ["guardian-wake", "aeon-guardian"]);
    }
  }

  private buildNightMetro(stage: SkyDancerArcadeStageDefinition): void {
    const rail = material(0x10182a);
    const structure = material(0x273554);
    const purple = material(stage.palette.secondary);
    const cyan = glow(stage.palette.accent);
    const pink = glow(0xff4f91);
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-night-rail-section-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "elevated-metro-pursuit";
      for (const side of [-1, 1]) {
        box(section, [8.5, 1.3, 34], rail, [side * 20, -8.4, 0]);
        box(section, [.32, .22, 33], cyan, [side * 16.5, -7.55, 0]);
        box(section, [1.2, 12, 1.2], structure, [side * 23.5, -14.2, -10]);
        box(section, [1.2, 12, 1.2], structure, [side * 23.5, -14.2, 10]);
      }
      this.addAnchor(section, .145 + index * .015, ["metro-chase"]);
    }
    const trainSection = new THREE.Group();
    trainSection.name = "arcade-v11-night-train-anchor";
    trainSection.userData.arcadeV13SetpieceIdentity = "metro-train-actor";
    box(trainSection, [8.5, 1.3, 58], rail, [20, -8.4, 0]);
    box(trainSection, [.32, .22, 56], cyan, [16.5, -7.55, 0]);
    const train = new THREE.Group();
    train.name = "arcade-v11-night-train";
    box(train, [9, 5.4, 22], purple, [20, -4.8, 0]);
    box(train, [8.2, 1.1, 20], pink, [20, -1.6, 0]);
    for (let windowIndex = -3; windowIndex <= 3; windowIndex += 1) box(train, [.18, 1.5, 1.8], cyan, [15.42, -4.2, windowIndex * 2.6]);
    trainSection.add(train);
    this.addAnchor(trainSection, .235, ["metro-chase", "neon-gantry"], { movingTrain: train, trainPhase: 7 });
    for (let index = 0; index < 8; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-night-gantry-section-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "neon-transit-gate-run";
      frameGate(section, 43, 25, 2, structure, cyan, 1);
      box(section, [9, .7, 28], rail, [-20, -9.4, 0]);
      box(section, [9, .7, 28], rail, [20, -9.4, 0]);
      box(section, [34, .18, 1], pink, [0, 10.8, 0]);
      this.addAnchor(section, .305 + index * .0145, ["neon-gantry"]);
    }
    for (let index = 0; index < 5; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-night-phantom-section-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "phantom-tunnel-exit";
      const side = index % 2 === 0 ? 1 : -1;
      box(section, [8, 19, 32], structure, [side * 27, 0, 0]);
      box(section, [1, 17, 33], pink, [side * 22.8, 0, 0]);
      box(section, [34, .9, 28], rail, [0, -10, 0]);
      box(section, [31, .18, 27], cyan, [0, -9.35, 0]);
      this.addAnchor(section, .472 + index * .016, ["phantom-pursuit", "neon-phantom"]);
    }
  }

  private buildVolcanoCore(stage: SkyDancerArcadeStageDefinition): void {
    const basalt = material(0x302421);
    const crust = material(0x6e3426);
    const lava = glow(0xff5b21);
    const accent = glow(stage.palette.accent);
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-magma-rift-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "lava-trench";
      box(section, [13, 24, 28], basalt, [-24, -4, 0]);
      box(section, [13, 24, 28], basalt, [24, -4, 0]);
      box(section, [.4, 12, 28.5], lava, [-17.3, -6, 0]);
      box(section, [.4, 12, 28.5], lava, [17.3, -6, 0]);
      this.addAnchor(section, .145 + index * .019, ["magma-rift"]);
    }
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-eruption-${index}`;
      frameGate(section, 38, 24, 2.5, crust, lava, 0);
      spike(section, 4.5, 14, basalt, [index % 2 === 0 ? -17 : 17, 12, -4], Math.PI);
      box(section, [24, .2, 2.8], accent, [0, -10, 0]);
      this.addAnchor(section, .315 + index * .021, ["eruption-run"]);
    }
    for (let index = 0; index < 3; index += 1) {
      const section = new THREE.Group();
      const spinner = radialGate(section, 17 + index, 9, basalt, lava);
      this.addAnchor(section, .475 + index * .03, ["core-dive", "magma-heart"], { spinner, spinRate: .20 + index * .04 });
    }
  }

  private buildOrbitalAscent(stage: SkyDancerArcadeStageDefinition): void {
    const truss = material(0x596573);
    const dark = material(0x19212f);
    const light = glow(stage.palette.accent);
    for (let index = 0; index < 8; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-orbit-spine-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "vertical-truss-run";
      frameGate(section, 40, 25, 1.5, truss, light, 0);
      const braceA = box(section, [1, 24, 1.2], dark, [-12, 0, 0]);
      braceA.rotation.z = .7;
      const braceB = box(section, [1, 24, 1.2], dark, [12, 0, 0]);
      braceB.rotation.z = -.7;
      this.addAnchor(section, .145 + index * .017, ["ascent-spine"]);
    }
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-orbit-lattice-${index}`;
      const spinner = radialGate(section, 18 + (index % 2), 6, dark, light);
      box(section, [34, .8, 2], truss, [0, 0, 0]);
      box(section, [.8, 34, 2], truss, [0, 0, 0]);
      this.addAnchor(section, .315 + index * .022, ["debris-lattice"], { spinner, spinRate: (index % 2 === 0 ? 1 : -1) * .15 });
    }
    for (let index = 0; index < 4; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-orbit-lance-${index}`;
      box(section, [9, 9, 42], dark, [-23, -2, 0]);
      box(section, [9, 9, 42], dark, [23, -2, 0]);
      box(section, [.4, .4, 43], light, [-18, 2, 0]);
      box(section, [.4, .4, 43], light, [18, 2, 0]);
      this.addAnchor(section, .475 + index * .024, ["lance-run", "orbital-lance"]);
    }
  }

  private buildPrismCitadel(stage: SkyDancerArcadeStageDefinition): void {
    const prism = material(stage.palette.secondary, 0x24164d);
    const dark = material(0x17162a);
    const light = glow(stage.palette.accent);
    const magenta = glow(0xff54c8);
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-prism-mirror-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "prism-gate-array";
      frameGate(section, 38 - (index % 2) * 2, 24, 2, prism, index % 2 === 0 ? light : magenta, 1);
      const spinner = radialGate(section, 16, 6, dark, index % 2 === 0 ? magenta : light);
      this.addAnchor(section, .115 + index * .017, ["mirror-corridor"], { spinner, spinRate: (index % 2 === 0 ? 1 : -1) * .16 });
    }
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-prism-remix-${index}`;
      const side = index % 2 === 0 ? -1 : 1;
      box(section, [10, 28, 18], prism, [side * 23, 1, 0]);
      spike(section, 5, 16, dark, [-side * 13, 9 - (index % 3) * 8, 0], side * Math.PI * .35);
      box(section, [.3, 20, 18.4], index % 2 === 0 ? light : magenta, [side * 17.8, 1, 0]);
      this.addAnchor(section, .235 + index * .018, ["history-remix"]);
    }
    for (let index = 0; index < 4; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-prism-throne-${index}`;
      frameGate(section, 42, 29, 3, dark, light, 2);
      box(section, [13, 36, 22], prism, [-27, 2, 0]);
      box(section, [13, 36, 22], prism, [27, 2, 0]);
      const spinner = radialGate(section, 18.5, 10, prism, magenta);
      this.addAnchor(section, .355 + index * .026, ["titan-approach", "sovereign-final"], { spinner, spinRate: .24 + index * .035 });
    }
  }

  private clear(): void {
    for (const child of [...this.root.children]) {
      this.root.remove(child);
      disposeTree(child);
    }
    this.anchors.length = 0;
  }
}

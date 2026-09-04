import * as THREE from "three";
import { SkyDancerArcadeEnvironment } from "./arcade/SkyDancerArcadeEnvironment";
import { skyDancerArcadeStageById, type SkyDancerArcadeStageDefinition, type SkyDancerArcadeStageId } from "./arcade/SkyDancerArcadeData";
import { referenceAtmosphere } from "./arcade/SkyDancerArcadeReferenceMaterials";
import type { SkyDancerSkyRaidAct } from "./SkyDancerSkyRaidRules";

const LEGACY_ENV_PREFIXES = [
  "sky-dancer-v23-",
  "sky-dancer-v25-",
  "sky-dancer-v28-",
  "sky-dancer-v30-",
  "sky-dancer-v32-",
  "sky-dancer-v35-",
  "sky-dancer-v36-",
  "sky-dancer-v38-",
  "sky-dancer-v40-",
  "sky-dancer-v41-",
  "sky-dancer-v42-",
  "sky-dancer-v47-",
  "sky-dancer-v50-",
  "sky-dancer-v53-",
] as const;

const FREE_FLIGHT_SECTOR_ANGLES = [Math.PI * 2 / 3, -Math.PI * 2 / 3] as const;
const FREE_FLIGHT_COPY_NAME = "sky-raid-arcade-free-flight-sector";
const SKY_RAID_DISTANT_WORLD_NAME = "sky-raid-free-flight-distant-world";
const SKY_RAID_MID_WORLD_NAME = "sky-raid-free-flight-mid-world";
const SKY_RAID_FOG_NEAR = 104;
const SKY_RAID_FOG_FAR = 575;

function insideArcadeEnvironment(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.name === "arcade-course-environment" || current.name === FREE_FLIGHT_COPY_NAME) return true;
    current = current.parent;
  }
  return false;
}

function suppressLegacyEnvironment(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (insideArcadeEnvironment(object)) return;
    const legacyNamed = object.name === "phase67-turbo-hunt-world"
      || object.name === "sky-dancer-legacy-environment"
      || LEGACY_ENV_PREFIXES.some((prefix) => object.name.startsWith(prefix));
    const legacyTheme = object.userData.skyDancerLegacyEnvironment === true;
    const legacyLargeSky = object instanceof THREE.Mesh
      && object.geometry instanceof THREE.SphereGeometry
      && object.geometry.parameters.radius >= 250;
    if (legacyNamed || legacyTheme || legacyLargeSky) object.visible = false;
  });
}

function stripDuplicateAtmosphere(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Light) {
      object.visible = false;
      return;
    }
    if (object.name === "arcade-product-backdrop" || object.name === "arcade-product-sun") {
      object.visible = false;
      return;
    }
    if (
      object instanceof THREE.Mesh
      && object.geometry instanceof THREE.SphereGeometry
      && object.geometry.parameters.radius >= 250
    ) object.visible = false;
  });
}

function disposeGeneratedWorld(root: THREE.Group | null): void {
  if (!root) return;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  root.removeFromParent();
  root.clear();
}

function deterministicUnit(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * The Arcade Run backdrop contains four flat ridge sheets plus a single forward
 * metropolis that were authored to make a guided, continuously scrolling course
 * feel deep. In free-flight they read as a moving theatre backdrop. Hide only
 * those generic course-depth devices. Named ACT landmarks (flagship, fortress,
 * temple, planet, dreadnought, etc.) are intentionally preserved.
 */
function suppressForcedScrollBackdropArtifacts(source: THREE.Group): number {
  const backdrop = source.getObjectByName("arcade-product-backdrop");
  if (!(backdrop instanceof THREE.Group)) return 0;
  let hidden = 0;
  for (const child of backdrop.children) {
    const genericRidgeSheet = child.name === "" && child instanceof THREE.Mesh;
    const guidedCourseMetropolis = child.name === "arcade-distant-metropolis";
    if (!genericRidgeSheet && !guidedCourseMetropolis) continue;
    child.visible = false;
    child.userData.skyRaidForcedScrollOnly = true;
    hidden += 1;
  }
  backdrop.userData.skyRaidPreservesNamedActLandmarks = true;
  backdrop.userData.skyRaidForcedScrollArtifactsHidden = hidden;
  return hidden;
}

function makeInstancedMaterial(color: THREE.Color, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: true,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
}

function buildSkyRaidCityRing(
  stage: SkyDancerArcadeStageDefinition,
  root: THREE.Group,
  count: number,
  minRadius: number,
  maxRadius: number,
  minHeight: number,
  maxHeight: number,
  seedOffset: number,
  color: THREE.Color,
): void {
  const distant = seedOffset >= 100;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = makeInstancedMaterial(color);
  const towers = new THREE.InstancedMesh(geometry, material, count);
  towers.name = distant ? "sky-raid-distant-city-ring" : "sky-raid-mid-city-ring";
  towers.frustumCulled = false;
  towers.renderOrder = -1;
  const matrix = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + deterministicUnit(seedOffset + i * 7) * 0.11;
    const radius = minRadius + deterministicUnit(seedOffset + i * 11 + 3) * (maxRadius - minRadius);
    const h = minHeight + deterministicUnit(seedOffset + i * 17 + 5) * (maxHeight - minHeight);
    const w = (distant ? 9 : 7) + deterministicUnit(seedOffset + i * 19 + 9) * (distant ? 18 : 12);
    const d = (distant ? 8 : 6) + deterministicUnit(seedOffset + i * 23 + 13) * (distant ? 17 : 11);
    // Keep the replacement skyline physically attached to the city datum. The old
    // first pass used tall isolated blocks that rose into the sky at 64m and looked
    // like another scrolling backdrop. This reads as one low urban belt instead.
    matrix.position.set(Math.cos(a) * radius, -31 + h * 0.5, Math.sin(a) * radius);
    matrix.scale.set(w, h, d);
    matrix.rotation.set(0, -a + deterministicUnit(seedOffset + i * 29) * 0.22, 0);
    matrix.updateMatrix();
    towers.setMatrixAt(i, matrix.matrix);
    const shade = new THREE.Color(stage.palette.ground)
      .lerp(color, 0.28 + deterministicUnit(seedOffset + i * 31) * 0.18);
    towers.setColorAt(i, shade);
  }
  towers.instanceMatrix.needsUpdate = true;
  if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
  towers.computeBoundingSphere();
  root.add(towers);
}

function buildSkyRaidRidgeRing(
  stage: SkyDancerArcadeStageDefinition,
  root: THREE.Group,
  count: number,
  minRadius: number,
  maxRadius: number,
  minHeight: number,
  maxHeight: number,
  seedOffset: number,
  color: THREE.Color,
): void {
  const geometry = new THREE.ConeGeometry(1, 1, 6, 1);
  const material = makeInstancedMaterial(color);
  const ridges = new THREE.InstancedMesh(geometry, material, count);
  ridges.name = seedOffset < 100 ? "sky-raid-mid-ridge-ring" : "sky-raid-distant-ridge-ring";
  ridges.frustumCulled = false;
  const matrix = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + deterministicUnit(seedOffset + i * 5) * 0.14;
    const radius = minRadius + deterministicUnit(seedOffset + i * 13 + 1) * (maxRadius - minRadius);
    const h = minHeight + deterministicUnit(seedOffset + i * 17 + 7) * (maxHeight - minHeight);
    const w = 18 + deterministicUnit(seedOffset + i * 19 + 2) * (seedOffset < 100 ? 28 : 48);
    const d = 15 + deterministicUnit(seedOffset + i * 23 + 4) * (seedOffset < 100 ? 21 : 37);
    matrix.position.set(Math.cos(a) * radius, -34 + h * 0.5, Math.sin(a) * radius);
    matrix.scale.set(w, h, d);
    matrix.rotation.set(0, -a + deterministicUnit(seedOffset + i * 29) * 0.5, 0);
    matrix.updateMatrix();
    ridges.setMatrixAt(i, matrix.matrix);
    const shade = new THREE.Color(stage.palette.ground)
      .lerp(color, 0.5 + deterministicUnit(seedOffset + i * 31) * 0.3);
    ridges.setColorAt(i, shade);
  }
  ridges.instanceMatrix.needsUpdate = true;
  if (ridges.instanceColor) ridges.instanceColor.needsUpdate = true;
  ridges.computeBoundingSphere();
  root.add(ridges);
}

function buildSkyRaidCloudRing(
  stage: SkyDancerArcadeStageDefinition,
  root: THREE.Group,
  count: number,
  minRadius: number,
  maxRadius: number,
  minY: number,
  maxY: number,
  seedOffset: number,
  color: THREE.Color,
): void {
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const material = makeInstancedMaterial(color, seedOffset < 100 ? 0.66 : 0.52);
  const clouds = new THREE.InstancedMesh(geometry, material, count);
  clouds.name = seedOffset < 100 ? "sky-raid-mid-cloud-ring" : "sky-raid-distant-cloud-ring";
  clouds.frustumCulled = false;
  clouds.renderOrder = -3;
  const matrix = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + deterministicUnit(seedOffset + i * 5) * 0.19;
    const radius = minRadius + deterministicUnit(seedOffset + i * 13 + 3) * (maxRadius - minRadius);
    const y = minY + deterministicUnit(seedOffset + i * 17 + 7) * (maxY - minY);
    const sx = 13 + deterministicUnit(seedOffset + i * 19 + 11) * (seedOffset < 100 ? 22 : 38);
    const sy = 4 + deterministicUnit(seedOffset + i * 23 + 13) * (seedOffset < 100 ? 8 : 13);
    const sz = 9 + deterministicUnit(seedOffset + i * 29 + 17) * (seedOffset < 100 ? 17 : 25);
    matrix.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    matrix.scale.set(sx, sy, sz);
    matrix.rotation.set(0, -a, 0);
    matrix.updateMatrix();
    clouds.setMatrixAt(i, matrix.matrix);
    const shade = new THREE.Color(stage.palette.secondary)
      .lerp(color, 0.68 + deterministicUnit(seedOffset + i * 31) * 0.22);
    clouds.setColorAt(i, shade);
  }
  clouds.instanceMatrix.needsUpdate = true;
  if (clouds.instanceColor) clouds.instanceColor.needsUpdate = true;
  clouds.computeBoundingSphere();
  root.add(clouds);
}

function freeFlightSectorRadius(stage: SkyDancerArcadeStageDefinition): number {
  switch (stage.biome) {
    case "city": return 168;
    case "canyon": return 214;
    case "cloud": return 206;
    case "storm": return 218;
    case "citadel": return 184;
    default: return 196;
  }
}

function freeFlightChunkLateralScale(stage: SkyDancerArcadeStageDefinition): number {
  // Dawn City's Arcade Run near-pass buildings were authored for a guided route.
  // In SKY RAID the aircraft can leave that route, so widen only the rigid city
  // districts to keep visual-only skyscrapers out of the center combat sightline.
  // The sky, river, distant skyline and all non-city ACTs keep their authored scale.
  switch (stage.biome) {
    case "city": return 1.34;
    default: return 1;
  }
}

/**
 * SKY RAID keeps the Arcade Run art language but presents it as a spatial world.
 * The original authored corridor remains the hero sector. Two geometry-sharing
 * secondary sectors are placed out around the free-flight area at +/-120 degrees,
 * rather than stacked at the player's origin. Turning therefore reveals more of
 * the same Arcade Run world without piling three corridors on top of one another.
 * Nothing follows aircraft heading or elapsed time, so this remains true free flight.
 */
export class SkyDancerSkyRaidArcadeWorld {
  private readonly environment: SkyDancerArcadeEnvironment;
  private readonly freeFlightCopies: THREE.Group[] = [];
  private stage: SkyDancerArcadeStageDefinition | null = null;
  private distantWorld: THREE.Group | null = null;
  private midWorld: THREE.Group | null = null;
  private anchorX = 0;
  private anchorZ = 0;
  private anchorYaw = Math.PI;

  constructor(private readonly scene: THREE.Scene) {
    this.environment = new SkyDancerArcadeEnvironment(scene);
    suppressLegacyEnvironment(scene);
    scene.userData.skyRaidUsesArcadeReferenceWorld = true;
    scene.userData.skyRaidLegacyEnvironmentSuppressed = true;
    scene.userData.skyRaidFreeFlightWorld = true;
    scene.userData.skyRaidArcadeFreeFlightSectors = 3;
  }

  private clearFreeFlightCopies(): void {
    for (const copy of this.freeFlightCopies) this.scene.remove(copy);
    this.freeFlightCopies.length = 0;
  }

  private clearFreeFlightDepthWorld(): void {
    disposeGeneratedWorld(this.distantWorld);
    disposeGeneratedWorld(this.midWorld);
    this.distantWorld = null;
    this.midWorld = null;
  }

  private tuneSkyRaidAtmosphere(): void {
    if (!(this.scene.fog instanceof THREE.Fog)) return;
    this.scene.fog.near = SKY_RAID_FOG_NEAR;
    this.scene.fog.far = SKY_RAID_FOG_FAR;
    this.scene.userData.skyRaidFogNear = SKY_RAID_FOG_NEAR;
    this.scene.userData.skyRaidFogFar = SKY_RAID_FOG_FAR;
    this.scene.userData.skyRaidDistantContrastSoftened = true;
  }

  private buildFreeFlightDepthWorld(): void {
    this.clearFreeFlightDepthWorld();
    if (!this.stage || ["orbit", "citadel"].includes(this.stage.biome)) {
      this.scene.userData.skyRaidFreeFlightDepthLayers = 0;
      return;
    }

    const atmosphere = referenceAtmosphere(this.stage);
    const distant = new THREE.Group();
    distant.name = SKY_RAID_DISTANT_WORLD_NAME;
    distant.position.set(this.anchorX, 0, this.anchorZ);
    distant.userData.skyRaidWorldAnchored = true;
    distant.userData.skyRaidParallaxLayer = "far";
    distant.userData.skyRaidScrollFactor = 0;

    const mid = new THREE.Group();
    mid.name = SKY_RAID_MID_WORLD_NAME;
    mid.position.set(this.anchorX, 0, this.anchorZ);
    mid.userData.skyRaidWorldAnchored = true;
    mid.userData.skyRaidParallaxLayer = "mid";
    mid.userData.skyRaidScrollFactor = 0;

    if (this.stage.biome === "city" || this.stage.biome === "night") {
      buildSkyRaidCityRing(this.stage, distant, 72, 385, 535, 6, 28, 200, atmosphere.fog.clone().lerp(atmosphere.horizon, 0.12));
      buildSkyRaidCityRing(this.stage, mid, 38, 215, 310, 8, 31, 40, atmosphere.fog.clone().lerp(new THREE.Color(this.stage.palette.secondary), 0.08));
    } else if (this.stage.biome === "cloud" || this.stage.biome === "storm") {
      buildSkyRaidCloudRing(this.stage, distant, 44, 345, 515, 8, 50, 200, atmosphere.cloudLight.clone().lerp(atmosphere.fog, 0.66));
      buildSkyRaidCloudRing(this.stage, mid, 22, 205, 305, 4, 42, 40, atmosphere.cloudLight.clone().lerp(atmosphere.fog, 0.42));
    } else {
      buildSkyRaidRidgeRing(this.stage, distant, 42, 365, 525, 34, 96, 200, atmosphere.fog.clone().lerp(atmosphere.horizon, 0.24));
      buildSkyRaidRidgeRing(this.stage, mid, 24, 215, 315, 24, 62, 40, atmosphere.fog.clone().lerp(new THREE.Color(this.stage.palette.secondary), 0.15));
    }

    this.scene.add(distant, mid);
    this.distantWorld = distant;
    this.midWorld = mid;
    this.scene.userData.skyRaidFreeFlightDepthLayers = 2;
    this.scene.userData.skyRaidFarSceneryWorldAnchored = true;
    this.scene.userData.skyRaidMidSceneryWorldAnchored = true;
    this.scene.userData.skyRaidForcedScrollParallax = false;
  }

  private applyFreeFlightBackdropPolicy(): void {
    const source = this.scene.getObjectByName("arcade-course-environment");
    if (!(source instanceof THREE.Group)) return;
    const hidden = suppressForcedScrollBackdropArtifacts(source);
    source.userData.skyRaidForcedScrollBackdropSuppressed = true;
    this.scene.userData.skyRaidForcedScrollBackdropArtifactsHidden = hidden;
    this.scene.userData.skyRaidNamedBackdropLandmarksPreserved = true;
  }

  private applyFreeFlightChunkClearance(): void {
    if (!this.stage) return;
    const source = this.scene.getObjectByName("arcade-course-environment");
    if (!(source instanceof THREE.Group)) return;
    const lateralScale = freeFlightChunkLateralScale(this.stage);
    source.children.forEach((child) => {
      if (child.name.startsWith("arcade-course-chunk-")) child.scale.x = lateralScale;
    });
    source.userData.skyRaidChunkLateralScale = lateralScale;
    this.scene.userData.skyRaidArcadeChunkLateralScale = lateralScale;
  }

  private positionFreeFlightSector(copy: THREE.Group, angle: number, index: number): void {
    if (!this.stage) return;
    const yaw = this.anchorYaw + angle;
    const radius = freeFlightSectorRadius(this.stage);
    // Arcade Run local forward is -Z. Offset each auxiliary corridor in its own
    // forward direction so it reads as a neighboring district/formation, not a
    // second copy occupying the same physical space as the hero corridor.
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    copy.position.set(
      this.anchorX + forwardX * radius,
      -0.035 * (index + 1),
      this.anchorZ + forwardZ * radius,
    );
    copy.rotation.set(0, yaw, 0);
    copy.userData.skyRaidFreeFlightSectorRadius = radius;
  }

  private buildFreeFlightCopies(): void {
    this.clearFreeFlightCopies();
    const source = this.scene.getObjectByName("arcade-course-environment");
    if (!(source instanceof THREE.Group)) return;

    FREE_FLIGHT_SECTOR_ANGLES.forEach((angle, index) => {
      // clone(true) intentionally shares immutable geometry/materials with the
      // Arcade Run environment. The forced-scroll backdrop is stripped from each
      // auxiliary sector so only one set of real ACT landmarks can ever exist.
      const copy = source.clone(true);
      copy.name = FREE_FLIGHT_COPY_NAME;
      copy.userData.skyRaidFreeFlightSector = index + 1;
      copy.userData.skyRaidFreeFlightSectorAngle = angle;
      stripDuplicateAtmosphere(copy);
      this.positionFreeFlightSector(copy, angle, index);
      this.scene.add(copy);
      this.freeFlightCopies.push(copy);
    });
  }

  update(
    actId: SkyDancerSkyRaidAct["id"],
    x: number,
    z: number,
    heading: number,
    _altitude: number,
    _elapsed: number,
    _delta: number,
  ): void {
    suppressLegacyEnvironment(this.scene);

    if (!this.stage || this.stage.id !== actId) {
      // The clones share geometry/materials with the current Arcade environment,
      // so remove them before setStage() disposes the previous stage resources.
      this.clearFreeFlightCopies();
      this.clearFreeFlightDepthWorld();
      this.stage = skyDancerArcadeStageById(actId as SkyDancerArcadeStageId);
      this.environment.setStage(this.stage);

      // Capture the Arcade Run-to-free-flight frame once per ACT. The world never
      // chases the plane after this point. Apparent parallax now comes from actual
      // 3D distance (near chunks, mid ring, far ring), not a forced scroll value.
      this.anchorX = x;
      this.anchorZ = z;
      this.anchorYaw = heading + Math.PI;
      this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
      this.environment.update(0, 0, 0);
      this.applyFreeFlightBackdropPolicy();
      this.tuneSkyRaidAtmosphere();
      this.applyFreeFlightChunkClearance();
      this.buildFreeFlightDepthWorld();
      this.buildFreeFlightCopies();
      suppressLegacyEnvironment(this.scene);
    }

    if (!this.stage) return;

    this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
    this.applyFreeFlightBackdropPolicy();
    this.tuneSkyRaidAtmosphere();
    this.applyFreeFlightChunkClearance();
    this.freeFlightCopies.forEach((copy, index) => {
      this.positionFreeFlightSector(copy, FREE_FLIGHT_SECTOR_ANGLES[index], index);
    });

    // The replacement depth world is deliberately stable in world space. It does
    // not inherit player heading, pitch, elapsed time, course distance or Turbo.
    // Mid/far layers move on screen only through real camera translation, so their
    // apparent speed naturally falls with distance while near scenery remains fast.
    this.scene.userData.skyRaidArcadeReferenceStage = this.stage.id;
    this.scene.userData.skyRaidArcadeReferenceDistance = 0;
    this.scene.userData.skyRaidArcadeWorldYaw = this.anchorYaw;
    this.scene.userData.skyRaidArcadeWorldAnchorX = this.anchorX;
    this.scene.userData.skyRaidArcadeWorldAnchorZ = this.anchorZ;
    this.scene.userData.skyRaidArcadeWorldLocked = true;
    this.scene.userData.skyRaidArcadeFreeFlightSectorCount = 1 + this.freeFlightCopies.length;
    this.scene.userData.skyRaidArcadeFreeFlightSectorRadius = freeFlightSectorRadius(this.stage);
  }

  dispose(): void {
    this.clearFreeFlightCopies();
    this.clearFreeFlightDepthWorld();
    this.environment.dispose();
  }
}

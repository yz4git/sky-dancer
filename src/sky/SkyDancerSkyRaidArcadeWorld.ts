import * as THREE from "three";
import { SkyDancerArcadeEnvironment } from "./arcade/SkyDancerArcadeEnvironment";
import { skyDancerArcadeStageById, type SkyDancerArcadeStageDefinition, type SkyDancerArcadeStageId } from "./arcade/SkyDancerArcadeData";
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
      // clone(true) intentionally shares immutable geometry/material resources with
      // Arcade Run. We only transform the copied hierarchy, keeping mobile memory sane.
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
      this.stage = skyDancerArcadeStageById(actId as SkyDancerArcadeStageId);
      this.environment.setStage(this.stage);

      // Capture the Arcade Run-to-free-flight frame once per ACT. The world never
      // chases the plane after this point.
      this.anchorX = x;
      this.anchorZ = z;
      this.anchorYaw = heading + Math.PI;
      this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
      this.environment.update(0, 0, 0);
      this.applyFreeFlightChunkClearance();
      this.buildFreeFlightCopies();
      suppressLegacyEnvironment(this.scene);
    }

    if (!this.stage) return;

    this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
    this.applyFreeFlightChunkClearance();
    this.freeFlightCopies.forEach((copy, index) => {
      this.positionFreeFlightSector(copy, FREE_FLIGHT_SECTOR_ANGLES[index], index);
    });

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
    this.environment.dispose();
  }
}

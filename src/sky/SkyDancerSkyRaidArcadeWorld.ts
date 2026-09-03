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

/**
 * SKY RAID keeps the Arcade Run art language but presents it as a spatial world.
 * The original authored corridor is one sector; two lightweight geometry clones
 * are rotated around the ACT anchor so a 360-degree turn still sees the same
 * architecture, fleets, canyon forms and citadel language instead of empty sky.
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
      copy.position.set(this.anchorX, -0.035 * (index + 1), this.anchorZ);
      copy.rotation.set(0, this.anchorYaw + angle, 0);
      stripDuplicateAtmosphere(copy);
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

      // Arcade Run local forward is -Z while Sky Dancer heading 0 travels +Z.
      // Capture the conversion only once per ACT. The world never chases the plane.
      this.anchorX = x;
      this.anchorZ = z;
      this.anchorYaw = heading + Math.PI;
      this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
      this.environment.update(0, 0, 0);
      this.buildFreeFlightCopies();
      suppressLegacyEnvironment(this.scene);
    }

    if (!this.stage) return;

    this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
    this.freeFlightCopies.forEach((copy, index) => {
      copy.position.set(this.anchorX, -0.035 * (index + 1), this.anchorZ);
      copy.rotation.set(0, this.anchorYaw + FREE_FLIGHT_SECTOR_ANGLES[index], 0);
    });

    this.scene.userData.skyRaidArcadeReferenceStage = this.stage.id;
    this.scene.userData.skyRaidArcadeReferenceDistance = 0;
    this.scene.userData.skyRaidArcadeWorldYaw = this.anchorYaw;
    this.scene.userData.skyRaidArcadeWorldAnchorX = this.anchorX;
    this.scene.userData.skyRaidArcadeWorldAnchorZ = this.anchorZ;
    this.scene.userData.skyRaidArcadeWorldLocked = true;
    this.scene.userData.skyRaidArcadeFreeFlightSectorCount = 1 + this.freeFlightCopies.length;
  }

  dispose(): void {
    this.clearFreeFlightCopies();
    this.environment.dispose();
  }
}

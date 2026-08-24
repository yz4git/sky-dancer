import * as THREE from "three";

interface LegacySceneryRuntime {
  scene: THREE.Scene;
}

const EXPLICIT_ROOTS = new Set([
  "sky-dancer-v19-midpoint-world",
  "sky-dancer-v22-quality-world",
  "sky-dancer-v24-horizon-silhouettes",
  "sky-dancer-v25-landmark-city",
  "sky-dancer-v27-landmark-city-ring",
  "sky-dancer-v28-mountain-depth",
  "phase67-turbo-hunt-world",
]);

const LEGACY_PREFIXES = [
  "sky-dancer-q5-",
  "sky-dancer-q11-",
  "sky-dancer-q12-",
  "sky-dancer-q13-",
  "sky-dancer-q14-",
  "sky-dancer-q15-",
  "sky-dancer-q16-",
] as const;

const SCENERY_WORDS = [
  "terrain", "field", "parcel", "mosaic", "crop", "road", "river", "city",
  "mountain", "ridge", "town", "hedgerow", "highway", "landmark",
  "settlement", "tree", "roof", "infrastructure", "scenery", "canal",
  "industrial", "ground", "wind", "skyline",
] as const;

function isLegacySceneryRoot(object: THREE.Object3D): boolean {
  if (EXPLICIT_ROOTS.has(object.name)) return true;
  if (!LEGACY_PREFIXES.some((prefix) => object.name.startsWith(prefix))) return false;
  return SCENERY_WORDS.some((word) => object.name.includes(word));
}

/**
 * V12-V19 accumulated several complete low-altitude worlds. They were useful
 * while Sky Dancer was being prototyped, but at the final 300 m flight level
 * they create duplicate cities, asphalt slabs and depth conflicts. Keep combat
 * FX from those passes, but suppress only their scenery roots. Nested explicit
 * roots are handled separately so the original V25 city can be replaced by the
 * farther, cleaner V29 reference skyline.
 */
export class SkyDancerLegacySceneryCleanupV30 {
  private readonly runtime: LegacySceneryRuntime;
  private hiddenCount = 0;

  constructor(runtime: LegacySceneryRuntime) {
    this.runtime = runtime;
  }

  update(): void {
    for (const name of EXPLICIT_ROOTS) {
      const object = this.runtime.scene.getObjectByName(name);
      if (!object?.visible) continue;
      object.visible = false;
      this.hiddenCount += 1;
    }

    for (const object of this.runtime.scene.children) {
      if (!object.visible || !isLegacySceneryRoot(object)) continue;
      object.visible = false;
      this.hiddenCount += 1;
    }
  }

  getHiddenCount(): number {
    return this.hiddenCount;
  }
}

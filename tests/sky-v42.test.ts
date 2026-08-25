import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SKY_DANCER_V40_LOCK_HALF_ANGLE,
  SKY_DANCER_V42_CLEANUP_HOLD_FOLLOW_SPEED,
} from "../src/sky/SkyDancerReengagementV40";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("V42 player surface kit shares the banked player visual root", () => {
  const source = read("../src/sky/presentation/SkyDancerV37AircraftCombatPass.ts");
  assert.match(source, /attachBankedPlayerPresentation/);
  assert.match(source, /const bankedVisualRoot = this\.runtime\.playerVisual/);
  assert.match(source, /bankedVisualRoot\.add\(this\.playerKit\)/);
  assert.match(source, /bankedVisualRoot\.add\(this\.speedLines\)/);
  assert.doesNotMatch(source, /const flightRoot = this\.runtime\.session\.car\.group/);
  assert.match(source, /__skyDancerGetV42AircraftAttachment/);
});

test("V42 cleanup holding aircraft do not rotate with live player yaw", () => {
  const source = read("../src/sky/SkyDancerReengagementV40.ts");
  assert.ok(SKY_DANCER_V42_CLEANUP_HOLD_FOLLOW_SPEED >= 31.5);
  assert.ok(SKY_DANCER_V42_CLEANUP_HOLD_FOLLOW_SPEED <= 40);
  assert.match(source, /cleanupHoldOffsets: new Map/);
  assert.match(source, /cleanupHoldOffsets\.set\(enemy\.id, \{ x: hold\.x - px, z: hold\.z - pz \}\)/);
  assert.match(source, /const holdX = px \+ offset\.x/);
  assert.match(source, /const holdZ = pz \+ offset\.z/);
  assert.match(source, /const tangentHeading = normalizeAngle\(radial \+ side \* Math\.PI \* 0\.5\)/);
  assert.match(source, /SKY_DANCER_V42_CLEANUP_HOLD_FOLLOW_SPEED \* delta/);
  assert.ok(SKY_DANCER_V40_LOCK_HALF_ANGLE < 1.0);
});

test("V42 normal wave flight never uses angle-only screen-edge correction", () => {
  const source = read("../src/sky/SkyDancerReengagementV40.ts");
  assert.match(source, /const needsDistanceCorrection = distance > trigger/);
  assert.match(source, /const needsAngleCorrection = cleanup\s*\? lockAngle > angleTrigger\s*:\s*needsDistanceCorrection && lockAngle > angleTrigger/);
  assert.match(source, /Inside the range envelope, V41 owns natural turn\/acceleration/);
});

test("V42 ground scenery stays world anchored instead of snapping every 420m", () => {
  const v36 = read("../src/sky/presentation/SkyDancerV36WorldGeometryPass.ts");
  const v40 = read("../src/sky/presentation/SkyDancerV40CityExpansionPass.ts");
  for (const source of [v36, v40]) {
    assert.match(source, /skyDancerV42StableGroundAnchor/);
    assert.match(source, /if \(this\.anchored\) return/);
  }
  assert.match(v36, /__skyDancerGetV36WorldDebug/);
  assert.match(v40, /rootPosition:/);
  assert.doesNotMatch(v36, /if \(tileX === this\.tileX && tileZ === this\.tileZ\) return/);
  assert.doesNotMatch(v40, /if \(tileX === this\.tileX && tileZ === this\.tileZ\) return/);
});

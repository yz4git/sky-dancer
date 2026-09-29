import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V4052_ICE,
  skyDancerArcadeV4052IceEnemyContrast,
} from "../src/sky/arcade/SkyDancerArcadeV4052IceCavernComposition";

test("V40.52 pushes Ice Cavern near-pass scenery outside the old phone corridor", () => {
  assert.ok(SKY_DANCER_ARCADE_V4052_ICE.nearPassClearance >= 44);
  assert.ok(SKY_DANCER_ARCADE_V4052_ICE.chunkInnerClearance >= 42);
  assert.ok(SKY_DANCER_ARCADE_V4052_ICE.routeFangClearance >= 20);
  assert.ok(SKY_DANCER_ARCADE_V4052_ICE.routeFloorShardClearance >= 22);
});

test("V40.52 ice contact lights strengthen toward close combat", () => {
  const far = skyDancerArcadeV4052IceEnemyContrast({ depth: 60, priority: false, incomingThreat: false });
  const close = skyDancerArcadeV4052IceEnemyContrast({ depth: 14, priority: false, incomingThreat: false });
  assert.equal(far.visible, true);
  assert.equal(close.visible, true);
  assert.ok(close.opacity > far.opacity);
  assert.ok(close.pointSize > far.pointSize);
});

test("V40.52 priority and hostile launch increase contact separation without becoming a HUD ring", () => {
  const base = skyDancerArcadeV4052IceEnemyContrast({ depth: 24, priority: false, incomingThreat: false });
  const priority = skyDancerArcadeV4052IceEnemyContrast({ depth: 24, priority: true, incomingThreat: false });
  const firing = skyDancerArcadeV4052IceEnemyContrast({ depth: 24, priority: true, incomingThreat: true });
  assert.ok(priority.opacity > base.opacity);
  assert.ok(priority.pointSize > base.pointSize);
  assert.ok(firing.opacity > priority.opacity);
  assert.ok(firing.pointSize > priority.pointSize);
  assert.ok(firing.pointSize < 7);
});

test("V40.52 contact lights disappear outside the useful combat depth window", () => {
  assert.equal(skyDancerArcadeV4052IceEnemyContrast({ depth: 3, priority: true, incomingThreat: true }).visible, false);
  assert.equal(skyDancerArcadeV4052IceEnemyContrast({ depth: 82, priority: true, incomingThreat: true }).visible, false);
});

test("V40.52 Reference World uses the cathedral silhouette and side-biased ice geometry", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /arcade-v4052-ice-cathedral/);
  assert.match(source, /arcadeIceV4052CathedralClearance/);
  assert.match(source, /SKY_DANCER_ARCADE_V4052_ICE\.routeRibOffset/);
  assert.match(source, /SKY_DANCER_ARCADE_V4052_ICE\.routeFangClearance/);
  assert.match(source, /SKY_DANCER_ARCADE_V4052_ICE\.routeFloorShardClearance/);
  assert.match(source, /SKY_DANCER_ARCADE_V4052_ICE\.nearPassClearance/);
});

test("V40.52 WebGL renderer adds physical hostile navigation lights only in Ice Cavern", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /snapshot\.stage\.id === "ice-cavern" && !enemy\.boss/);
  assert.match(source, /arcade-v4052-ice-contact-lights/);
  assert.match(source, /sizeAttenuation: false/);
  assert.match(source, /skyDancerArcadeV4052IceEnemyContrast/);
  assert.doesNotMatch(source, /arcade-v4052-ice-contact-ring/);
});

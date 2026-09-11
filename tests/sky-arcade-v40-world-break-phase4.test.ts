import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_FLOATING_PORTALS,
  SKY_DANCER_ARCADE_V40_ICE_APERTURES,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 4 activates Ice Cavern and Floating Ruins as physical World Break stages", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("ice-cavern").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("ice-cavern").signature, "CRYSTAL TUNNEL");
  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").signature, "SKY LABYRINTH");
});

test("V40 Ice Cavern resolves shrinking apertures and rewards a perfect escape", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "ice-cavern", seed: 4048 });
  const before = runtime.getSnapshot().score;
  for (const aperture of SKY_DANCER_ARCADE_V40_ICE_APERTURES) runtime.triggerV40IceApertureForTests(aperture.index, true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakIceHits, SKY_DANCER_ARCADE_V40_ICE_APERTURES.length);
  assert.equal(snapshot.worldBreakIceMisses, 0);
  assert.equal(snapshot.worldBreakIcePerfect, true);
  assert.ok(snapshot.score > before);
});

test("V40 Ice Cavern collapse can damage the player without ending the stage objective", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "ice-cavern", seed: 4049 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40IceApertureForTests(0, false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakIceMisses, 1);
  assert.ok(snapshot.playerHp < hp);
  assert.equal(snapshot.worldBreakIceIndex, 1);
});

test("V40 Floating Ruins portals alter the following section score/pressure contract", () => {
  const flowRun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "floating-ruins", seed: 4050 });
  flowRun.triggerV40FloatingPortalForTests(0);
  const flow = flowRun.getSnapshot();
  assert.equal(flow.worldBreakPortalDoctrine, "FLOW");
  assert.equal(flow.worldBreakPortalChoiceIndex, 0);

  const dangerRun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "floating-ruins", seed: 4051 });
  dangerRun.triggerV40FloatingPortalForTests(2);
  const danger = dangerRun.getSnapshot();
  assert.equal(danger.worldBreakPortalDoctrine, "DANGER");
  assert.ok(danger.worldBreakPortalScoreMultiplier > flow.worldBreakPortalScoreMultiplier);
  assert.ok(danger.worldBreakPortalPressureScale < flow.worldBreakPortalPressureScale);
  assert.equal(danger.worldBreakPortals.filter((portal) => portal.selected).length, 1);
  assert.equal(danger.worldBreakPortals.length, SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.length);
});

test("V40 phase 4 keeps WebGL and Canvas parity for crystal and portal objectives", () => {
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.match(webgl, /syncWorldBreakIceCollapse\(snapshot\)/);
  assert.match(webgl, /syncWorldBreakFloatingPortals\(snapshot\)/);
  assert.match(webgl, /worldBreakIceRoot/);
  assert.match(webgl, /worldBreakPortalRoot/);
  assert.match(canvas, /drawWorldBreakIceCollapse\(context, snapshot/);
  assert.match(canvas, /drawWorldBreakFloatingPortals\(context, snapshot/);
});

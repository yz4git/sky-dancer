import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP,
  skyDancerArcadeV40NeonPhantomX,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 5 activates Night Metro and Volcano Core as distinct World Break stages", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("night-metro").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("night-metro").signature, "NEON PURSUIT");
  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").signature, "MAGMA PRESSURE");
});

test("V40 Night Metro phantom is a moving pursuit target and can be physically caught", () => {
  assert.notEqual(skyDancerArcadeV40NeonPhantomX(4), skyDancerArcadeV40NeonPhantomX(4.5));
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "night-metro", seed: 4054 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40NeonPursuitForTests(true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPursuitCaught, true);
  assert.equal(snapshot.worldBreakPursuitResolved, true);
  assert.equal(snapshot.worldBreakPursuitGap, SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP);
  assert.ok(snapshot.score > before);
});

test("V40 Night Metro can lose the phantom without fake collision damage", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "night-metro", seed: 4055 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40NeonPursuitForTests(false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPursuitResolved, true);
  assert.equal(snapshot.worldBreakPursuitCaught, false);
  assert.equal(snapshot.playerHp, hp);
});

test("V40 Volcano Core eruption pressure can catch and damage the player then restore escape lead", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "volcano-core", seed: 4056 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40MagmaPressureForTests(true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakMagmaHits, 1);
  assert.ok(snapshot.playerHp < hp);
  assert.ok(snapshot.worldBreakMagmaLead > 0);
});

test("V40 Volcano Core awards a clean outrun when the eruption never reaches the aircraft", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "volcano-core", seed: 4057 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40MagmaPressureForTests(false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakMagmaResolved, true);
  assert.equal(snapshot.worldBreakMagmaEscaped, true);
  assert.equal(snapshot.worldBreakMagmaHits, 0);
  assert.equal(snapshot.worldBreakMagmaLead, SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD);
  assert.ok(snapshot.score > before);
});

test("V40 phase 5 keeps WebGL and Canvas parity for pursuit and eruption pressure", () => {
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.match(webgl, /syncWorldBreakNeonPursuit\(snapshot\)/);
  assert.match(webgl, /syncWorldBreakMagmaPressure\(snapshot\)/);
  assert.match(webgl, /worldBreakPursuitRoot/);
  assert.match(webgl, /worldBreakMagmaRoot/);
  assert.match(canvas, /drawWorldBreakNeonPursuit\(context, snapshot/);
  assert.match(canvas, /drawWorldBreakMagmaPressure\(context, snapshot/);
});

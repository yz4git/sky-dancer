import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("SKY RAID uses the real Arcade Run environment as a stationary free-flight world", async () => {
  const world = await readFile(new URL("../src/sky/SkyDancerSkyRaidArcadeWorld.ts", import.meta.url), "utf8");
  assert.match(world, /SkyDancerArcadeEnvironment/);
  assert.match(world, /this\.anchorX = x/);
  assert.match(world, /this\.anchorZ = z/);
  assert.match(world, /this\.anchorYaw = heading \+ Math\.PI/);
  assert.match(world, /setWorldFrame\(this\.anchorX, 0, this\.anchorZ, this\.anchorYaw\)/);
  assert.match(world, /skyRaidFreeFlightWorld = true/);
  assert.match(world, /skyRaidArcadeWorldLocked = true/);
  assert.doesNotMatch(world, /localSeconds \* this\.stage\.courseSpeed/);
  assert.doesNotMatch(world, /desiredYaw/);
  assert.doesNotMatch(world, /dampAngle/);
  assert.doesNotMatch(world, /InstancedMesh/);
});

test("SKY RAID final visual owner runs after V53", async () => {
  const pipeline = await readFile(new URL("../src/sky/presentation/SkyDancerPresentationPipeline.ts", import.meta.url), "utf8");
  assert.ok(pipeline.indexOf("finalizeSkyRaidReferencePresentation(this.runtime)") > pipeline.indexOf("this.v53.update(snapshot)"));
});

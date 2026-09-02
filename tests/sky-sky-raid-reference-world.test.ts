import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
test("SKY RAID uses the real Arcade Run environment", async () => {
  const world = await readFile(new URL("../src/sky/SkyDancerSkyRaidArcadeWorld.ts", import.meta.url), "utf8");
  assert.match(world, /SkyDancerArcadeEnvironment/);
  assert.match(world, /setWorldFrame\(x, 0, z, this\.worldYaw\)/);
  assert.doesNotMatch(world, /InstancedMesh/);
});
test("SKY RAID final visual owner runs after V53", async () => {
  const pipeline = await readFile(new URL("../src/sky/presentation/SkyDancerPresentationPipeline.ts", import.meta.url), "utf8");
  assert.ok(pipeline.indexOf("finalizeSkyRaidReferencePresentation(this.runtime)") > pipeline.indexOf("this.v53.update(snapshot)"));
});

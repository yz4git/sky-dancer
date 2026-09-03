import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("SKY RAID uses Arcade Run scenery as a stationary 360-degree free-flight world", async () => {
  const world = await readFile(new URL("../src/sky/SkyDancerSkyRaidArcadeWorld.ts", import.meta.url), "utf8");
  assert.match(world, /SkyDancerArcadeEnvironment/);
  assert.match(world, /this\.anchorX = x/);
  assert.match(world, /this\.anchorZ = z/);
  assert.match(world, /this\.anchorYaw = heading \+ Math\.PI/);
  assert.match(world, /setWorldFrame\(this\.anchorX, 0, this\.anchorZ, this\.anchorYaw\)/);
  assert.match(world, /FREE_FLIGHT_SECTOR_ANGLES/);
  assert.match(world, /Math\.PI \* 2 \/ 3/);
  assert.match(world, /skyRaidArcadeFreeFlightSectors = 3/);
  assert.match(world, /skyRaidFreeFlightWorld = true/);
  assert.match(world, /skyRaidArcadeWorldLocked = true/);
  assert.doesNotMatch(world, /localSeconds \* this\.stage\.courseSpeed/);
  assert.doesNotMatch(world, /desiredYaw/);
  assert.doesNotMatch(world, /dampAngle/);
});

test("SKY RAID has a substantially wider vertical envelope and final camera tracking", async () => {
  const flight = await readFile(new URL("../src/sky/SkyDancerSkyRaidFlight.ts", import.meta.url), "utf8");
  const raid = await readFile(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(flight, /SKY_RAID_MIN_ALTITUDE = -18/);
  assert.match(flight, /SKY_RAID_MAX_ALTITUDE = 64/);
  assert.match(flight, /boost \? 22 : 16/);
  assert.match(raid, /skyRaidCameraPresentation/);
  assert.match(raid, /skyRaidPlayerPitch = flight\.pitch/);
  assert.match(raid, /this\.playerVisual\.position\.y = 0\.62 \+ altitude/);
  assert.match(raid, /this\.playerVisual\.rotation\.x = pitch/);
  assert.match(raid, /this\.playerVisual\.rotation\.z = bank/);
  assert.match(raid, /altitudeEdgeBlend/);
  assert.match(raid, /desiredPlayerNdcY = -0\.22/);
  assert.match(raid, /frameCorrection/);
  assert.doesNotMatch(raid, /demo\.camera\.position\.y \+= flight\.altitude/);
});

test("SKY RAID final visual owner runs after V53", async () => {
  const pipeline = await readFile(new URL("../src/sky/presentation/SkyDancerPresentationPipeline.ts", import.meta.url), "utf8");
  assert.ok(pipeline.indexOf("finalizeSkyRaidReferencePresentation(this.runtime)") > pipeline.indexOf("this.v53.update(snapshot)"));
});


test("SKY RAID camera derives chase position from aircraft heading", async () => {
  const source = await readFile(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(source, /const forwardX = Math\.sin\(snapshot\.heading\)/);
  assert.match(source, /const forwardZ = Math\.cos\(snapshot\.heading\)/);
  assert.match(source, /this\.camera\.position\.set\(/);
  assert.match(source, /this\.playerVisual\.getWorldPosition\(playerPosition\)/);
  assert.match(source, /playerPosition\.x - forwardX \* chaseDistance/);
  assert.match(source, /playerPosition\.z - forwardZ \* chaseDistance/);
  assert.doesNotMatch(source, /this\.camera\.position\.y \+= altitude/);
});

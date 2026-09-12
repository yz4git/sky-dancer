import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING,
  skyDancerArcadeV4018EnvironmentFraming,
} from "../src/sky/arcade/SkyDancerArcadeV4018EnvironmentFraming";

const base = {
  compactLandscape: true,
  stageBiome: "storm" as const,
  stageOrder: 4,
  rhythmPhase: "boss-rise" as const,
};

test("V40.18 is identity on desktop and during non-climax phases", () => {
  assert.deepEqual(
    skyDancerArcadeV4018EnvironmentFraming({ ...base, compactLandscape: false }),
    SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING,
  );
  assert.deepEqual(
    skyDancerArcadeV4018EnvironmentFraming({ ...base, rhythmPhase: "handoff" }),
    SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING,
  );
});

test("V40.18 pre-clears the corridor most strongly during boss rise", () => {
  const rise = skyDancerArcadeV4018EnvironmentFraming(base);
  const boss = skyDancerArcadeV4018EnvironmentFraming({ ...base, rhythmPhase: "boss" });
  const rival = skyDancerArcadeV4018EnvironmentFraming({ ...base, rhythmPhase: "rival" });
  assert.equal(rise.pressure, 1);
  assert.ok(rise.chunkSpreadX > boss.chunkSpreadX);
  assert.ok(boss.chunkSpreadX > rival.chunkSpreadX);
});

test("V40.18 gives clutter-heavy aerial stages more side framing than city", () => {
  const storm = skyDancerArcadeV4018EnvironmentFraming(base);
  const city = skyDancerArcadeV4018EnvironmentFraming({ ...base, stageBiome: "city" });
  assert.ok(storm.chunkSpreadX - 1 > (city.chunkSpreadX - 1) * 2);
  assert.ok(Math.abs(storm.backdropShiftX) > Math.abs(city.backdropShiftX));
});

test("V40.18 uses a stable authored side for distant backdrop framing", () => {
  const even = skyDancerArcadeV4018EnvironmentFraming(base);
  const odd = skyDancerArcadeV4018EnvironmentFraming({ ...base, stageOrder: 5 });
  assert.ok(even.backdropShiftX > 0);
  assert.ok(odd.backdropShiftX < 0);
});

test("V40.18 wiring moves decorative chunks/backdrop only, not route collision visuals", () => {
  const world = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8");
  const webgl = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(world, /chunk\.group\.scale\.x=this\.v4018ChunkSpreadX/);
  assert.match(world, /this\.backdrop\.scale\.x=this\.v4018BackdropSpreadX/);
  assert.doesNotMatch(world, /terrainRibbon\.scale\.x=this\.v4018|cityRiver\.(?:surface|bed)\.scale\.x=this\.v4018|cityBanks\.(?:left|right)\.scale\.x=this\.v4018/);
  assert.match(webgl, /skyDancerArcadeV4018EnvironmentFraming/);
  assert.match(webgl, /this\.environment\.update\(snapshot\.distance, snapshot\.playerX, snapshot\.playerY, v4018Framing, delta\)/);
  assert.doesNotMatch(runtime, /V4018EnvironmentFraming|v4018Framing/);
});

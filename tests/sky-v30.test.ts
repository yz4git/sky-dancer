import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("V30 owns final world composition in a dedicated controller", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerWorldPresentationV30.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v30-world-presentation/);
  assert.match(source, /sky-dancer-v30-ground-foundation/);
  assert.match(source, /transparent: false/);
  assert.match(source, /depthWrite: true/);
  assert.match(source, /FOUNDATION_CHUNKS = 12/);
  assert.match(source, /sky-dancer-v27-landmark-city-ring/);
  assert.match(source, /sky-dancer-v28-mountain-depth/);
});

test("V30 removes ground holes and keeps modern valley layers opaque", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerWorldPresentationV30.ts", import.meta.url), "utf8");
  assert.match(source, /patchwork\.material\.transparent = false/);
  assert.match(source, /valley\.material\.transparent = false/);
  assert.match(source, /foundationDepthWrite/);
  assert.match(source, /__skyDancerGetWorldPresentationDebug/);
});

test("V30 replaces the oversized legacy mountain silhouettes with a lighter belt", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerWorldPresentationV30.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v30-mountain-belt/);
  assert.match(source, /const count = 96/);
  assert.match(source, /radius = 420/);
  assert.match(source, /sky-dancer-v24-horizon-silhouettes/);
});

test("V30 is the active Sky Dancer effects entry point", () => {
  const entry = readFileSync(new URL("../src/sky/SkyDancerAirCombatFx.ts", import.meta.url), "utf8");
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV30.ts", import.meta.url), "utf8");
  assert.match(entry, /SkyDancerAirCombatFxV30 as SkyDancerAirCombatFx/);
  assert.match(source, /extends SkyDancerAirCombatFxV29/);
  assert.match(source, /SkyDancerWorldPresentationV30/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("V31 activates the ground density and cloud quality pass", () => {
  const entry = readFileSync(new URL("../src/sky/SkyDancerAirCombatFx.ts", import.meta.url), "utf8");
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV31.ts", import.meta.url), "utf8");
  assert.match(entry, /SkyDancerAirCombatFxV31 as SkyDancerAirCombatFx/);
  assert.match(source, /extends SkyDancerAirCombatFxV30/);
  assert.match(source, /SkyDancerGroundDensityV31/);
  assert.match(source, /SkyDancerGroundReadabilityV31/);
  assert.match(source, /SkyDancerCloudQualityV31/);
  assert.match(source, /groundDensity\.update\(snapshot\)/);
  assert.match(source, /groundReadability\.update\(\)/);
  assert.match(source, /cloudQuality\.update\(snapshot\)/);
});

test("V31 ground density uses a deterministic 5x5 instanced neighborhood", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerGroundDensityV31.ts", import.meta.url), "utf8");
  assert.match(source, /TILE_RADIUS = 2/);
  assert.match(source, /sky-dancer-v31-patchwork-fields/);
  assert.match(source, /sky-dancer-v31-settlement-buildings/);
  assert.match(source, /sky-dancer-v31-forest-belts/);
  assert.match(source, /sky-dancer-v31-road-network/);
  assert.match(source, /sky-dancer-v31-landmark-towers/);
  assert.match(source, /fieldCount = 6/);
  assert.match(source, /InstancedMesh/);
  assert.match(source, /transparent: false/);
  assert.match(source, /depthWrite: true/);
  assert.match(source, /function pick/);
});

test("V31 keeps district scale authored in one place and only tunes atmosphere in the readability pass", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerGroundReadabilityV31.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v31-patchwork-fields/);
  assert.doesNotMatch(source, /geometry\.scale/);
  assert.match(source, /Fog\(0x5da4be, 690, 1760\)/);
});

test("V31 replaces legacy clouds with sparse distant three-layer cumulus clusters", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerCloudQualityV31.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v31-low-clouds/);
  assert.match(source, /sky-dancer-v31-mid-clouds/);
  assert.match(source, /sky-dancer-v31-horizon-clouds/);
  assert.match(source, /IcosahedronGeometry\(1, 1\)/);
  assert.match(source, /clusters: 8/);
  assert.match(source, /radiusMin: 500/);
  assert.match(source, /radiusMin: 820/);
  assert.match(source, /solid: true/);
  assert.match(source, /depthWrite: config\.solid/);
  assert.match(source, /name\.includes\("cloud"\)/);
  assert.match(source, /DodecahedronGeometry/);
});

test("V31 tilts only the final camera view slightly downward for more landscape", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV31.ts", import.meta.url), "utf8");
  assert.match(source, /queueMicrotask/);
  assert.match(source, /applyCameraPresentation/);
  assert.match(source, /camera\.rotateX\(-0\.075\)/);
});

test("V31 removes world-space boss HP obstruction and moves boss HUD off center", () => {
  const fx = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV31.ts", import.meta.url), "utf8");
  const hud = readFileSync(new URL("../app/SkyDancerHudV31.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const pages = readFileSync(new URL("../pages-entry.tsx", import.meta.url), "utf8");
  assert.match(fx, /hideBossWorldGauge/);
  assert.match(fx, /skyDancerV31BossWorldGaugeHidden/);
  assert.match(hud, /bossMeter/);
  assert.match(hud, /left: max\(14px/);
  assert.match(hud, /width: min\(31vw, 252px\)/);
  assert.match(app, /SkyDancerHudV31/);
  assert.match(pages, /SkyDancerHudV31/);
});

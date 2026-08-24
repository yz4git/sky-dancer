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

test("V31 ground density uses a deterministic 7x7 instanced neighborhood", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerGroundDensityV31.ts", import.meta.url), "utf8");
  assert.match(source, /TILE_RADIUS = 3/);
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

test("V31 keeps district scale authored in one place and balances the legacy skyline", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerGroundReadabilityV31.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v31-patchwork-fields/);
  assert.doesNotMatch(source, /geometry\.scale/);
  assert.match(source, /sky-dancer-v29-reference-skyline/);
  assert.match(source, /scale\.setScalar\(0\.72\)/);
  assert.match(source, /Fog\(0x5b9fb9, 760, 1780\)/);
});

test("V31 replaces legacy clouds with evenly distributed compact cumulus clusters", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerCloudQualityV31.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v31-low-clouds/);
  assert.match(source, /sky-dancer-v31-mid-clouds/);
  assert.match(source, /sky-dancer-v31-horizon-clouds/);
  assert.match(source, /IcosahedronGeometry\(1, 1\)/);
  assert.match(source, /clusters: 12/);
  assert.match(source, /radiusMin: 250/);
  assert.match(source, /radiusMin: 590/);
  assert.match(source, /evenAngle = cluster \/ config\.clusters/);
  assert.match(source, /solid: true/);
  assert.match(source, /depthWrite: config\.solid/);
  assert.match(source, /name\.includes\("cloud"\)/);
  assert.match(source, /DodecahedronGeometry/);
});

test("V31 tilts only the final camera view downward for more landscape", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV31.ts", import.meta.url), "utf8");
  assert.match(source, /queueMicrotask/);
  assert.match(source, /applyCameraPresentation/);
  assert.match(source, /camera\.rotateX\(-0\.20\)/);
});

test("V31 preserves green land by replacing the full-screen V30 blue grade in both runtimes", () => {
  const grade = readFileSync(new URL("../app/SkyDancerColorGradeV31.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const pages = readFileSync(new URL("../pages-entry.tsx", import.meta.url), "utf8");
  assert.match(grade, /rgba\(0, 0, 0, 0\) 61%/);
  assert.match(grade, /mix-blend-mode: multiply/);
  assert.match(app, /SkyDancerColorGradeV31/);
  assert.doesNotMatch(app, /SkyDancerColorGradeV30/);
  assert.match(pages, /SkyDancerColorGradeV31/);
  assert.doesNotMatch(pages, /SkyDancerColorGradeV30/);
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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("V32 activates the reference quality pass on top of V31 without colliding with V25 referenceWorld", () => {
  const entry = readFileSync(new URL("../src/sky/SkyDancerAirCombatFx.ts", import.meta.url), "utf8");
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV32.ts", import.meta.url), "utf8");
  assert.match(entry, /SkyDancerAirCombatFxV32 as SkyDancerAirCombatFx/);
  assert.match(entry, /SkyDancerAirCombatFxV31 as SkyDancerAirCombatFx/);
  assert.match(source, /extends SkyDancerAirCombatFxV31/);
  assert.match(source, /SkyDancerReferenceWorldV32/);
  assert.match(source, /SkyDancerReferencePolishV32/);
  assert.match(source, /referencePresentation\.update\(snapshot\)/);
  assert.match(source, /referencePolish\.update\(snapshot\)/);
  assert.doesNotMatch(source, /private readonly referenceWorld:/);
});

test("V32 removes close blob hills and composes shallow ridges plus clustered cities", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerReferenceWorldV32.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v30-mountain-belt/);
  assert.match(source, /sky-dancer-v31-settlement-buildings/);
  assert.match(source, /sky-dancer-v32-ridge-near/);
  assert.match(source, /sky-dancer-v32-ridge-far/);
  assert.doesNotMatch(source, /sky-dancer-v32-rolling-hills/);
  assert.match(source, /sky-dancer-v32-city-low/);
  assert.match(source, /sky-dancer-v32-city-high/);
  assert.match(source, /districtCount = 7/);
  assert.match(source, /\? 44/);
  assert.match(source, /height = 68/);
});

test("V32 builds compact multi-lobe cumulus banks and a dedicated blue sky dome", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerReferenceWorldV32.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v32-hero-clouds/);
  assert.match(source, /sky-dancer-v32-hero-cloud-shade/);
  assert.match(source, /clusters = 6/);
  assert.match(source, /lobes = 14/);
  assert.match(source, /upper = l >= 9/);
  assert.match(source, /sky-dancer-v32-sky-dome/);
  assert.match(source, /vec3 zenith/);
  assert.match(source, /sky-dancer-v25-horizon-cloud-banks/);
  assert.match(source, /sky-dancer-v29-reference-cloud-bank/);
  assert.match(source, /restoreOwnPresentation/);
});

test("V32 final polish replaces first-pass ridges cities and clouds with distant cohesive composition", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerReferencePolishV32.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-v32-polish-ridge-near/);
  assert.match(source, /sky-dancer-v32-polish-ridge-far/);
  assert.match(source, /IcosahedronGeometry\(1, 1\)/);
  assert.match(source, /sky-dancer-v32-polish-city-high/);
  assert.match(source, /cx = 365/);
  assert.match(source, /radius = 420/);
  assert.match(source, /sky-dancer-v32-polish-cloud-main/);
  assert.match(source, /clusters = 5/);
  assert.match(source, /lobes = 18/);
  assert.match(source, /sky-dancer-v32-ridge-near/);
  assert.match(source, /object\.visible = false/);
});

test("V32 increases hero aircraft presence without changing gameplay collision", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerReferenceWorldV32.ts", import.meta.url), "utf8");
  const polish = readFileSync(new URL("../src/sky/SkyDancerReferencePolishV32.ts", import.meta.url), "utf8");
  assert.match(source, /player\.scale\.multiplyScalar\(1\.32\)/);
  assert.match(polish, /player\.scale\.multiplyScalar\(1\.28\)/);
  assert.match(source, /sky-dancer-v32-player-detail/);
  assert.match(source, /CylinderGeometry\(0\.29, 0\.34, 0\.98, 8\)/);
  assert.match(source, /TorusGeometry\(0\.24, 0\.045, 5, 10\)/);
  assert.match(source, /wingTip/);
});

test("V32 restores reference-like horizon balance after the V31 look-down pass", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV32.ts", import.meta.url), "utf8");
  assert.match(source, /installReferenceCameraComposition/);
  assert.match(source, /camera\.rotateX\(0\.095\)/);
  assert.match(source, /skyDancerV32ReferenceCamera/);
});

test("V32 HUD polish is mounted in app and static pages runtimes", () => {
  const hud = readFileSync(new URL("../app/SkyDancerHudV32.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const pages = readFileSync(new URL("../pages-entry.tsx", import.meta.url), "utf8");
  assert.match(hud, /data-sd-gas-card/);
  assert.match(hud, /data-sd-turbo-card/);
  assert.match(hud, /Fire missile/);
  assert.match(app, /SkyDancerHudV32/);
  assert.match(pages, /SkyDancerHudV32/);
});

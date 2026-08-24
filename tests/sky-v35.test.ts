import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("V35 locks the supplied reference image as the graphics quality contract", () => {
  const contract = read("../docs/SKY_DANCER_REFERENCE_ART_DIRECTION_V35.md");
  assert.match(contract, /visual north star/i);
  assert.match(contract, /City density is the primary ground focal point/);
  assert.match(contract, /Clouds stay below the flight plane/);
  assert.match(contract, /If V35 visual capture is visibly worse than V32\/V33/);
});

test("V35 presentation is the final owner after V34 without reviving version inheritance", () => {
  const pipeline = read("../src/sky/presentation/SkyDancerPresentationPipeline.ts");
  assert.match(pipeline, /SkyDancerV35ReferencePass/);
  assert.match(pipeline, /this\.v34\.update\(snapshot\);\n    this\.v35\.update\(snapshot\);/);
});

test("V35 recovers city detail lost by V34 and replaces degraded horizon layers", () => {
  const source = read("../src/sky/presentation/SkyDancerV35ReferencePass.ts");
  assert.match(source, /sky-dancer-v31-patchwork-fields/);
  assert.match(source, /sky-dancer-v31-settlement-buildings/);
  assert.match(source, /sky-dancer-v31-landmark-towers/);
  assert.match(source, /sky-dancer-v34-irregular-terrain-masses/);
  assert.match(source, /sky-dancer-v35-reference-metro/);
  assert.match(source, /sky-dancer-v35-metro-road-grid/);
  assert.match(source, /sky-dancer-v35-metro-river/);
  assert.match(source, /sky-dancer-v35-angular-mountains/);
  assert.match(source, /sky-dancer-v35-below-flight-clouds/);
  assert.match(source, /new THREE\.ConeGeometry\(1, 1, 6\)/);
  assert.match(source, /fog\.near = 620/);
  assert.match(source, /fog\.far = 1760/);
});

test("V35 reference framing lowers the horizon without changing the 300m gameplay model", () => {
  const camera = read("../src/sky/presentation/SkyDancerCameraPresentation.ts");
  const pass = read("../src/sky/presentation/SkyDancerV35ReferencePass.ts");
  assert.match(camera, /scheduleSkyDancerV35ReferenceFraming/);
  assert.match(camera, /cameraRuntime\.camera\.rotateX\(0\.085\)/);
  assert.doesNotMatch(pass, /SKY_DANCER_V29_ALTITUDE_METERS\s*=/);
});

test("V35 HUD follows the reference hierarchy using real existing telemetry", () => {
  const hud = read("../app/SkyDancerHudV35.tsx");
  const game = read("../app/CartRogueGamePhase13.tsx");
  assert.match(game, /<SkyDancerHudV34 \/>\n        <SkyDancerHudV35 \/>/);
  assert.match(hud, /aria-label="Missile warning"/);
  assert.match(hud, /left: 50% !important/);
  assert.match(hud, /bottom: max\(88px/);
  assert.match(hud, /does not yet own/);
  assert.doesNotMatch(hud, /1,250|x2\.4|VX-23/);
});

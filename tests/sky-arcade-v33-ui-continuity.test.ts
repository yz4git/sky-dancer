import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("V33 route gates retain an authored exit shot after route resolution", () => {
  const webgl = read("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts");
  assert.match(webgl, /branchGateExitTimer = 0/);
  assert.match(webgl, /this\.previousSnapshot\.branchActive && !snapshot\.branchActive/);
  assert.match(webgl, /const presenting = snapshot\.branchActive \|\| exiting/);
  assert.match(webgl, /selected \? 1\.2 \+ exitProgress \* 1\.18/);
  assert.doesNotMatch(webgl, /this\.branchRoot\.visible = snapshot\.branchActive;\n\s*if \(!snapshot\.branchActive\) return/);
});

test("V33 route and boss HUDs stay mounted for CSS exit transitions", () => {
  const mode = read("app/SkyDancerArcadeMode.tsx");
  const css = read("app/SkyDancerArcadeMode.module.css");
  assert.match(mode, /const bossHudVisible = snapshot\.bossActive \|\| Boolean/);
  assert.match(mode, /const routeOverlayVisible = snapshot\.branchActive \|\| Boolean/);
  assert.match(mode, /styles\.bossHudExit/);
  assert.match(mode, /styles\.routeResolved/);
  assert.match(mode, /TARGET DESTROYED · WRECK CLEARING/);
  assert.match(mode, /ROUTE COMMITTED/);
  assert.match(css, /\.bossHudExit\{opacity:0/);
  assert.match(css, /\.routeResolved\{opacity:0/);
  assert.match(css, /@keyframes bossHudIn/);
  assert.match(css, /@keyframes routeOverlayIn/);
});

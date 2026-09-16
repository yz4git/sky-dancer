import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.module.css"), "utf8");

test("V40.39 exposes climax-approach state to the HUD hierarchy", () => {
  assert.match(mode, /data-v4039-boss-approach=\{bossApproachPresentationActive \? "true" : "false"\}/);
  assert.match(css, /\.stage\[data-v4039-boss-approach="true"\] \.timelineV407\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /\.stage\[data-v4039-boss-approach="true"\] \.sectionIntro\s*\{\s*display:\s*none/);
});

test("V40.39 compacts the climax warning in phone landscape without removing it", () => {
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 430px\)[\s\S]*?\.bossApproach\s*\{[\s\S]*?width:\s*min\(360px, 44vw\)/);
  assert.match(css, /\.bossApproach strong\s*\{[^}]*font-size:\s*clamp\(12px, 1\.75vw, 15px\)/s);
  assert.match(css, /\.bossApproach > i\s*\{[^}]*height:\s*2px/s);
});

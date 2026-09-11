import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("V29 enemy airframes consume semantic role colors and role-colored beacons", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeEnemyAirframes.ts"), "utf8");
  assert.match(source, /SkyDancerArcadeV29EnemyColorIdentity/);
  assert.match(source, /materials\(stage, kind\)/);
  assert.match(source, /createRoundBeaconsV18\(built\.span, built\.rearZ, colorIdentityV29\.secondary, colorIdentityV29\.glow\)/);
  assert.match(source, /uniform vec3 wingColor; uniform vec3 tailColor;/);
  assert.match(source, /arcadeEnemyColorIdentityV29/);
  assert.match(source, /arcadeEnemyColorRoleV29/);
});

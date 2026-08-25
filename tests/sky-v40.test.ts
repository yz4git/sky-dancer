import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SKY_DANCER_V40_CLEANUP_ANGLE_TRIGGER,
  SKY_DANCER_V40_CLEANUP_SLOT_DELAY,
  SKY_DANCER_V40_CLEANUP_TARGET,
  SKY_DANCER_V40_CLEANUP_TRIGGER,
  SKY_DANCER_V40_LOCK_HALF_ANGLE,
  SKY_DANCER_V40_LOCK_RANGE,
  SKY_DANCER_V40_REENGAGE_ANGLE_TRIGGER,
  SKY_DANCER_V40_REENGAGE_TARGET,
  SKY_DANCER_V40_REENGAGE_TRIGGER,
  skyDancerReengagementClosingSpeedV40,
} from "../src/sky/SkyDancerReengagementV40";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("V40 re-engagement envelope stays inside the 58m missile lock range", () => {
  assert.equal(SKY_DANCER_V40_LOCK_RANGE, 58);
  assert.equal(SKY_DANCER_V40_LOCK_HALF_ANGLE, 0.78);
  assert.ok(SKY_DANCER_V40_REENGAGE_TRIGGER < SKY_DANCER_V40_LOCK_RANGE);
  assert.ok(SKY_DANCER_V40_CLEANUP_TRIGGER < SKY_DANCER_V40_REENGAGE_TRIGGER);
  assert.ok(SKY_DANCER_V40_REENGAGE_TARGET < SKY_DANCER_V40_REENGAGE_TRIGGER);
  assert.ok(SKY_DANCER_V40_CLEANUP_TARGET < SKY_DANCER_V40_CLEANUP_TRIGGER);
  assert.ok(SKY_DANCER_V40_REENGAGE_ANGLE_TRIGGER > SKY_DANCER_V40_LOCK_HALF_ANGLE);
  assert.ok(SKY_DANCER_V40_CLEANUP_ANGLE_TRIGGER < SKY_DANCER_V40_LOCK_HALF_ANGLE);
  assert.ok(SKY_DANCER_V40_CLEANUP_SLOT_DELAY >= 4 && SKY_DANCER_V40_CLEANUP_SLOT_DELAY <= 4.5);
  assert.ok(skyDancerReengagementClosingSpeedV40(80, true) > 31.5);
  assert.ok(skyDancerReengagementClosingSpeedV40(100, true) <= 60);
});

test("V40 re-engagement corrects both range and lock-cone geometry", () => {
  const source = read("../src/sky/SkyDancerReengagementV40.ts");
  assert.match(source, /skyDancerReengagementInterceptV40/);
  assert.match(source, /lockAngle > angleTrigger/);
  assert.match(source, /cleanupElapsed >= order \* SKY_DANCER_V40_CLEANUP_SLOT_DELAY/);
  assert.match(source, /lockConeCandidates/);
  assert.match(source, /cartTurboHuntNearestCoordinate/);
  assert.match(source, /playerHeading/);
});

test("V40 re-engagement is installed outermost in both WebGL and Canvas runtimes", () => {
  const webgl = read("../src/sky/SkyDancerAirCombatFx.ts");
  const canvas = read("../src/sky/SkyDancerCanvasPreviewV4.ts");
  assert.match(webgl, /installSkyDancerBossCombatV34\(\);\n    installSkyDancerReengagementV40\(\);/);
  assert.match(canvas, /installSkyDancerBossCombatV34\(\);\n    installSkyDancerReengagementV40\(\);/);
  const source = read("../src/sky/SkyDancerReengagementV40.ts");
  assert.match(source, /phase === "cleanup"/);
  assert.match(source, /enemy\.kind !== "boss"/);
  assert.match(source, /__skyDancerGetReengagementV40/);
});

test("V40 presents one explicit STAGE WAVE CLEANUP BOSS CLEAR hierarchy", () => {
  const hud = read("../app/SkyDancerHudV40.tsx");
  const game = read("../app/CartRogueGamePhase13.tsx");
  assert.match(game, /<SkyDancerHudV39 \/>\n        <SkyDancerHudV40 \/>/);
  for (const label of ["STAGE 1", "WAVE", "CLEANUP", "BOSS", "CLEAR", "STAGE ${stage.stage}"]) {
    assert.match(hud, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(hud, /skyDancerV40StageHudActive/);
  assert.match(hud, /visibility: hidden !important/);
  assert.match(hud, /skyDancerV40BossActive \.skyDancerBossV34/);
  assert.match(hud, /skyDancerV40BossActive .*huntStyles\.boss/);
});

test("V40 cuts the central gunsight by roughly 45 percent", () => {
  const oldHud = read("../app/SkyDancerHudQualityPass.tsx");
  const hud = read("../app/SkyDancerHudV40.tsx");
  assert.match(oldHud, /\.skyDancerGunsight \{[\s\S]*?width: 72px;[\s\S]*?height: 72px;/);
  assert.match(hud, /\.skyDancerGunsight \{[\s\S]*?width: 40px !important;[\s\S]*?height: 40px !important;/);
  assert.ok(40 / 72 >= 0.5 && 40 / 72 <= 0.6);
});

test("V40 fills three additional skyline directions after the V36 primary city", () => {
  const city = read("../src/sky/presentation/SkyDancerV40CityExpansionPass.ts");
  const pipeline = read("../src/sky/presentation/SkyDancerPresentationPipeline.ts");
  assert.match(city, /sky-dancer-v40-multi-direction-city/);
  assert.match(city, /x: -300, z: 58/);
  assert.match(city, /x: 286, z: -255/);
  assert.match(city, /x: -252, z: -292/);
  assert.match(city, /skyDancerV40MultiDirectionCity = true/);
  assert.match(pipeline, /SkyDancerV40CityExpansionPass/);
  assert.match(pipeline, /this\.v38\.update\(snapshot\);\n    this\.v40\.update\(snapshot\);/);
});
